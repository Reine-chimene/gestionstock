from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import Response
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.historique import ActionHistorique, HistoriqueMouvement, TypeEntite
from app.models.materiel import CategorieMateriel, EtatMateriel, Materiel
from app.models.materiel_photo import MaterielPhoto
from app.models.user import User, UserRole
from app.schemas.materiel import MaterielCreate, MaterielResponse, MaterielUpdate
from app.services.qr_service import generate_qr_png
from app.services.storage_service import log_historique, model_to_dict
from app.utils.auth import get_current_user, require_roles

router = APIRouter(prefix="/materiels", tags=["Materiels"])

MATERIEL_FIELDS = ["designation", "matricule", "etat", "categorie", "numero_serie"]


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


@router.get("/scan/{matricule}")
def scan_matricule(
    matricule: str,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    materiel = db.query(Materiel).filter(Materiel.matricule == matricule).first()
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
    entries = (
        db.query(HistoriqueMouvement)
        .filter(HistoriqueMouvement.entity_type == TypeEntite.MATERIEL, HistoriqueMouvement.entity_id == materiel_id)
        .order_by(HistoriqueMouvement.created_at.desc())
        .limit(50)
        .all()
    )
    return [{"id": e.id, "action": e.action.value, "description": e.description, "created_at": e.created_at} for e in entries]


@router.post("", response_model=MaterielResponse, status_code=201)
def create_materiel(
    data: MaterielCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.GESTIONNAIRE))],
):
    existing = db.query(Materiel).filter(Materiel.matricule == data.matricule).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ce matricule existe deja.")

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
        update_data["categorie"] = CategorieMateriel(update_data["categorie"])
    if "etat" in update_data:
        update_data["etat"] = EtatMateriel(update_data["etat"])

    for key, value in update_data.items():
        setattr(materiel, key, value)

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
