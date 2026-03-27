import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

# Render gives postgres:// but SQLAlchemy requires postgresql://
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://saltflow:radhey12345@localhost:5432/saltflow")
DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(
    DATABASE_URL,
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def run_migrations():
    """Add new columns to existing tables without dropping data."""
    from sqlalchemy import text
    with engine.connect() as conn:
        conn.execute(text(
            "ALTER TABLE orders ADD COLUMN IF NOT EXISTS product_name VARCHAR(100)"
        ))
        conn.execute(text(
            "ALTER TABLE orders ADD COLUMN IF NOT EXISTS grade VARCHAR(50)"
        ))
        conn.commit()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
