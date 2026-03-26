from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, field_validator, model_validator


# --------------- Batch Schemas ---------------

class BatchCreate(BaseModel):
    product_name: str
    grade: str
    arrival_date: date
    total_quantity: int
    warehouse_location: Optional[str] = None
    batch_code: Optional[str] = None

    @field_validator("product_name")
    @classmethod
    def product_name_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Product name must not be empty")
        return v.strip()

    @field_validator("grade")
    @classmethod
    def grade_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Grade must not be empty")
        return v.strip()

    @field_validator("total_quantity")
    @classmethod
    def quantity_positive(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("Total quantity must be greater than 0")
        return v


class BatchResponse(BaseModel):
    id: int
    batch_code: str
    product_name: str
    grade: str
    arrival_date: date
    total_quantity: int
    remaining_quantity: int
    warehouse_location: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class StockAdjustRequest(BaseModel):
    new_quantity: Optional[int] = None       # set remaining to this exact value
    adjustment_amount: Optional[int] = None  # add (positive) or subtract (negative)
    reason: str

    @field_validator("reason")
    @classmethod
    def reason_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Reason is required for stock adjustments")
        return v.strip()

    @field_validator("new_quantity")
    @classmethod
    def new_quantity_non_negative(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v < 0:
            raise ValueError("New quantity cannot be negative")
        return v

    @model_validator(mode="after")
    def exactly_one_mode(self) -> "StockAdjustRequest":
        has_new = self.new_quantity is not None
        has_adj = self.adjustment_amount is not None
        if not has_new and not has_adj:
            raise ValueError("Provide either 'new_quantity' or 'adjustment_amount'")
        if has_new and has_adj:
            raise ValueError("Provide only one of 'new_quantity' or 'adjustment_amount', not both")
        return self


# --------------- Client Schemas ---------------

class ClientCreate(BaseModel):
    name: str
    phone: str
    address: Optional[str] = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Client name must not be empty")
        return v.strip()

    @field_validator("phone")
    @classmethod
    def phone_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Phone number must not be empty")
        return v.strip()


class ClientResponse(BaseModel):
    id: int
    name: str
    phone: str
    address: Optional[str] = None
    outstanding_balance: Decimal
    created_at: datetime

    model_config = {"from_attributes": True}


# --------------- Order Schemas ---------------

class OrderCreate(BaseModel):
    client_id: int
    quantity_required: int
    price_per_bag: float
    order_date: date
    notes: Optional[str] = None

    @field_validator("quantity_required")
    @classmethod
    def quantity_positive(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("Quantity required must be greater than 0")
        return v

    @field_validator("price_per_bag")
    @classmethod
    def price_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Price per bag must be greater than 0")
        return v


class OrderResponse(BaseModel):
    id: int
    order_code: Optional[str] = None
    client_id: int
    client_name: Optional[str] = None
    quantity_required: int
    dispatched_quantity: int = 0
    remaining_quantity: int = 0
    price_per_bag: Decimal
    total_amount: Decimal
    order_date: date
    status: str
    payment_status: str
    notes: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": False}


class PaymentUpdateRequest(BaseModel):
    payment_status: str

    @field_validator("payment_status")
    @classmethod
    def valid_status(cls, v: str) -> str:
        if v not in ("paid", "unpaid"):
            raise ValueError("Payment status must be 'paid' or 'unpaid'")
        return v


# --------------- Dispatch Schemas ---------------

class DispatchRequest(BaseModel):
    order_id: int


class AllocationDetail(BaseModel):
    batch_code: str
    quantity: int


class DispatchResponse(BaseModel):
    order_id: int
    total_dispatched: int
    allocations: List[AllocationDetail]


# --------------- Outstanding Schemas ---------------

class UnpaidOrderSummary(BaseModel):
    id: int
    order_code: Optional[str] = None
    order_date: date
    quantity_required: int
    price_per_bag: Decimal
    total_amount: Decimal
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class OutstandingResponse(BaseModel):
    client_id: int
    client_name: str
    phone: str
    outstanding_balance: Decimal
    unpaid_orders: List[UnpaidOrderSummary]


# --------------- Client Ledger Schemas ---------------

class DispatchDetail(BaseModel):
    id: int
    batch_code: str
    product_name: str
    grade: str
    quantity_dispatched: int
    dispatched_at: datetime

    model_config = {"from_attributes": True}


class OrderWithDispatches(BaseModel):
    id: int
    order_code: Optional[str] = None
    order_date: date
    quantity_required: int
    dispatched_quantity: int
    price_per_bag: Decimal
    total_amount: Decimal
    status: str
    payment_status: str
    notes: Optional[str] = None
    created_at: datetime
    dispatch_records: List[DispatchDetail]

    model_config = {"from_attributes": False}


class ClientLedgerResponse(BaseModel):
    client_id: int
    client_name: str
    phone: str
    address: Optional[str] = None
    outstanding_balance: Decimal
    client_since: datetime
    total_orders: int
    total_value: Decimal
    total_paid: Decimal

    orders: List[OrderWithDispatches]


# --------------- Activity Log Schemas ---------------

class ActivityLogResponse(BaseModel):
    id: int
    action_type: str
    entity_type: str
    entity_id: Optional[int] = None
    description: str
    meta: Optional[dict] = None
    timestamp: datetime

    model_config = {"from_attributes": True}
