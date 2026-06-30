from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.affectation import Affectation, StatutAffectation
from app.models.historique import ActionHistorique, TypeEntite
from app.models.lieu import Lieu
from app.models.materiel import EtatMateriel, Materiel
from app.models.user import User, UserRole
from app.schemas.affectation import AffectationCreate, AffectationResponse, AffectationUpdate
from app.services.email_service import send_affectation_notification
from app.services.storage_service import log_historique, save_base64_image
from app.utils.auth import get_current_user, require_roles

router = APIRouter(prefix="/affectations", tags=["Affectations"])


class SignatureRequest(BaseModel):
    signature_data: str
    signataire_nom: str


@router.get("", response_model=list[AffectationResponse])
def list_affectations(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    statut: str | None = Query(None),
    lieu_id: int | None = Query(None),
    materiel_id: int | None = Query(None),
):
    query = db.query(Affectation).options(joinedload(Affectation.materiel), joinedload(Affectation.lieu))
    if statut:
        query = query.filter(Affectation.statut == StatutAffectation(statut))
    if lieu_id:
        query = query.filter(Affectation.lieu_id == lieu_id)
    if materiel_id:
        query = query.filter(Affectation.materiel_id == materiel_id)
    return query.order_by(Affectation.date_debut.desc()).all()


@router.get("/{affectation_id}", response_model=AffectationResponse)
def get_affectation(
    affectation_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    affectation = (
        db.query(Affectation)
        .options(joinedload(Affectation.materiel), joinedload(Affectation.lieu))
        .filter(Affectation.id == affectation_id)
        .first()
    )
    if not affectation:
        raise HTTPException(status_code=404, detail="Affectation introuvable.")
    return affectation


@router.post("", response_model=AffectationResponse, status_code=201)
async def create_affectation(
    data: AffectationCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.GESTIONNAIRE))],
):
    materiel = db.query(Materiel).filter(Materiel.id == data.materiel_id).first()
    if not materiel:
        raise HTTPException(status_code=404, detail="Materiel introuvable.")

    lieu = db.query(Lieu).filter(Lieu.id == data.lieu_id).first()
    if not lieu:
        raise HTTPException(status_code=404, detail="Lieu introuvable.")

    active = (
        db.query(Affectation)
        .filter(Affectation.materiel_id == data.materiel_id, Affectation.statut == StatutAffectation.ACTIVE)
        .first()
    )
    if active:
        raise HTTPException(status_code=400, detail="Ce materiel a deja une affectation active.")

    if materiel.etat not in (EtatMateriel.DISPONIBLE, EtatMateriel.NEUF):
        raise HTTPException(status_code=400, detail="Ce materiel n'est pas disponible pour affectation.")

    if materiel.quantite <= 0:
        raise HTTPException(status_code=400, detail="Stock epuise pour ce materiel.")

    affectation = Affectation(**data.model_dump(), created_by=current_user.id)
    materiel.etat = EtatMateriel.AFFECTE
    db.add(affectation)
    db.flush()

    log_historique(db, TypeEntite.AFFECTATION, affectation.id, ActionHistorique.AFFECTATION,
                   f"Affectation de {materiel.matricule} a {lieu.nom} pour {data.beneficiaire}", current_user.id)

    db.commit()
    db.refresh(affectation)

    notify_email = lieu.email or current_user.email
    if notify_email:
        await send_affectation_notification(
            notify_email, data.beneficiaire, materiel.designation, materiel.matricule, lieu.nom, data.raison, "nouvelle"
        )

    return (
        db.query(Affectation)
        .options(joinedload(Affectation.materiel), joinedload(Affectation.lieu))
        .filter(Affectation.id == affectation.id)
        .first()
    )


@router.post("/{affectation_id}/signature")
def add_signature(
    affectation_id: int,
    data: SignatureRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.GESTIONNAIRE))],
):
    affectation = db.query(Affectation).filter(Affectation.id == affectation_id).first()
    if not affectation:
        raise HTTPException(404, "Affectation introuvable")

    filename, filepath = save_base64_image(data.signature_data, "signatures")
    affectation.signature_beneficiaire = data.signature_data[:500]
    affectation.signature_filepath = filepath
    affectation.signataire_nom = data.signataire_nom
    affectation.date_signature = datetime.utcnow()

    log_historique(db, TypeEntite.AFFECTATION, affectation_id, ActionHistorique.SIGNATURE,
                   f"Signature de {data.signataire_nom}", current_user.id)
    db.commit()
    return {"message": "Signature enregistree", "signataire": data.signataire_nom}


@router.patch("/{affectation_id}", response_model=AffectationResponse)
async def update_affectation(
    affectation_id: int,
    data: AffectationUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.GESTIONNAIRE))],
):
    affectation = (
        db.query(Affectation)
        .options(joinedload(Affectation.materiel), joinedload(Affectation.lieu))
        .filter(Affectation.id == affectation_id)
        .first()
    )
    if not affectation:
        raise HTTPException(status_code=404, detail="Affectation introuvable.")

    update_data = data.model_dump(exclude_unset=True)
    if "statut" in update_data:
        update_data["statut"] = StatutAffectation(update_data["statut"])

    for key, value in update_data.items():
        setattr(affectation, key, value)

    if affectation.statut in (StatutAffectation.TERMINEE, StatutAffectation.ANNULEE):
        if not affectation.date_fin:
            affectation.date_fin = datetime.utcnow()
        materiel = db.query(Materiel).filter(Materiel.id == affectation.materiel_id).first()
        if materiel:
            materiel.etat = EtatMateriel.DISPONIBLE
        log_historique(db, TypeEntite.AFFECTATION, affectation_id, ActionHistorique.RETOUR,
                       f"Retour materiel {materiel.matricule if materiel else affectation.materiel_id}", current_user.id)

        if affectation.lieu and affectation.lieu.email and affectation.materiel:
            await send_affectation_notification(
                affectation.lieu.email,
                affectation.beneficiaire,
                affectation.materiel.designation,
                affectation.materiel.matricule,
                affectation.lieu.nom,
                affectation.raison,
                "retour",
            )

    db.commit()

    return (
        db.query(Affectation)
        .options(joinedload(Affectation.materiel), joinedload(Affectation.lieu))
        .filter(Affectation.id == affectation_id)
        .first()
    )
