from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Order, Batch, DispatchRecord
from ..schemas import DispatchRequest, DispatchResponse, AllocationDetail
from ..logging_utils import log_activity
from ..auth import get_current_user

router = APIRouter(prefix="/dispatch", tags=["dispatch"], dependencies=[Depends(get_current_user)])


@router.post("", response_model=DispatchResponse)
def dispatch_order(payload: DispatchRequest, db: Session = Depends(get_db)):
    order_id = payload.order_id

    try:
        # 1. Lock the order row first — prevents concurrent dispatch on the same order.
        #    Without this lock, two simultaneous requests both read dispatched_quantity=0,
        #    both allocate the full remaining amount, and one commit silently overwrites
        #    the other → stock deducted twice but dispatched_quantity only reflects one run.
        order = (
            db.query(Order)
            .filter(Order.id == order_id)
            .with_for_update()
            .first()
        )
        if not order:
            raise HTTPException(status_code=404, detail=f"Order with ID {order_id} not found")

        if order.status in ("fully_dispatched", "cancelled"):
            raise HTTPException(
                status_code=400,
                detail=f"Order '{order.order_code}' cannot be dispatched — status is '{order.status}'."
            )

        # 2. Use stored dispatched_quantity — no sum query needed
        already_dispatched = order.dispatched_quantity or 0

        # 3. Remaining to dispatch
        remaining_to_dispatch = order.quantity_required - already_dispatched

        if remaining_to_dispatch <= 0:
            raise HTTPException(
                status_code=400,
                detail=f"Order '{order.order_code}' is already fully dispatched."
            )

        # 4. Lock batches with SELECT FOR UPDATE (FIFO — oldest first)
        available_batches = (
            db.query(Batch)
            .filter(Batch.remaining_quantity > 0)
            .order_by(Batch.arrival_date.asc())
            .with_for_update()
            .all()
        )

        # 5. Calculate total available stock
        total_available = sum(b.remaining_quantity for b in available_batches)

        if total_available < remaining_to_dispatch:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Not enough stock available. "
                    f"Required: {remaining_to_dispatch} bags, "
                    f"Available: {total_available} bags."
                )
            )

        # 6. Greedy allocation from oldest batch first
        allocations = []
        still_needed = remaining_to_dispatch

        for batch in available_batches:
            if still_needed <= 0:
                break

            allocate = min(batch.remaining_quantity, still_needed)

            dispatch_record = DispatchRecord(
                order_id=order_id,
                batch_id=batch.id,
                quantity_dispatched=allocate,
            )
            db.add(dispatch_record)

            batch.remaining_quantity -= allocate
            still_needed -= allocate

            allocations.append(AllocationDetail(
                batch_code=batch.batch_code,
                quantity=allocate,
            ))

        # 7. Update order dispatched_quantity and status atomically
        total_dispatched_now = already_dispatched + remaining_to_dispatch
        order.dispatched_quantity = total_dispatched_now
        if total_dispatched_now >= order.quantity_required:
            order.status = "fully_dispatched"
        else:
            order.status = "partially_dispatched"

        db.commit()

        allocation_summary = ", ".join(
            f"{a.batch_code} ({a.quantity} bags)" for a in allocations
        )
        log_activity(
            action_type="DISPATCH",
            entity_type="order",
            entity_id=order_id,
            description=(
                f"Dispatched {remaining_to_dispatch} bags for order {order.order_code} "
                f"from: {allocation_summary}"
            ),
            metadata={
                "order_code": order.order_code,
                "total_dispatched": remaining_to_dispatch,
                "allocations": [{"batch_code": a.batch_code, "quantity": a.quantity} for a in allocations],
            },
        )

        return DispatchResponse(
            order_id=order_id,
            total_dispatched=remaining_to_dispatch,
            allocations=allocations,
        )

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Dispatch failed due to an unexpected error: {str(e)}"
        )
