import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from ..auth import create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest):
    expected_username = os.getenv("ADMIN_USERNAME", "admin")
    expected_password = os.getenv("ADMIN_PASSWORD", "saltflow")

    if payload.username != expected_username or payload.password != expected_password:
        raise HTTPException(status_code=401, detail="Incorrect username or password")

    token = create_access_token(payload.username)
    return LoginResponse(access_token=token)
