import random
import string
from datetime import datetime, timedelta

import aiosmtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from sqlalchemy.orm import Session

from app.config import settings
from app.models.user import VerificationCode


class EmailDeliveryError(Exception):
    """Erreur lors de l'envoi SMTP vers la boite du client."""


def generate_code() -> str:
    return "".join(random.choices(string.digits, k=6))


def smtp_configured() -> bool:
    return bool(settings.smtp_user and settings.smtp_password)


def email_dev_fallback() -> bool:
    """True = code affiche dans les logs, pas d'email au client."""
    return settings.email_dev_mode or not smtp_configured()


def create_verification_code(db: Session, email: str, purpose: str) -> str:
    db.query(VerificationCode).filter(
        VerificationCode.email == email,
        VerificationCode.purpose == purpose,
        VerificationCode.is_used == False,
    ).update({"is_used": True})

    code = generate_code()
    verification = VerificationCode(
        email=email,
        code=code,
        purpose=purpose,
        expires_at=datetime.utcnow() + timedelta(minutes=settings.verification_code_expire_minutes),
    )
    db.add(verification)
    db.commit()
    return code


def verify_code(db: Session, email: str, code: str, purpose: str) -> bool:
    record = (
        db.query(VerificationCode)
        .filter(
            VerificationCode.email == email,
            VerificationCode.code == code,
            VerificationCode.purpose == purpose,
            VerificationCode.is_used == False,
            VerificationCode.expires_at > datetime.utcnow(),
        )
        .first()
    )
    if not record:
        return False
    record.is_used = True
    db.commit()
    return True


async def _deliver_email(to: str, subject: str, body_text: str, html_body: str | None = None) -> None:
    if email_dev_fallback():
        print(f"\n{'='*50}")
        print(f"EMAIL DEV MODE - Destinataire : {to}")
        print(f"Sujet : {subject}")
        print(body_text)
        print(f"{'='*50}\n")
        return

    message = MIMEMultipart("alternative")
    message["From"] = settings.smtp_from
    message["To"] = to
    message["Subject"] = subject
    message.attach(MIMEText(body_text, "plain"))
    if html_body:
        message.attach(MIMEText(html_body, "html"))

    try:
        await aiosmtplib.send(
            message,
            hostname=settings.smtp_host,
            port=settings.smtp_port,
            username=settings.smtp_user,
            password=settings.smtp_password,
            start_tls=not settings.smtp_use_ssl,
            use_tls=settings.smtp_use_ssl,
        )
        print(f"Email envoye a {to}")
    except Exception as exc:
        print(f"ERREUR ENVOI EMAIL → {to} : {exc}")
        raise EmailDeliveryError(f"Envoi impossible vers {to}") from exc


async def send_verification_email(email: str, code: str, purpose: str, nom: str = "") -> None:
    if purpose == "register":
        subject = "Validation de votre compte - Conseil Regional de l'Ouest"
        intro = f"Bonjour {nom}," if nom else "Bonjour,"
        body_text = f"""{intro}

Bienvenue sur la plateforme de gestion de stock du Conseil Regional de l'Ouest.

Votre code de validation est : {code}

Ce code expire dans {settings.verification_code_expire_minutes} minutes.

Si vous n'avez pas demande cette inscription, ignorez ce message.

Conseil Regional de l'Ouest
"""
    else:
        subject = "Invitation - Conseil Regional de l'Ouest"
        intro = f"Bonjour {nom}," if nom else "Bonjour,"
        body_text = f"""{intro}

Un compte a ete cree pour vous sur la plateforme de gestion de stock du Conseil Regional de l'Ouest.

Votre code de validation est : {code}

Utilisez ce code pour activer votre compte et definir votre mot de passe.
Ce code expire dans {settings.verification_code_expire_minutes} minutes.

Conseil Regional de l'Ouest
"""

    html = f"""
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #0B3D3D; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">Conseil Regional de l'Ouest</h1>
            <p style="margin: 5px 0 0;">Gestion de Stock</p>
        </div>
        <div style="background: #FAF8F4; padding: 30px; border-radius: 0 0 8px 8px;">
            <p style="font-size: 16px; color: #334155;">{intro}</p>
            <p style="font-size: 16px; color: #334155;">Votre code de validation :</p>
            <div style="background: white; border: 2px solid #0B3D3D; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #0B3D3D;">{code}</span>
            </div>
            <p style="font-size: 14px; color: #64748b;">Ce code expire dans {settings.verification_code_expire_minutes} minutes.</p>
        </div>
    </body>
    </html>
    """
    await _deliver_email(email, subject, body_text, html)


async def _send_email(to: str, subject: str, body_text: str, html_body: str) -> None:
    await _deliver_email(to, subject, body_text, html_body)


async def send_affectation_notification(
    to_email: str,
    beneficiaire: str,
    materiel_designation: str,
    matricule: str,
    lieu_nom: str,
    raison: str,
    action: str = "nouvelle",
) -> None:
    if action == "nouvelle":
        subject = f"Affectation materiel - {matricule}"
        intro = f"Bonjour {beneficiaire},"
        detail = f"Le materiel « {materiel_designation} » (matricule {matricule}) vous a ete affecte au {lieu_nom}."
    else:
        subject = f"Retour materiel - {matricule}"
        intro = f"Bonjour {beneficiaire},"
        detail = f"L'affectation du materiel « {materiel_designation} » (matricule {matricule}) est terminee."

    body = f"{intro}\n\n{detail}\n\nRaison : {raison}\n\nConseil Regional de l'Ouest"
    html = f"""
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:#0B3D3D;color:#C9A227;padding:20px;text-align:center;">
            <h2 style="margin:0;color:white;">Conseil Regional de l'Ouest</h2>
        </div>
        <div style="padding:24px;background:#FAF8F4;">
            <p>{intro}</p><p>{detail}</p>
            <p><strong>Raison :</strong> {raison}</p>
        </div>
    </div>"""
    await _send_email(to_email, subject, body, html)


async def send_maintenance_alert(
    to_email: str,
    materiel_designation: str,
    matricule: str,
    type_maintenance: str,
    date_prevue: str,
) -> None:
    subject = f"Rappel maintenance - {matricule}"
    body = (
        f"Maintenance prevue pour « {materiel_designation} » ({matricule}).\n"
        f"Type : {type_maintenance}\nDate : {date_prevue}\n\nConseil Regional de l'Ouest"
    )
    html = f"""
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:#0B3D3D;color:white;padding:16px;text-align:center;">
            <h2 style="margin:0;">CRO — Rappel maintenance</h2>
        </div>
        <div style="padding:20px;background:#FAF8F4;">
            <p><strong>{materiel_designation}</strong> ({matricule})</p>
            <p>Type : {type_maintenance}<br>Date prevue : {date_prevue}</p>
        </div>
    </div>"""
    await _send_email(to_email, subject, body, html)


async def send_stock_alert(
    to_email: str,
    designation: str,
    matricule: str,
    quantite: int,
    seuil: int,
) -> None:
    subject = f"Alerte stock bas - {matricule}"
    body = (
        f"Stock bas pour « {designation} » ({matricule}).\n"
        f"Quantite restante : {quantite}\nSeuil d'alerte : {seuil}\n\nConseil Regional de l'Ouest"
    )
    html = f"""
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:#B45309;color:white;padding:16px;text-align:center;">
            <h2 style="margin:0;">CRO — Stock bas</h2>
        </div>
        <div style="padding:20px;background:#FFFBEB;">
            <p><strong>{designation}</strong> ({matricule})</p>
            <p>Quantite : <strong>{quantite}</strong> / seuil : {seuil}</p>
        </div>
    </div>"""
    await _send_email(to_email, subject, body, html)
