from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.historique import ActionHistorique, HistoriqueMouvement, TypeEntite
from app.models.inventaire import InventaireAnnuel, InventaireLigne, StatutInventaire
from app.models.materiel import Materiel
from app.models.user import User, UserRole
from app.services.storage_service import log_historique
from app.utils.auth import get_current_user, require_roles

router = APIRouter(prefix="/inventaires", tags=["Inventaire annuel"])


class InventaireCreate(BaseModel):
    annee: int = Field(..., ge=2020, le=2100)
    titre: str = Field(..., min_length=3)
    notes: str | None = None


class LigneUpdate(BaseModel):
    etat_constate: str | None = None
    present: bool | None = None
    notes: str | None = None


@router.get("")
def list_inventaires(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(InventaireAnnuel).order_by(InventaireAnnuel.annee.desc()).all()


@router.post("", status_code=201)
def create_inventaire(
    data: InventaireCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.GESTIONNAIRE))],
):
    inv = InventaireAnnuel(**data.model_dump(), created_by=current_user.id)
    db.add(inv)
    db.flush()

    materiels = db.query(Materiel).all()
    for m in materiels:
        db.add(InventaireLigne(inventaire_id=inv.id, materiel_id=m.id, etat_attendu=m.etat.value))

    log_historique(db, TypeEntite.INVENTAIRE, inv.id, ActionHistorique.CREATION,
                   f"Inventaire {data.annee} demarre avec {len(materiels)} lignes", current_user.id)
    db.commit()
    db.refresh(inv)
    return inv


@router.get("/{inventaire_id}")
def get_inventaire(
    inventaire_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    inv = db.query(InventaireAnnuel).filter(InventaireAnnuel.id == inventaire_id).first()
    if not inv:
        raise HTTPException(404, "Inventaire introuvable")
    lignes = (
        db.query(InventaireLigne)
        .options(joinedload(InventaireLigne.materiel))
        .filter(InventaireLigne.inventaire_id == inventaire_id)
        .all()
    )
    return {
        "inventaire": inv,
        "lignes": [
            {
                "id": l.id,
                "materiel_id": l.materiel_id,
                "matricule": l.materiel.matricule if l.materiel else None,
                "designation": l.materiel.designation if l.materiel else None,
                "etat_attendu": l.etat_attendu,
                "etat_constate": l.etat_constate,
                "present": l.present,
                "notes": l.notes,
                "date_comptage": l.date_comptage,
            }
            for l in lignes
        ],
        "stats": {
            "total": len(lignes),
            "comptes": sum(1 for l in lignes if l.present is not None),
            "ecarts": sum(1 for l in lignes if l.present is False or (l.etat_constate and l.etat_constate != l.etat_attendu)),
        },
    }


@router.patch("/{inventaire_id}/lignes/{ligne_id}")
def update_ligne(
    inventaire_id: int,
    ligne_id: int,
    data: LigneUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.GESTIONNAIRE))],
):
    ligne = db.query(InventaireLigne).filter(
        InventaireLigne.id == ligne_id, InventaireLigne.inventaire_id == inventaire_id
    ).first()
    if not ligne:
        raise HTTPException(404, "Ligne introuvable")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(ligne, k, v)
    ligne.compte_par = current_user.id
    ligne.date_comptage = datetime.utcnow()
    db.commit()
    return {"message": "Ligne mise a jour"}


@router.post("/{inventaire_id}/cloturer")
def cloturer_inventaire(
    inventaire_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.GESTIONNAIRE))],
):
    inv = db.query(InventaireAnnuel).filter(InventaireAnnuel.id == inventaire_id).first()
    if not inv:
        raise HTTPException(404, "Inventaire introuvable")
    inv.statut = StatutInventaire.TERMINE
    inv.date_fin = datetime.utcnow()
    log_historique(db, TypeEntite.INVENTAIRE, inv.id, ActionHistorique.INVENTAIRE,
                   f"Inventaire {inv.annee} cloture", current_user.id)
    db.commit()
    return {"message": "Inventaire cloture"}


@router.get("/historique/materiel/{materiel_id}")
def historique_materiel(
    materiel_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    entries = (
        db.query(HistoriqueMouvement)
        .filter(
            HistoriqueMouvement.entity_type == TypeEntite.MATERIEL,
            HistoriqueMouvement.entity_id == materiel_id,
        )
        .order_by(HistoriqueMouvement.created_at.desc())
        .limit(50)
        .all()
    )
    aff_entries = (
        db.query(HistoriqueMouvement)
        .filter(HistoriqueMouvement.entity_type == TypeEntite.AFFECTATION)
        .order_by(HistoriqueMouvement.created_at.desc())
        .limit(20)
        .all()
    )
    return [
        {
            "id": e.id,
            "action": e.action.value,
            "description": e.description,
            "created_at": e.created_at,
        }
        for e in entries
    ]
