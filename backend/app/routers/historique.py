from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.historique import HistoriqueMouvement
from app.models.user import User, UserRole
from app.utils.auth import get_current_user, require_roles

router = APIRouter(prefix="/historique", tags=["Journal d'audit"])


@router.get("")
def list_historique(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.GESTIONNAIRE))],
    entity_type: str | None = Query(None),
    limit: int = Query(100, ge=1, le=500),
):
    query = db.query(HistoriqueMouvement).order_by(HistoriqueMouvement.created_at.desc())
    if entity_type:
        query = query.filter(HistoriqueMouvement.entity_type == entity_type)
    entries = query.limit(limit).all()

    user_ids = {e.user_id for e in entries if e.user_id}
    users = {}
    if user_ids:
        for u in db.query(User).filter(User.id.in_(user_ids)).all():
            users[u.id] = f"{u.prenom} {u.nom}"

    return [
        {
            "id": e.id,
            "entity_type": e.entity_type.value,
            "entity_id": e.entity_id,
            "action": e.action.value,
            "description": e.description,
            "user_name": users.get(e.user_id, "Systeme"),
            "created_at": e.created_at,
        }
        for e in entries
    ]
