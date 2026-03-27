from sqlalchemy import (
    Column, Integer, String, Text, Date, DateTime, Numeric,
    ForeignKey, CheckConstraint, func
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from .database import Base


class Batch(Base):
    __tablename__ = "batches"

    id = Column(Integer, primary_key=True, autoincrement=True)
    batch_code = Column(String(50), unique=True, nullable=False)
    product_name = Column(String(100), nullable=False)
    grade = Column(String(50), nullable=False)
    arrival_date = Column(Date, nullable=False)
    total_quantity = Column(Integer, nullable=False)
    remaining_quantity = Column(Integer, nullable=False)
    warehouse_location = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=func.now(), nullable=False)

    __table_args__ = (
        CheckConstraint("remaining_quantity >= 0", name="check_remaining_non_negative"),
        CheckConstraint("remaining_quantity <= total_quantity", name="check_remaining_lte_total"),
    )

    dispatch_records = relationship("DispatchRecord", back_populates="batch")


class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    phone = Column(String(20), unique=True, nullable=False)
    address = Column(Text, nullable=True)
    outstanding_balance = Column(Numeric(12, 2), default=0)
    created_at = Column(DateTime, default=func.now(), nullable=False)

    orders = relationship("Order", back_populates="client")


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, autoincrement=True)
    order_code = Column(String(50), unique=True, nullable=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    quantity_required = Column(Integer, nullable=False)
    dispatched_quantity = Column(Integer, nullable=False, default=0)
    price_per_bag = Column(Numeric(10, 2), nullable=False)
    total_amount = Column(Numeric(12, 2), nullable=False)
    product_name = Column(String(100), nullable=True)   # which product this order is for
    grade = Column(String(50), nullable=True)
    order_date = Column(Date, nullable=False)
    # status: pending | partially_dispatched | fully_dispatched | cancelled
    status = Column(String(25), default="pending", nullable=False)
    payment_status = Column(String(20), default="unpaid", nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=func.now(), nullable=False)

    client = relationship("Client", back_populates="orders")
    dispatch_records = relationship("DispatchRecord", back_populates="order")


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    action_type = Column(String(50), nullable=False)   # e.g. CREATE_ORDER
    entity_type = Column(String(30), nullable=False)   # batch | order | client
    entity_id = Column(Integer, nullable=True)
    description = Column(Text, nullable=False)         # human-readable sentence
    meta = Column(JSONB, nullable=True)                # optional structured data
    timestamp = Column(DateTime, default=func.now(), nullable=False)


class DispatchRecord(Base):
    __tablename__ = "dispatch_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    batch_id = Column(Integer, ForeignKey("batches.id"), nullable=False)
    quantity_dispatched = Column(Integer, nullable=False)
    dispatched_at = Column(DateTime, default=func.now(), nullable=False)

    order = relationship("Order", back_populates="dispatch_records")
    batch = relationship("Batch", back_populates="dispatch_records")
