from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.lieu import Lieu, TypeLieu
from app.models.user import User, UserRole
from app.schemas.lieu import LieuCreate, LieuResponse, LieuUpdate
from app.utils.auth import get_current_user, require_roles

router = APIRouter(prefix="/lieux", tags=["Lieux"])


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
        query = query.filter(Lieu.type_lieu == TypeLieu(type_lieu))
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
    lieu = Lieu(**data.model_dump(), type_lieu=TypeLieu(data.type_lieu))
    db.add(lieu)
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

    update_data = data.model_dump(exclude_unset=True)
    if "type_lieu" in update_data:
        update_data["type_lieu"] = TypeLieu(update_data["type_lieu"])

    for key, value in update_data.items():
        setattr(lieu, key, value)

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
    db.delete(lieu)
    db.commit()
