import io

import qrcode

from app.config import settings


def generate_qr_png(matricule: str, materiel_id: int) -> bytes:
    url = f"{settings.frontend_url}/materiels/{materiel_id}?scan={matricule}"
    qr = qrcode.QRCode(version=1, box_size=10, border=2)
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#0B3D3D", back_color="#FAF8F4")
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    return buffer.getvalue()
