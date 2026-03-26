from decimal import Decimal
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from ..database import get_db
from ..models import Client, Order, DispatchRecord
from ..schemas import (
    ClientCreate, ClientResponse, OutstandingResponse, UnpaidOrderSummary,
    ClientLedgerResponse, OrderWithDispatches, DispatchDetail,
)
from ..auth import get_current_user

router = APIRouter(prefix="/clients", tags=["clients"], dependencies=[Depends(get_current_user)])


@router.post("", response_model=ClientResponse, status_code=201)
def create_client(client_in: ClientCreate, db: Session = Depends(get_db)):
    existing = db.query(Client).filter(Client.phone == client_in.phone).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"A client with phone number '{client_in.phone}' already exists."
        )
    client = Client(
        name=client_in.name,
        phone=client_in.phone,
        address=client_in.address,
    )
    db.add(client)
    db.commit()
    db.refresh(client)
    return client


@router.get("", response_model=List[ClientResponse])
def list_clients(db: Session = Depends(get_db)):
    clients = db.query(Client).order_by(Client.name.asc()).all()
    return clients


@router.get("/{client_id}", response_model=ClientResponse)
def get_client(client_id: int, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail=f"Client with ID {client_id} not found")
    return client


@router.get("/{client_id}/ledger", response_model=ClientLedgerResponse)
def get_client_ledger(client_id: int, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail=f"Client with ID {client_id} not found")

    orders = (
        db.query(Order)
        .options(joinedload(Order.dispatch_records).joinedload(DispatchRecord.batch))
        .filter(Order.client_id == client_id)
        .filter(Order.status != "cancelled")
        .order_by(Order.order_date.desc())
        .all()
    )

    total_value = sum(Decimal(str(o.total_amount)) for o in orders)
    total_paid = sum(Decimal(str(o.total_amount)) for o in orders if o.payment_status == "paid")

    return ClientLedgerResponse(
        client_id=client.id,
        client_name=client.name,
        phone=client.phone,
        address=client.address,
        outstanding_balance=Decimal(str(client.outstanding_balance)),
        client_since=client.created_at,
        total_orders=len(orders),
        total_value=total_value,
        total_paid=total_paid,
        orders=[
            OrderWithDispatches(
                id=o.id,
                order_code=o.order_code,
                order_date=o.order_date,
                quantity_required=o.quantity_required,
                dispatched_quantity=o.dispatched_quantity,
                price_per_bag=Decimal(str(o.price_per_bag)),
                total_amount=Decimal(str(o.total_amount)),
                status=o.status,
                payment_status=o.payment_status,
                notes=o.notes,
                created_at=o.created_at,
                dispatch_records=[
                    DispatchDetail(
                        id=dr.id,
                        batch_code=dr.batch.batch_code,
                        product_name=dr.batch.product_name,
                        grade=dr.batch.grade,
                        quantity_dispatched=dr.quantity_dispatched,
                        dispatched_at=dr.dispatched_at,
                    )
                    for dr in o.dispatch_records
                ],
            )
            for o in orders
        ],
    )


@router.get("/{client_id}/outstanding", response_model=OutstandingResponse)
def get_client_outstanding(client_id: int, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail=f"Client with ID {client_id} not found")

    unpaid_orders = (
        db.query(Order)
        .filter(Order.client_id == client_id, Order.payment_status == "unpaid")
        .filter(Order.status != "cancelled")
        .order_by(Order.created_at.desc())
        .all()
    )

    return OutstandingResponse(
        client_id=client.id,
        client_name=client.name,
        phone=client.phone,
        outstanding_balance=client.outstanding_balance,
        unpaid_orders=[
            UnpaidOrderSummary(
                id=o.id,
                order_code=o.order_code,
                order_date=o.order_date,
                quantity_required=o.quantity_required,
                price_per_bag=o.price_per_bag,
                total_amount=o.total_amount,
                status=o.status,
                created_at=o.created_at,
            )
            for o in unpaid_orders
        ],
    )
