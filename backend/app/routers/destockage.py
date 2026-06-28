from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.affectation import Affectation, StatutAffectation
from app.models.destockage import DestockageOperation, TypeDestockage
from app.models.historique import ActionHistorique, TypeEntite
from app.models.maintenance import MaintenancePlanifiee, StatutMaintenance
from app.models.materiel import EtatMateriel, Materiel
from app.models.user import User, UserRole
from app.schemas.destockage import DestockageCreate, DestockageResponse
from app.services.storage_service import log_historique, model_to_dict
from app.utils.auth import get_current_user, require_roles

router = APIRouter(prefix="/destockage", tags=["Destockage"])

MATERIEL_FIELDS = ["id", "designation", "matricule", "etat", "categorie", "numero_serie"]

TYPE_TO_ETAT = {
    TypeDestockage.REFORME: EtatMateriel.REFORME,
    TypeDestockage.VENTE: EtatMateriel.REFORME,
    TypeDestockage.DON: EtatMateriel.REFORME,
    TypeDestockage.CASSE: EtatMateriel.HORS_SERVICE,
    TypeDestockage.PERTE: EtatMateriel.HORS_SERVICE,
    TypeDestockage.VOL: EtatMateriel.HORS_SERVICE,
    TypeDestockage.AUTRE: EtatMateriel.REFORME,
}


def _close_active_affectations(db: Session, materiel_id: int, user_id: int) -> None:
    active_affectations = (
        db.query(Affectation)
        .filter(Affectation.materiel_id == materiel_id, Affectation.statut == StatutAffectation.ACTIVE)
        .all()
    )
    for affectation in active_affectations:
        affectation.statut = StatutAffectation.TERMINEE
        affectation.date_fin = datetime.utcnow()
        log_historique(
            db,
            TypeEntite.AFFECTATION,
            affectation.id,
            ActionHistorique.RETOUR,
            f"Retour automatique avant destockage (affectation #{affectation.id})",
            user_id,
        )


def _close_active_maintenances(db: Session, materiel_id: int, user_id: int) -> None:
    active_maintenances = (
        db.query(MaintenancePlanifiee)
        .filter(
            MaintenancePlanifiee.materiel_id == materiel_id,
            MaintenancePlanifiee.statut.in_([StatutMaintenance.PLANIFIEE, StatutMaintenance.EN_COURS]),
        )
        .all()
    )
    for maintenance in active_maintenances:
        maintenance.statut = StatutMaintenance.ANNULEE
        maintenance.date_fin = datetime.utcnow()
        log_historique(
            db,
            TypeEntite.MAINTENANCE,
            maintenance.id,
            ActionHistorique.MODIFICATION,
            f"Maintenance annulee avant destockage (maintenance #{maintenance.id})",
            user_id,
        )


@router.get("", response_model=list[DestockageResponse])
def list_destockages(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    type_destockage: str | None = Query(None),
    materiel_id: int | None = Query(None),
):
    query = db.query(DestockageOperation).options(joinedload(DestockageOperation.materiel))
    if type_destockage:
        query = query.filter(DestockageOperation.type_destockage == TypeDestockage(type_destockage))
    if materiel_id:
        query = query.filter(DestockageOperation.materiel_id == materiel_id)
    return query.order_by(DestockageOperation.date_operation.desc()).all()


@router.get("/{destockage_id}", response_model=DestockageResponse)
def get_destockage(
    destockage_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    operation = (
        db.query(DestockageOperation)
        .options(joinedload(DestockageOperation.materiel))
        .filter(DestockageOperation.id == destockage_id)
        .first()
    )
    if not operation:
        raise HTTPException(status_code=404, detail="Operation de destockage introuvable.")
    return operation


@router.post("", response_model=DestockageResponse, status_code=201)
def create_destockage(
    data: DestockageCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.GESTIONNAIRE))],
):
    materiel = db.query(Materiel).filter(Materiel.id == data.materiel_id).first()
    if not materiel:
        raise HTTPException(status_code=404, detail="Materiel introuvable.")

    if materiel.etat in (EtatMateriel.REFORME, EtatMateriel.HORS_SERVICE):
        raise HTTPException(status_code=400, detail="Ce materiel est deja destocke.")

    try:
        type_op = TypeDestockage(data.type_destockage)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Type de destockage invalide.") from exc

    ancien_etat = materiel.etat
    nouveau_etat = TYPE_TO_ETAT[type_op]
    old_snapshot = model_to_dict(materiel, MATERIEL_FIELDS)

    _close_active_affectations(db, materiel.id, current_user.id)
    _close_active_maintenances(db, materiel.id, current_user.id)

    operation = DestockageOperation(
        materiel_id=materiel.id,
        type_destockage=type_op,
        motif=data.motif,
        document_reference=data.document_reference,
        notes=data.notes,
        valeur_residuelle=data.valeur_residuelle,
        ancien_etat=ancien_etat.value,
        nouveau_etat=nouveau_etat.value,
        date_operation=data.date_operation or datetime.utcnow(),
        created_by=current_user.id,
    )
    materiel.etat = nouveau_etat
    db.add(operation)
    db.flush()

    new_snapshot = model_to_dict(materiel, MATERIEL_FIELDS)
    log_historique(
        db,
        TypeEntite.DESTOCKAGE,
        operation.id,
        ActionHistorique.DESTOCKAGE,
        f"Destockage {type_op.value} — {materiel.matricule} : {data.motif[:120]}",
        current_user.id,
        old_snapshot,
        new_snapshot,
    )
    log_historique(
        db,
        TypeEntite.MATERIEL,
        materiel.id,
        ActionHistorique.DESTOCKAGE,
        f"Materiel destocke ({nouveau_etat.value}) via operation #{operation.id}",
        current_user.id,
        old_snapshot,
        new_snapshot,
    )

    db.commit()
    db.refresh(operation)

    return (
        db.query(DestockageOperation)
        .options(joinedload(DestockageOperation.materiel))
        .filter(DestockageOperation.id == operation.id)
        .first()
    )
