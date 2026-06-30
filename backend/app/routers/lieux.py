from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session

from app.constants.catalogues import TYPES_LIEU
from app.config import settings
from app.database import get_db
from app.models.historique import ActionHistorique, TypeEntite
from app.models.lieu import Lieu, TypeLieu
from app.models.user import User, UserRole
from app.schemas.lieu import LieuCreate, LieuResponse, LieuUpdate
from app.services.import_service import import_lieux_excel
from app.services.storage_service import log_historique
from app.utils.auth import get_current_user, require_roles

router = APIRouter(prefix="/lieux", tags=["Lieux"])


def _parse_type_lieu(value: str) -> TypeLieu:
    try:
        return TypeLieu(value)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"Type de lieu invalide : {value}") from exc


def _build_lieu_payload(data: LieuCreate | LieuUpdate, *, for_create: bool = False) -> dict:
    payload = data.model_dump(exclude_unset=not for_create)
    if "type_lieu" in payload:
        payload["type_lieu"] = _parse_type_lieu(payload["type_lieu"])
    elif for_create:
        payload["type_lieu"] = TypeLieu.AUTRE
    return payload


@router.get("/types")
def list_types_lieu():
    return TYPES_LIEU


@router.post("/import")
async def import_lieux(
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
    return import_lieux_excel(db, content, current_user.id)


@router.get("", response_model=list[LieuResponse])
def list_lieux(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    search: str | None = Query(None),
    type_lieu: str | None = Query(None),
):
    query = db.query(Lieu)
    if search:
        query = query.filter(Lieu.nom.ilike(f"%{search}%"))
    if type_lieu:
        query = query.filter(Lieu.type_lieu == _parse_type_lieu(type_lieu))
    return query.order_by(Lieu.nom).all()


@router.get("/{lieu_id}", response_model=LieuResponse)
def get_lieu(
    lieu_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    lieu = db.query(Lieu).filter(Lieu.id == lieu_id).first()
    if not lieu:
        raise HTTPException(status_code=404, detail="Lieu introuvable.")
    return lieu


@router.post("", response_model=LieuResponse, status_code=201)
def create_lieu(
    data: LieuCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.GESTIONNAIRE))],
):
    payload = _build_lieu_payload(data, for_create=True)
    lieu = Lieu(**payload)
    db.add(lieu)
    db.flush()
    log_historique(
        db,
        TypeEntite.LIEU,
        lieu.id,
        ActionHistorique.CREATION,
        f"Lieu cree : {lieu.nom} ({lieu.type_lieu.value})",
        current_user.id,
    )
    db.commit()
    db.refresh(lieu)
    return lieu


@router.patch("/{lieu_id}", response_model=LieuResponse)
def update_lieu(
    lieu_id: int,
    data: LieuUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.GESTIONNAIRE))],
):
    lieu = db.query(Lieu).filter(Lieu.id == lieu_id).first()
    if not lieu:
        raise HTTPException(status_code=404, detail="Lieu introuvable.")

    update_data = _build_lieu_payload(data)
    for key, value in update_data.items():
        setattr(lieu, key, value)

    log_historique(
        db,
        TypeEntite.LIEU,
        lieu.id,
        ActionHistorique.MODIFICATION,
        f"Lieu modifie : {lieu.nom}",
        current_user.id,
    )
    db.commit()
    db.refresh(lieu)
    return lieu


@router.delete("/{lieu_id}", status_code=204)
def delete_lieu(
    lieu_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(UserRole.ADMIN))],
):
    lieu = db.query(Lieu).filter(Lieu.id == lieu_id).first()
    if not lieu:
        raise HTTPException(status_code=404, detail="Lieu introuvable.")
    if lieu.affectations:
        raise HTTPException(status_code=400, detail="Impossible de supprimer : des affectations existent.")
    log_historique(
        db,
        TypeEntite.LIEU,
        lieu.id,
        ActionHistorique.SUPPRESSION,
        f"Lieu supprime : {lieu.nom}",
        current_user.id,
    )
    db.delete(lieu)
    db.commit()
