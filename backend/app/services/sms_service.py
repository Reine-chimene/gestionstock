"""Envoi SMS optionnel (Twilio) avec mode dev."""

from app.config import settings


def sms_configured() -> bool:
    return bool(settings.twilio_account_sid and settings.twilio_auth_token and settings.twilio_from_number)


async def send_sms(to: str, message: str) -> bool:
    if not to or not message.strip():
        return False

    if not sms_configured():
        print(f"\n{'='*50}")
        print(f"SMS DEV MODE - Destinataire : {to}")
        print(message)
        print(f"{'='*50}\n")
        return True

    try:
        from twilio.rest import Client

        client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
        client.messages.create(body=message[:1600], from_=settings.twilio_from_number, to=to)
        print(f"SMS envoye a {to}")
        return True
    except Exception as exc:
        print(f"ERREUR SMS → {to} : {exc}")
        return False
