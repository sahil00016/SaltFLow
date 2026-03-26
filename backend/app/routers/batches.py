from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..database import get_db
from ..models import Batch, DispatchRecord
from ..schemas import BatchCreate, BatchResponse, StockAdjustRequest
from ..logging_utils import log_activity
from ..auth import get_current_user

router = APIRouter(prefix="/batches", tags=["batches"], dependencies=[Depends(get_current_user)])


def generate_batch_code(db: Session) -> str:
    year = date.today().year
    count = db.query(func.count(Batch.id)).filter(
        Batch.batch_code.like(f"B-{year}-%")
    ).scalar() or 0
    return f"B-{year}-{str(count + 1).zfill(3)}"


@router.post("", response_model=BatchResponse, status_code=201)
def create_batch(batch_in: BatchCreate, db: Session = Depends(get_db)):
    batch_code = batch_in.batch_code
    if not batch_code or not batch_code.strip():
        batch_code = generate_batch_code(db)
    else:
        batch_code = batch_code.strip()
        existing = db.query(Batch).filter(Batch.batch_code == batch_code).first()
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"Batch code '{batch_code}' already exists. Please use a different code."
            )

    batch = Batch(
        batch_code=batch_code,
        product_name=batch_in.product_name,
        grade=batch_in.grade,
        arrival_date=batch_in.arrival_date,
        total_quantity=batch_in.total_quantity,
        remaining_quantity=batch_in.total_quantity,
        warehouse_location=batch_in.warehouse_location,
    )
    db.add(batch)
    db.commit()
    db.refresh(batch)

    log_activity(
        action_type="CREATE_BATCH",
        entity_type="batch",
        entity_id=batch.id,
        description=(
            f"New batch {batch.batch_code} created — {batch.total_quantity} bags of "
            f"{batch.product_name} ({batch.grade}) arrived on {batch.arrival_date}"
            + (f", stored at {batch.warehouse_location}" if batch.warehouse_location else "")
        ),
        metadata={"batch_code": batch.batch_code, "total_quantity": batch.total_quantity},
    )
    return batch


@router.get("", response_model=List[BatchResponse])
def list_batches(
    include_empty: bool = Query(default=False, description="Include batches with zero remaining stock"),
    db: Session = Depends(get_db),
):
    query = db.query(Batch)
    if not include_empty:
        query = query.filter(Batch.remaining_quantity > 0)
    batches = query.order_by(Batch.arrival_date.asc()).all()
    return batches


@router.get("/{batch_id}", response_model=BatchResponse)
def get_batch(batch_id: int, db: Session = Depends(get_db)):
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail=f"Batch with ID {batch_id} not found")
    return batch


@router.delete("/{batch_id}", status_code=200)
def delete_batch(batch_id: int, db: Session = Depends(get_db)):
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail=f"Batch with ID {batch_id} not found")
    if batch.remaining_quantity > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete batch with remaining stock. Batch '{batch.batch_code}' still has {batch.remaining_quantity} bags."
        )

    # A fully-dispatched batch (remaining=0) still has DispatchRecord rows pointing to it.
    # Attempting db.delete() without this check raises an IntegrityError (FK violation)
    # which would surface as a generic 500 via the global exception handler.
    has_dispatch_history = (
        db.query(DispatchRecord).filter(DispatchRecord.batch_id == batch_id).first()
    )
    if has_dispatch_history:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Cannot delete batch '{batch.batch_code}' — it has dispatch history. "
                f"Batches with past dispatches are kept for audit purposes."
            ),
        )

    batch_code = batch.batch_code
    batch_id_saved = batch.id
    db.delete(batch)
    db.commit()

    log_activity(
        action_type="DELETE_BATCH",
        entity_type="batch",
        entity_id=batch_id_saved,
        description=f"Batch {batch_code} deleted (was fully empty)",
        metadata={"batch_code": batch_code},
    )
    return {"message": f"Batch '{batch_code}' deleted successfully"}


@router.post("/{batch_id}/adjust-stock", response_model=BatchResponse)
def adjust_stock(batch_id: int, payload: StockAdjustRequest, db: Session = Depends(get_db)):
    # Lock the row to prevent concurrent adjustments
    batch = (
        db.query(Batch)
        .filter(Batch.id == batch_id)
        .with_for_update()
        .first()
    )
    if not batch:
        raise HTTPException(status_code=404, detail=f"Batch with ID {batch_id} not found")

    old_quantity = batch.remaining_quantity

    if payload.new_quantity is not None:
        new_quantity = payload.new_quantity
    else:
        new_quantity = old_quantity + payload.adjustment_amount

    if new_quantity < 0:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Adjustment would result in negative stock "
                f"({old_quantity} + ({payload.adjustment_amount}) = {new_quantity}). "
                f"Cannot go below 0 bags."
            ),
        )

    if new_quantity > batch.total_quantity:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Adjusted quantity ({new_quantity}) cannot exceed the original batch total "
                f"({batch.total_quantity} bags). Create a new batch for additional stock."
            ),
        )

    try:
        batch.remaining_quantity = new_quantity
        db.commit()
        db.refresh(batch)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Stock adjustment failed: {str(e)}")

    change = new_quantity - old_quantity
    direction = f"+{change}" if change >= 0 else str(change)
    log_activity(
        action_type="STOCK_ADJUST",
        entity_type="batch",
        entity_id=batch_id,
        description=(
            f"Stock corrected for batch {batch.batch_code}: "
            f"{old_quantity} → {new_quantity} bags ({direction}). "
            f"Reason: {payload.reason}"
        ),
        metadata={
            "batch_code": batch.batch_code,
            "old_quantity": old_quantity,
            "new_quantity": new_quantity,
            "change": change,
            "reason": payload.reason,
        },
    )
    return batch
