from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..database import get_db
from ..models import Order, Client, DispatchRecord, Batch
from ..schemas import OrderCreate, OrderResponse, PaymentUpdateRequest
from ..logging_utils import log_activity
from ..auth import get_current_user

router = APIRouter(prefix="/orders", tags=["orders"], dependencies=[Depends(get_current_user)])


def generate_order_code(db: Session) -> str:
    year = date.today().year
    count = db.query(func.count(Order.id)).filter(
        Order.order_code.like(f"ORD-{year}-%")
    ).scalar() or 0
    return f"ORD-{year}-{str(count + 1).zfill(3)}"


def build_order_response(order: Order, db: Session) -> OrderResponse:
    dispatched = order.dispatched_quantity or 0
    return OrderResponse(
        id=order.id,
        order_code=order.order_code,
        client_id=order.client_id,
        client_name=order.client.name if order.client else None,
        product_name=order.product_name,
        grade=order.grade,
        quantity_required=order.quantity_required,
        dispatched_quantity=dispatched,
        remaining_quantity=order.quantity_required - dispatched,
        price_per_bag=order.price_per_bag,
        total_amount=order.total_amount,
        order_date=order.order_date,
        status=order.status,
        payment_status=order.payment_status,
        notes=order.notes,
        created_at=order.created_at,
    )


@router.post("", response_model=OrderResponse, status_code=201)
def create_order(order_in: OrderCreate, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.id == order_in.client_id).first()
    if not client:
        raise HTTPException(
            status_code=404,
            detail=f"Client with ID {order_in.client_id} not found"
        )

    order_code = generate_order_code(db)

    # Use Decimal arithmetic to avoid IEEE-754 float precision loss on money
    total_amount = (
        Decimal(str(order_in.price_per_bag)) * order_in.quantity_required
    ).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    order = Order(
        order_code=order_code,
        client_id=order_in.client_id,
        product_name=order_in.product_name,
        grade=order_in.grade,
        quantity_required=order_in.quantity_required,
        price_per_bag=order_in.price_per_bag,
        total_amount=total_amount,
        order_date=order_in.order_date,
        notes=order_in.notes,
    )
    db.add(order)

    # Add to outstanding immediately — payment_status defaults to "unpaid"
    client.outstanding_balance = (client.outstanding_balance or Decimal("0")) + total_amount

    db.commit()
    db.refresh(order)

    log_activity(
        action_type="CREATE_ORDER",
        entity_type="order",
        entity_id=order.id,
        description=(
            f"Order {order.order_code} created for {client.name} — "
            f"{order.quantity_required} bags at ₹{order.price_per_bag}/bag "
            f"(total ₹{order.total_amount})"
        ),
        metadata={
            "order_code": order.order_code,
            "client_id": order.client_id,
            "quantity_required": order.quantity_required,
            "price_per_bag": float(order.price_per_bag),
            "total_amount": float(order.total_amount),
        },
    )
    return build_order_response(order, db)


@router.get("", response_model=List[OrderResponse])
def list_orders(db: Session = Depends(get_db)):
    orders = db.query(Order).order_by(Order.created_at.desc()).all()
    return [build_order_response(o, db) for o in orders]


@router.get("/{order_id}", response_model=OrderResponse)
def get_order(order_id: int, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail=f"Order with ID {order_id} not found")
    return build_order_response(order, db)


@router.patch("/{order_id}/payment", response_model=OrderResponse)
def update_payment(order_id: int, payload: PaymentUpdateRequest, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail=f"Order with ID {order_id} not found")

    if order.status == "cancelled":
        raise HTTPException(status_code=400, detail="Cannot update payment for a cancelled order")

    old_payment_status = order.payment_status
    new_payment_status = payload.payment_status

    if old_payment_status == new_payment_status:
        return build_order_response(order, db)

    client = db.query(Client).filter(Client.id == order.client_id).first()
    # Keep as Decimal — never cast to float for monetary arithmetic
    order_total: Decimal = order.total_amount
    current_balance: Decimal = client.outstanding_balance or Decimal("0")

    try:
        if new_payment_status == "paid" and old_payment_status == "unpaid":
            # Remove order amount from outstanding; floor at 0 as a safety net
            client.outstanding_balance = max(Decimal("0"), current_balance - order_total)
        elif new_payment_status == "unpaid" and old_payment_status == "paid":
            # Add order amount back to outstanding
            client.outstanding_balance = current_balance + order_total

        order.payment_status = new_payment_status
        db.commit()
        db.refresh(order)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update payment status: {str(e)}")

    log_activity(
        action_type="PAYMENT_UPDATE",
        entity_type="order",
        entity_id=order.id,
        description=(
            f"Order {order.order_code} marked as {new_payment_status} "
            f"(₹{float(order_total):,.2f}) for {client.name}"
        ),
        metadata={
            "order_code": order.order_code,
            "old_status": old_payment_status,
            "new_status": new_payment_status,
            "amount": float(order_total),
        },
    )
    return build_order_response(order, db)


@router.patch("/{order_id}/cancel", response_model=OrderResponse)
def cancel_order(order_id: int, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail=f"Order with ID {order_id} not found")

    if order.status == "cancelled":
        raise HTTPException(status_code=400, detail="Order is already cancelled")

    if order.status == "fully_dispatched":
        raise HTTPException(
            status_code=400,
            detail="Cannot cancel a fully dispatched order. If needed, contact support."
        )

    try:
        dispatch_records = (
            db.query(DispatchRecord).filter(DispatchRecord.order_id == order_id).all()
        )

        # Lock all affected batch rows upfront before modifying any of them.
        # Without this, a concurrent dispatch on the same batches could race and
        # produce incorrect remaining_quantity values.
        if dispatch_records:
            batch_ids = [r.batch_id for r in dispatch_records]
            locked_batches = (
                db.query(Batch)
                .filter(Batch.id.in_(batch_ids))
                .with_for_update()
                .all()
            )
            batch_map = {b.id: b for b in locked_batches}
        else:
            batch_map = {}

        reverted_qty = 0
        for record in dispatch_records:
            batch = batch_map.get(record.batch_id)
            if batch:
                batch.remaining_quantity += record.quantity_dispatched
                reverted_qty += record.quantity_dispatched
            db.delete(record)

        # Revert outstanding balance if unpaid (remove the full order amount)
        if order.payment_status == "unpaid":
            client = db.query(Client).filter(Client.id == order.client_id).first()
            if client:
                current_balance: Decimal = client.outstanding_balance or Decimal("0")
                order_total: Decimal = order.total_amount
                client.outstanding_balance = max(Decimal("0"), current_balance - order_total)

        order.status = "cancelled"
        db.commit()
        db.refresh(order)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to cancel order: {str(e)}")

    log_activity(
        action_type="CANCEL_ORDER",
        entity_type="order",
        entity_id=order.id,
        description=(
            f"Order {order.order_code} cancelled"
            + (f" — {reverted_qty} bags returned to stock" if reverted_qty > 0 else "")
        ),
        metadata={
            "order_code": order.order_code,
            "reverted_quantity": reverted_qty,
            "payment_status": order.payment_status,
        },
    )
    return build_order_response(order, db)
