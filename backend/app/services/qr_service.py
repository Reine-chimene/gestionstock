import io
import re

import qrcode


def generate_qr_png(matricule: str, materiel_id: int) -> bytes:
    """Payload portable : fonctionne avec le scanner in-app et les apps QR externes."""
    payload = f"CRO:{matricule}:{materiel_id}"
    qr = qrcode.QRCode(version=1, box_size=10, border=2)
    qr.add_data(payload)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    return buffer.getvalue()


def parse_qr_payload(raw: str) -> tuple[str | None, int | None]:
    """Decode CRO:matricule:id ou URL legacy."""
    value = (raw or "").strip()
    if value.upper().startswith("CRO:"):
        parts = value.split(":", 2)
        if len(parts) >= 2:
            matricule = parts[1].strip()
            materiel_id = int(parts[2]) if len(parts) == 3 and parts[2].isdigit() else None
            return matricule or None, materiel_id
    if "/materiels/" in value:
        match = re.search(r"/materiels/(\d+)", value)
        matricule = None
        if "scan=" in value:
            m = re.search(r"scan=([^&]+)", value)
            if m:
                matricule = m.group(1)
        return matricule, int(match.group(1)) if match else None
    return value, None
