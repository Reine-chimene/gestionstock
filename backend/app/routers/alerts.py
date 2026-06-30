from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, UserRole
from app.services.alert_service import run_manual_alerts
from app.utils.auth import require_roles

router = APIRouter(prefix="/alerts", tags=["Alertes"])


@router.post("/run")
async def trigger_alerts(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.GESTIONNAIRE))],
):
    """Declenche manuellement les alertes maintenance et stock bas."""
    result = await run_manual_alerts(db)
    return {"message": "Alertes traitees", **result}
