from datetime import datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.historique import ActionHistorique, TypeEntite
from app.models.maintenance import MaintenancePlanifiee, StatutMaintenance
from app.models.maintenance_document import MaintenanceDocument
from app.models.materiel import EtatMateriel, Materiel
from app.models.user import User, UserRole
from app.services.email_service import send_maintenance_alert
from app.services.storage_service import log_historique, save_base64_image, save_upload
from app.utils.auth import get_current_user, require_roles

router = APIRouter(prefix="/maintenance", tags=["Maintenance"])

CATEGORIES = [
    "preventive",
    "corrective",
    "controle",
    "reparation",
    "revision",
    "nettoyage",
    "autre",
]


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


class SignatureRequest(BaseModel):
    signature_data: str
    signataire_nom: str


def _serialize(m: MaintenancePlanifiee) -> dict:
    return {
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
        "signataire_nom": m.signataire_nom,
        "date_signature": m.date_signature,
        "has_signature": bool(m.signature_data or m.signature_filepath),
        "documents": [
            {"id": d.id, "url": f"/uploads/documents/{d.filename}", "caption": d.caption, "created_at": d.created_at}
            for d in (m.documents or [])
        ],
    }


@router.get("/categories")
def list_categories():
    return CATEGORIES


@router.get("")
def list_maintenance(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    items = (
        db.query(MaintenancePlanifiee)
        .options(joinedload(MaintenancePlanifiee.materiel), joinedload(MaintenancePlanifiee.documents))
        .order_by(MaintenancePlanifiee.date_prevue.desc())
        .all()
    )
    return [_serialize(m) for m in items]


@router.get("/{maintenance_id}")
def get_maintenance(
    maintenance_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    m = (
        db.query(MaintenancePlanifiee)
        .options(joinedload(MaintenancePlanifiee.materiel), joinedload(MaintenancePlanifiee.documents))
        .filter(MaintenancePlanifiee.id == maintenance_id)
        .first()
    )
    if not m:
        raise HTTPException(404, "Maintenance introuvable")
    return _serialize(m)


@router.post("", status_code=201)
async def create_maintenance(
    data: MaintenanceCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.GESTIONNAIRE))],
):
    if data.type_maintenance not in CATEGORIES:
        raise HTTPException(400, detail="Categorie de maintenance invalide.")

    materiel = db.query(Materiel).filter(Materiel.id == data.materiel_id).first()
    if not materiel:
        raise HTTPException(404, "Materiel introuvable")

    m = MaintenancePlanifiee(**data.model_dump(), created_by=current_user.id)
    materiel.etat = EtatMateriel.EN_MAINTENANCE
    db.add(m)
    db.flush()
    log_historique(
        db,
        TypeEntite.MAINTENANCE,
        m.id,
        ActionHistorique.CREATION,
        f"Maintenance planifiee : {data.type_maintenance} pour {materiel.matricule}",
        current_user.id,
    )
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
    if "type_maintenance" in update and update["type_maintenance"] not in CATEGORIES:
        raise HTTPException(400, detail="Categorie de maintenance invalide.")
    if "statut" in update:
        update["statut"] = StatutMaintenance(update["statut"])

    for k, v in update.items():
        setattr(m, k, v)

    if m.statut in (StatutMaintenance.TERMINEE, StatutMaintenance.ANNULEE):
        if not m.date_fin:
            m.date_fin = datetime.utcnow()
        materiel = db.query(Materiel).filter(Materiel.id == m.materiel_id).first()
        if materiel and materiel.etat == EtatMateriel.EN_MAINTENANCE:
            materiel.etat = EtatMateriel.DISPONIBLE

    log_historique(
        db,
        TypeEntite.MAINTENANCE,
        m.id,
        ActionHistorique.MODIFICATION,
        f"Maintenance #{m.id} mise a jour",
        current_user.id,
    )
    db.commit()
    return {"message": "Maintenance mise a jour"}


@router.post("/{maintenance_id}/signature")
def add_signature(
    maintenance_id: int,
    data: SignatureRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.GESTIONNAIRE))],
):
    m = db.query(MaintenancePlanifiee).filter(MaintenancePlanifiee.id == maintenance_id).first()
    if not m:
        raise HTTPException(404, "Maintenance introuvable")

    filename, filepath = save_base64_image(data.signature_data, "signatures")
    m.signature_data = data.signature_data[:500]
    m.signature_filepath = filepath
    m.signataire_nom = data.signataire_nom
    m.date_signature = datetime.utcnow()
    m.statut = StatutMaintenance.TERMINEE
    m.date_fin = datetime.utcnow()

    materiel = db.query(Materiel).filter(Materiel.id == m.materiel_id).first()
    if materiel:
        materiel.etat = EtatMateriel.DISPONIBLE

    log_historique(
        db,
        TypeEntite.MAINTENANCE,
        m.id,
        ActionHistorique.SIGNATURE,
        f"Fiche maintenance signee par {data.signataire_nom}",
        current_user.id,
    )
    db.commit()
    return {"message": "Signature enregistree", "signataire": data.signataire_nom}


@router.post("/{maintenance_id}/documents", status_code=201)
async def upload_document(
    maintenance_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.GESTIONNAIRE))],
    file: UploadFile = File(...),
    caption: str | None = None,
):
    m = db.query(MaintenancePlanifiee).filter(MaintenancePlanifiee.id == maintenance_id).first()
    if not m:
        raise HTTPException(404, "Maintenance introuvable")

    try:
        filename, filepath = await save_upload(file, "documents")
    except ValueError as exc:
        raise HTTPException(400, detail=str(exc)) from exc

    doc = MaintenanceDocument(
        maintenance_id=maintenance_id,
        filename=filename,
        filepath=filepath,
        caption=caption or file.filename,
        uploaded_by=current_user.id,
    )
    db.add(doc)
    log_historique(
        db,
        TypeEntite.MAINTENANCE,
        m.id,
        ActionHistorique.PHOTO,
        f"Capture ajoutee : {doc.caption or filename}",
        current_user.id,
    )
    db.commit()
    return {"id": doc.id, "url": f"/uploads/documents/{filename}", "caption": doc.caption}


@router.delete("/{maintenance_id}")
def delete_maintenance(
    maintenance_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.GESTIONNAIRE))],
):
    m = db.query(MaintenancePlanifiee).filter(MaintenancePlanifiee.id == maintenance_id).first()
    if not m:
        raise HTTPException(404, "Maintenance introuvable")

    materiel = db.query(Materiel).filter(Materiel.id == m.materiel_id).first()
    if materiel and materiel.etat == EtatMateriel.EN_MAINTENANCE:
        materiel.etat = EtatMateriel.DISPONIBLE

    log_historique(
        db,
        TypeEntite.MAINTENANCE,
        m.id,
        ActionHistorique.SUPPRESSION,
        f"Maintenance supprimee pour {materiel.matricule if materiel else m.materiel_id}",
        current_user.id,
    )
    db.delete(m)
    db.commit()
    return {"message": "Maintenance supprimee"}


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
