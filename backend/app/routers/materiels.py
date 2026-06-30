from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import Response
from sqlalchemy.orm import Session, joinedload

from app.constants.catalogues import CATEGORIES_MATERIEL
from app.database import get_db
from sqlalchemy import or_, and_

from app.models.affectation import Affectation, StatutAffectation
from app.models.destockage import DestockageOperation
from app.models.historique import ActionHistorique, HistoriqueMouvement, TypeEntite
from app.models.maintenance import MaintenancePlanifiee
from app.models.user import User
from app.models.materiel import CategorieMateriel, EtatMateriel, Materiel
from app.models.materiel_photo import MaterielPhoto
from app.models.user import User, UserRole
from app.config import settings
from app.schemas.materiel import MaterielCreate, MaterielResponse, MaterielUpdate
from app.services.import_service import import_materiels_excel
from app.services.qr_service import generate_qr_png, parse_qr_payload
from app.services.storage_service import log_historique, model_to_dict
from app.utils.auth import get_current_user, require_roles

router = APIRouter(prefix="/materiels", tags=["Materiels"])

MATERIEL_FIELDS = ["designation", "matricule", "etat", "categorie", "numero_serie", "quantite", "seuil_alerte"]


@router.get("/categories")
def list_categories():
    return CATEGORIES_MATERIEL


@router.post("/import")
async def import_materiels(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.GESTIONNAIRE))],
    file: UploadFile = File(...),
):
    content = await file.read()
    max_bytes = settings.max_upload_size_mb * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(status_code=400, detail=f"Fichier trop volumineux (max {settings.max_upload_size_mb} Mo).")
    if not (file.filename or "").lower().endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Format accepte : Excel (.xlsx)")
    return import_materiels_excel(db, content, current_user.id)


@router.get("/affectables", response_model=list[MaterielResponse])
def list_affectables(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Materiels disponibles pour une nouvelle affectation."""
    active_ids = [
        row[0]
        for row in db.query(Affectation.materiel_id)
        .filter(Affectation.statut == StatutAffectation.ACTIVE)
        .all()
    ]
    query = db.query(Materiel).filter(
        Materiel.etat.in_([EtatMateriel.NEUF, EtatMateriel.DISPONIBLE]),
        Materiel.quantite > 0,
    )
    if active_ids:
        query = query.filter(Materiel.id.notin_(active_ids))
    return query.order_by(Materiel.designation).all()


@router.get("", response_model=list[MaterielResponse])
def list_materiels(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    search: str | None = Query(None),
    etat: str | None = Query(None),
    categorie: str | None = Query(None),
):
    query = db.query(Materiel)
    if search:
        query = query.filter(
            (Materiel.designation.ilike(f"%{search}%"))
            | (Materiel.matricule.ilike(f"%{search}%"))
            | (Materiel.numero_serie.ilike(f"%{search}%"))
        )
    if etat:
        query = query.filter(Materiel.etat == EtatMateriel(etat))
    if categorie:
        query = query.filter(Materiel.categorie == CategorieMateriel(categorie))
    return query.order_by(Materiel.designation).all()


@router.get("/scan/{matricule:path}")
def scan_matricule(
    matricule: str,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    from urllib.parse import unquote

    decoded = unquote(matricule).strip()
    parsed_matricule, parsed_id = parse_qr_payload(decoded)
    if parsed_id:
        materiel = db.query(Materiel).filter(Materiel.id == parsed_id).first()
        if materiel:
            return MaterielResponse.model_validate(materiel)

    lookup = (parsed_matricule or decoded).strip()
    materiel = db.query(Materiel).filter(Materiel.matricule.ilike(lookup)).first()
    if not materiel:
        raise HTTPException(404, "Materiel introuvable")
    return MaterielResponse.model_validate(materiel)


@router.get("/{materiel_id}", response_model=MaterielResponse)
def get_materiel(
    materiel_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    materiel = db.query(Materiel).filter(Materiel.id == materiel_id).first()
    if not materiel:
        raise HTTPException(status_code=404, detail="Materiel introuvable.")
    return materiel


@router.get("/{materiel_id}/qr")
def get_qr(
    materiel_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    materiel = db.query(Materiel).filter(Materiel.id == materiel_id).first()
    if not materiel:
        raise HTTPException(404, "Materiel introuvable")
    png = generate_qr_png(materiel.matricule, materiel.id)
    return Response(png, media_type="image/png")


@router.get("/{materiel_id}/photos")
def list_photos(
    materiel_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    photos = db.query(MaterielPhoto).filter(MaterielPhoto.materiel_id == materiel_id).all()
    return [{"id": p.id, "filename": p.filename, "caption": p.caption, "url": f"/uploads/photos/{p.filename}", "created_at": p.created_at} for p in photos]


@router.post("/{materiel_id}/photos", status_code=201)
async def upload_photo(
    materiel_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.GESTIONNAIRE))],
    file: UploadFile = File(...),
    caption: str | None = None,
):
    from app.services.storage_service import save_upload

    materiel = db.query(Materiel).filter(Materiel.id == materiel_id).first()
    if not materiel:
        raise HTTPException(404, "Materiel introuvable")
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(400, "Seules les images sont acceptees")

    filename, filepath = await save_upload(file, "photos")
    photo = MaterielPhoto(materiel_id=materiel_id, filename=filename, filepath=filepath, caption=caption, uploaded_by=current_user.id)
    db.add(photo)
    log_historique(db, TypeEntite.MATERIEL, materiel_id, ActionHistorique.PHOTO, f"Photo ajoutee : {filename}", current_user.id)
    db.commit()
    return {"id": photo.id, "url": f"/uploads/photos/{filename}"}


@router.delete("/photos/{photo_id}", status_code=204)
def delete_photo(
    photo_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.GESTIONNAIRE))],
):
    photo = db.query(MaterielPhoto).filter(MaterielPhoto.id == photo_id).first()
    if not photo:
        raise HTTPException(404, "Photo introuvable")
    db.delete(photo)
    db.commit()


@router.get("/{materiel_id}/historique")
def get_historique(
    materiel_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Timeline complete : materiel, affectations, maintenance, destockage."""
    materiel = db.query(Materiel).filter(Materiel.id == materiel_id).first()
    if not materiel:
        raise HTTPException(status_code=404, detail="Materiel introuvable.")

    aff_ids = [r[0] for r in db.query(Affectation.id).filter(Affectation.materiel_id == materiel_id).all()]
    maint_ids = [r[0] for r in db.query(MaintenancePlanifiee.id).filter(MaintenancePlanifiee.materiel_id == materiel_id).all()]
    dest_ids = [r[0] for r in db.query(DestockageOperation.id).filter(DestockageOperation.materiel_id == materiel_id).all()]

    filters = [
        and_(HistoriqueMouvement.entity_type == TypeEntite.MATERIEL, HistoriqueMouvement.entity_id == materiel_id),
    ]
    if aff_ids:
        filters.append(and_(HistoriqueMouvement.entity_type == TypeEntite.AFFECTATION, HistoriqueMouvement.entity_id.in_(aff_ids)))
    if maint_ids:
        filters.append(and_(HistoriqueMouvement.entity_type == TypeEntite.MAINTENANCE, HistoriqueMouvement.entity_id.in_(maint_ids)))
    if dest_ids:
        filters.append(and_(HistoriqueMouvement.entity_type == TypeEntite.DESTOCKAGE, HistoriqueMouvement.entity_id.in_(dest_ids)))

    entries = (
        db.query(HistoriqueMouvement)
        .filter(or_(*filters))
        .order_by(HistoriqueMouvement.created_at.desc())
        .limit(100)
        .all()
    )

    user_ids = {e.user_id for e in entries if e.user_id}
    users = {}
    if user_ids:
        for u in db.query(User).filter(User.id.in_(user_ids)).all():
            users[u.id] = f"{u.prenom} {u.nom}"

    return [
        {
            "id": e.id,
            "entity_type": e.entity_type.value,
            "action": e.action.value,
            "description": e.description,
            "user_name": users.get(e.user_id, "Systeme"),
            "created_at": e.created_at,
        }
        for e in entries
    ]


@router.post("", response_model=MaterielResponse, status_code=201)
def create_materiel(
    data: MaterielCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.GESTIONNAIRE))],
):
    existing = db.query(Materiel).filter(Materiel.matricule == data.matricule).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ce matricule existe deja.")

    if data.categorie not in CATEGORIES_MATERIEL:
        raise HTTPException(status_code=400, detail="Categorie de materiel invalide.")

    materiel_data = data.model_dump()
    materiel_data["categorie"] = CategorieMateriel(data.categorie)
    materiel_data["etat"] = EtatMateriel(data.etat)
    materiel = Materiel(**materiel_data)
    db.add(materiel)
    db.flush()
    log_historique(db, TypeEntite.MATERIEL, materiel.id, ActionHistorique.CREATION,
                   f"Materiel cree : {materiel.matricule} - {materiel.designation}", current_user.id,
                   new=model_to_dict(materiel, MATERIEL_FIELDS))
    db.commit()
    db.refresh(materiel)
    return materiel


@router.patch("/{materiel_id}", response_model=MaterielResponse)
def update_materiel(
    materiel_id: int,
    data: MaterielUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.GESTIONNAIRE))],
):
    materiel = db.query(Materiel).filter(Materiel.id == materiel_id).first()
    if not materiel:
        raise HTTPException(status_code=404, detail="Materiel introuvable.")

    old = model_to_dict(materiel, MATERIEL_FIELDS)
    update_data = data.model_dump(exclude_unset=True)
    if "categorie" in update_data:
        if update_data["categorie"] not in CATEGORIES_MATERIEL:
            raise HTTPException(status_code=400, detail="Categorie de materiel invalide.")
        update_data["categorie"] = CategorieMateriel(update_data["categorie"])
    if "etat" in update_data:
        update_data["etat"] = EtatMateriel(update_data["etat"])

    for key, value in update_data.items():
        setattr(materiel, key, value)

    if materiel.seuil_alerte is not None and materiel.quantite > materiel.seuil_alerte:
        materiel.stock_alerte_envoyee = False

    log_historique(db, TypeEntite.MATERIEL, materiel_id, ActionHistorique.MODIFICATION,
                   f"Materiel modifie : {materiel.matricule}", current_user.id,
                   old=old, new=model_to_dict(materiel, MATERIEL_FIELDS))
    db.commit()
    db.refresh(materiel)
    return materiel


@router.delete("/{materiel_id}", status_code=204)
def delete_materiel(
    materiel_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(UserRole.ADMIN))],
):
    materiel = db.query(Materiel).filter(Materiel.id == materiel_id).first()
    if not materiel:
        raise HTTPException(status_code=404, detail="Materiel introuvable.")
    if materiel.affectations:
        raise HTTPException(status_code=400, detail="Impossible de supprimer : des affectations existent.")
    log_historique(db, TypeEntite.MATERIEL, materiel_id, ActionHistorique.SUPPRESSION,
                   f"Materiel supprime : {materiel.matricule}", current_user.id)
    db.delete(materiel)
    db.commit()
