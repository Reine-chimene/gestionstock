from datetime import datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.historique import ActionHistorique, TypeEntite
from app.models.maintenance import MaintenancePlanifiee, StatutMaintenance
from app.models.materiel import EtatMateriel, Materiel
from app.models.user import User, UserRole
from app.services.email_service import send_maintenance_alert
from app.services.storage_service import log_historique
from app.utils.auth import get_current_user, require_roles

router = APIRouter(prefix="/maintenance", tags=["Maintenance"])


class MaintenanceCreate(BaseModel):
    materiel_id: int
    type_maintenance: str = Field(..., min_length=2)
    description: str | None = None
    date_prevue: datetime
    rappel_jours: int = 7


class MaintenanceUpdate(BaseModel):
    type_maintenance: str | None = None
    description: str | None = None
    date_prevue: datetime | None = None
    date_fin: datetime | None = None
    statut: str | None = None
    rappel_jours: int | None = None


@router.get("")
def list_maintenance(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    items = (
        db.query(MaintenancePlanifiee)
        .options(joinedload(MaintenancePlanifiee.materiel))
        .order_by(MaintenancePlanifiee.date_prevue)
        .all()
    )
    return [
        {
            "id": m.id,
            "materiel_id": m.materiel_id,
            "materiel_designation": m.materiel.designation if m.materiel else None,
            "matricule": m.materiel.matricule if m.materiel else None,
            "type_maintenance": m.type_maintenance,
            "description": m.description,
            "date_prevue": m.date_prevue,
            "date_fin": m.date_fin,
            "statut": m.statut.value,
            "rappel_jours": m.rappel_jours,
            "alerte_envoyee": m.alerte_envoyee,
        }
        for m in items
    ]


@router.post("", status_code=201)
async def create_maintenance(
    data: MaintenanceCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.GESTIONNAIRE))],
):
    materiel = db.query(Materiel).filter(Materiel.id == data.materiel_id).first()
    if not materiel:
        raise HTTPException(404, "Materiel introuvable")

    m = MaintenancePlanifiee(**data.model_dump(), created_by=current_user.id)
    materiel.etat = EtatMateriel.EN_MAINTENANCE
    db.add(m)
    log_historique(db, TypeEntite.MAINTENANCE, 0, ActionHistorique.CREATION,
                   f"Maintenance planifiee : {data.type_maintenance} pour {materiel.matricule}", current_user.id)
    db.commit()
    db.refresh(m)
    return {"id": m.id, "message": "Maintenance planifiee"}


@router.patch("/{maintenance_id}")
def update_maintenance(
    maintenance_id: int,
    data: MaintenanceUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.GESTIONNAIRE))],
):
    m = db.query(MaintenancePlanifiee).filter(MaintenancePlanifiee.id == maintenance_id).first()
    if not m:
        raise HTTPException(404, "Maintenance introuvable")
    update = data.model_dump(exclude_unset=True)
    if "statut" in update:
        update["statut"] = StatutMaintenance(update["statut"])
    for k, v in update.items():
        setattr(m, k, v)
    if m.statut == StatutMaintenance.TERMINEE:
        materiel = db.query(Materiel).filter(Materiel.id == m.materiel_id).first()
        if materiel:
            materiel.etat = EtatMateriel.DISPONIBLE
    db.commit()
    return {"message": "Maintenance mise a jour"}


@router.post("/check-alertes")
async def check_alertes(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.GESTIONNAIRE))],
):
    now = datetime.utcnow()
    alertes = (
        db.query(MaintenancePlanifiee)
        .options(joinedload(MaintenancePlanifiee.materiel))
        .filter(
            MaintenancePlanifiee.statut == StatutMaintenance.PLANIFIEE,
            MaintenancePlanifiee.alerte_envoyee == False,
            MaintenancePlanifiee.date_prevue <= now + timedelta(days=7),
        )
        .all()
    )
    sent = 0
    for m in alertes:
        if m.materiel and current_user.email:
            await send_maintenance_alert(
                current_user.email,
                m.materiel.designation,
                m.materiel.matricule,
                m.type_maintenance,
                m.date_prevue.strftime("%d/%m/%Y"),
            )
            m.alerte_envoyee = True
            sent += 1
    db.commit()
    return {"alertes_envoyees": sent}
