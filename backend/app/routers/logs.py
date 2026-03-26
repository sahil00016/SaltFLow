from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import ActivityLog
from ..schemas import ActivityLogResponse
from ..auth import get_current_user

router = APIRouter(prefix="/logs", tags=["logs"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=List[ActivityLogResponse])
def get_logs(
    limit: int = Query(default=50, ge=1, le=500, description="Number of recent logs to return"),
    entity_type: Optional[str] = Query(default=None, description="Filter by entity type: batch, order, client"),
    action_type: Optional[str] = Query(default=None, description="Filter by action type: DISPATCH, CREATE_ORDER, etc."),
    db: Session = Depends(get_db),
):
    query = db.query(ActivityLog)
    if entity_type:
        query = query.filter(ActivityLog.entity_type == entity_type)
    if action_type:
        query = query.filter(ActivityLog.action_type == action_type)
    logs = query.order_by(ActivityLog.timestamp.desc()).limit(limit).all()
    return logs
