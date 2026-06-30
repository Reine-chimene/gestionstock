"""Alertes automatiques maintenance et stock bas."""

from datetime import datetime, timedelta

from sqlalchemy.orm import Session, joinedload

from app.config import settings
from app.database import SessionLocal
from app.models.maintenance import MaintenancePlanifiee, StatutMaintenance
from app.models.materiel import EtatMateriel, Materiel
from app.models.user import User, UserRole
from app.services.email_service import send_maintenance_alert, send_stock_alert
from app.services.sms_service import send_sms, sms_configured


def _recipient_emails(db: Session) -> list[str]:
    if settings.alert_email_recipients.strip():
        return [e.strip() for e in settings.alert_email_recipients.split(",") if e.strip()]
    users = (
        db.query(User)
        .filter(User.is_active == True, User.role.in_([UserRole.ADMIN, UserRole.GESTIONNAIRE]))
        .all()
    )
    return [u.email for u in users if u.email]


def _recipient_phones(db: Session) -> list[str]:
    if not settings.alert_sms_recipients.strip():
        return []
    return [p.strip() for p in settings.alert_sms_recipients.split(",") if p.strip()]


async def run_scheduled_alerts() -> dict:
    db = SessionLocal()
    try:
        return await _run_alerts(db)
    finally:
        db.close()


async def _run_alerts(db: Session) -> dict:
    now = datetime.utcnow()
    emails = _recipient_emails(db)
    phones = _recipient_phones(db)
    maintenance_sent = 0
    stock_sent = 0

    maintenances = (
        db.query(MaintenancePlanifiee)
        .options(joinedload(MaintenancePlanifiee.materiel))
        .filter(
            MaintenancePlanifiee.statut == StatutMaintenance.PLANIFIEE,
            MaintenancePlanifiee.alerte_envoyee == False,
        )
        .all()
    )

    for m in maintenances:
        if not m.materiel:
            continue
        rappel = m.rappel_jours or 7
        if m.date_prevue > now + timedelta(days=rappel):
            continue
        date_str = m.date_prevue.strftime("%d/%m/%Y")
        for email in emails:
            await send_maintenance_alert(
                email,
                m.materiel.designation,
                m.materiel.matricule,
                m.type_maintenance,
                date_str,
            )
        if phones and sms_configured():
            msg = f"CRO Stock: maintenance {m.type_maintenance} prevue le {date_str} pour {m.materiel.matricule}"
            for phone in phones:
                await send_sms(phone, msg)
        m.alerte_envoyee = True
        maintenance_sent += 1

    materiels = (
        db.query(Materiel)
        .filter(
            Materiel.seuil_alerte.isnot(None),
            Materiel.quantite <= Materiel.seuil_alerte,
            Materiel.stock_alerte_envoyee == False,
            Materiel.etat.notin_([EtatMateriel.REFORME, EtatMateriel.HORS_SERVICE]),
        )
        .all()
    )

    for mat in materiels:
        for email in emails:
            await send_stock_alert(email, mat.designation, mat.matricule, mat.quantite, mat.seuil_alerte)
        if phones:
            msg = f"CRO Stock: stock bas {mat.matricule} — reste {mat.quantite} (seuil {mat.seuil_alerte})"
            for phone in phones:
                await send_sms(phone, msg)
        mat.stock_alerte_envoyee = True
        stock_sent += 1

    # Reinitialiser le flag si le stock remonte au-dessus du seuil
    replenished = (
        db.query(Materiel)
        .filter(
            Materiel.seuil_alerte.isnot(None),
            Materiel.quantite > Materiel.seuil_alerte,
            Materiel.stock_alerte_envoyee == True,
        )
        .all()
    )
    for mat in replenished:
        mat.stock_alerte_envoyee = False

    db.commit()
    return {"maintenance_alertes": maintenance_sent, "stock_alertes": stock_sent}


async def run_manual_alerts(db: Session) -> dict:
    return await _run_alerts(db)
