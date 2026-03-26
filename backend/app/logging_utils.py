"""
Activity logging helper.

Uses its own independent DB session so that a logging failure
can NEVER roll back or break the caller's transaction.
"""

from typing import Optional
from .database import SessionLocal
from .models import ActivityLog


def log_activity(
    action_type: str,
    entity_type: str,
    description: str,
    entity_id: Optional[int] = None,
    metadata: Optional[dict] = None,
) -> None:
    """
    Write one activity log entry in a separate session.
    Silently swallows all errors — logging must never affect business logic.
    """
    db = SessionLocal()
    try:
        entry = ActivityLog(
            action_type=action_type,
            entity_type=entity_type,
            entity_id=entity_id,
            description=description,
            meta=metadata,
        )
        db.add(entry)
        db.commit()
    except Exception:
        db.rollback()
        # Intentionally silent — a failed log must not surface to the user
    finally:
        db.close()
