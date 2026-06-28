from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.affectation import Affectation, StatutAffectation
from app.models.inventaire import InventaireAnnuel, InventaireLigne
from app.models.lieu import Lieu
from app.models.maintenance import MaintenancePlanifiee, StatutMaintenance
from app.models.materiel import EtatMateriel, Materiel
from app.models.user import User
from app.utils.auth import get_current_user

router = APIRouter(prefix="/reports", tags=["Rapports"])


@router.get("/par-structure")
def rapport_par_structure(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    results = (
        db.query(
            Lieu.id, Lieu.nom, Lieu.type_lieu, Lieu.ville,
            func.count(Affectation.id).label("nb_affectations"),
        )
        .outerjoin(Affectation, (Lieu.id == Affectation.lieu_id) & (Affectation.statut == StatutAffectation.ACTIVE))
        .group_by(Lieu.id)
        .all()
    )
    data = []
    for r in results:
        materiels = (
            db.query(Affectation)
            .options(joinedload(Affectation.materiel))
            .filter(Affectation.lieu_id == r.id, Affectation.statut == StatutAffectation.ACTIVE)
            .all()
        )
        data.append({
            "lieu_id": r.id,
            "nom": r.nom,
            "type_lieu": r.type_lieu.value,
            "ville": r.ville,
            "nb_affectations": r.nb_affectations,
            "materiels": [
                {"matricule": a.materiel.matricule, "designation": a.materiel.designation, "beneficiaire": a.beneficiaire}
                for a in materiels if a.materiel
            ],
        })
    return data


@router.get("/maintenance")
def rapport_maintenance(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    upcoming = (
        db.query(MaintenancePlanifiee)
        .options(joinedload(MaintenancePlanifiee.materiel))
        .filter(MaintenancePlanifiee.statut.in_([StatutMaintenance.PLANIFIEE, StatutMaintenance.EN_COURS]))
        .order_by(MaintenancePlanifiee.date_prevue)
        .all()
    )
    return [
        {
            "id": m.id,
            "materiel": m.materiel.designation if m.materiel else None,
            "matricule": m.materiel.matricule if m.materiel else None,
            "type_maintenance": m.type_maintenance,
            "date_prevue": m.date_prevue.isoformat(),
            "statut": m.statut.value,
            "alerte_envoyee": m.alerte_envoyee,
        }
        for m in upcoming
    ]


@router.get("/inventaire/{inventaire_id}/ecarts")
def rapport_inventaire_ecarts(
    inventaire_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    inv = db.query(InventaireAnnuel).filter(InventaireAnnuel.id == inventaire_id).first()
    if not inv:
        from fastapi import HTTPException
        raise HTTPException(404, "Inventaire introuvable")

    lignes = (
        db.query(InventaireLigne)
        .options(joinedload(InventaireLigne.materiel))
        .filter(InventaireLigne.inventaire_id == inventaire_id)
        .all()
    )
    ecarts = []
    for l in lignes:
        if l.present is False or (l.etat_constate and l.etat_constate != l.etat_attendu):
            ecarts.append({
                "matricule": l.materiel.matricule if l.materiel else None,
                "designation": l.materiel.designation if l.materiel else None,
                "etat_attendu": l.etat_attendu,
                "etat_constate": l.etat_constate,
                "present": l.present,
                "notes": l.notes,
            })
    return {"inventaire": {"id": inv.id, "annee": inv.annee, "titre": inv.titre}, "ecarts": ecarts, "total_ecarts": len(ecarts)}
