import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError

from .database import Base, engine, run_migrations
from .routers import batches, clients, orders, dispatch, logs, auth

logger = logging.getLogger("saltflow")

# Create tables and run column migrations on startup
Base.metadata.create_all(bind=engine)
run_migrations()

app = FastAPI(
    title="SaltFlow API",
    description="Inventory and Dispatch System for Salt Trading Business",
    version="1.0.0",
)

# CORS middleware - allow all origins for local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api")
app.include_router(batches.router, prefix="/api")
app.include_router(clients.router, prefix="/api")
app.include_router(orders.router, prefix="/api")
app.include_router(dispatch.router, prefix="/api")
app.include_router(logs.router, prefix="/api")


@app.get("/", tags=["health"])
@app.get("/api/health", tags=["health"])
def health_check():
    return {"status": "ok", "service": "SaltFlow API", "version": "1.0.0"}


@app.exception_handler(IntegrityError)
async def integrity_error_handler(request: Request, exc: IntegrityError):
    # Catches duplicate-key or FK violations that slip past router-level guards
    logger.error("DB IntegrityError %s %s: %s", request.method, request.url, exc.orig)
    return JSONResponse(
        status_code=400,
        content={"detail": "Database constraint violated — possible duplicate entry or invalid reference."},
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    # Log full traceback so issues are visible in server output
    logger.exception("Unhandled error %s %s", request.method, request.url)
    return JSONResponse(
        status_code=500,
        content={
            "detail": "An unexpected error occurred. Please try again or contact support."
        },
    )
