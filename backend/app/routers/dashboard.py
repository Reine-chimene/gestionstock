from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.affectation import Affectation, StatutAffectation
from app.models.destockage import DestockageOperation
from app.models.inventaire import InventaireAnnuel, StatutInventaire
from app.models.lieu import Lieu
from app.models.maintenance import MaintenancePlanifiee, StatutMaintenance
from app.models.materiel import EtatMateriel, Materiel
from app.models.user import User
from app.utils.auth import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Tableau de bord"])


@router.get("/stats")
def get_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    now = datetime.utcnow()
    total_materiels = db.query(func.count(Materiel.id)).scalar()
    disponibles = db.query(func.count(Materiel.id)).filter(Materiel.etat == EtatMateriel.DISPONIBLE).scalar()
    affectes = db.query(func.count(Materiel.id)).filter(Materiel.etat == EtatMateriel.AFFECTE).scalar()
    en_maintenance = db.query(func.count(Materiel.id)).filter(Materiel.etat == EtatMateriel.EN_MAINTENANCE).scalar()
    reformes = db.query(func.count(Materiel.id)).filter(Materiel.etat == EtatMateriel.REFORME).scalar()
    hors_service = db.query(func.count(Materiel.id)).filter(Materiel.etat == EtatMateriel.HORS_SERVICE).scalar()
    destockages_total = db.query(func.count(DestockageOperation.id)).scalar()
    destockages_mois = (
        db.query(func.count(DestockageOperation.id))
        .filter(DestockageOperation.date_operation >= now.replace(day=1, hour=0, minute=0, second=0, microsecond=0))
        .scalar()
    )
    total_lieux = db.query(func.count(Lieu.id)).scalar()
    affectations_actives = db.query(func.count(Affectation.id)).filter(Affectation.statut == StatutAffectation.ACTIVE).scalar()

    maintenances_proches = (
        db.query(func.count(MaintenancePlanifiee.id))
        .filter(
            MaintenancePlanifiee.statut == StatutMaintenance.PLANIFIEE,
            MaintenancePlanifiee.date_prevue <= now + timedelta(days=7),
        )
        .scalar()
    )

    inventaire_en_cours = (
        db.query(func.count(InventaireAnnuel.id))
        .filter(InventaireAnnuel.statut == StatutInventaire.EN_COURS)
        .scalar()
    )

    par_categorie = db.query(Materiel.categorie, func.count(Materiel.id)).group_by(Materiel.categorie).all()
    par_lieu = (
        db.query(Lieu.nom, func.count(Affectation.id))
        .join(Affectation, Lieu.id == Affectation.lieu_id)
        .filter(Affectation.statut == StatutAffectation.ACTIVE)
        .group_by(Lieu.nom)
        .all()
    )

    stock_bas = (
        db.query(func.count(Materiel.id))
        .filter(
            Materiel.seuil_alerte.isnot(None),
            Materiel.quantite <= Materiel.seuil_alerte,
            Materiel.etat.notin_([EtatMateriel.REFORME, EtatMateriel.HORS_SERVICE]),
        )
        .scalar()
    )

    return {
        "total_materiels": total_materiels,
        "disponibles": disponibles,
        "affectes": affectes,
        "en_maintenance": en_maintenance,
        "reformes": reformes,
        "hors_service": hors_service,
        "stock_bas": stock_bas,
        "destockages_total": destockages_total,
        "destockages_mois": destockages_mois,
        "total_lieux": total_lieux,
        "affectations_actives": affectations_actives,
        "maintenances_proches": maintenances_proches,
        "inventaire_en_cours": inventaire_en_cours,
        "par_categorie": [{"categorie": str(c), "count": n} for c, n in par_categorie],
        "par_lieu": [{"lieu": nom, "count": n} for nom, n in par_lieu],
    }
