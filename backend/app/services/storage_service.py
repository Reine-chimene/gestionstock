import json
import os
import uuid
from pathlib import Path

from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.config import settings
from app.models.historique import ActionHistorique, HistoriqueMouvement, TypeEntite


def ensure_upload_dirs():
    base = Path(settings.upload_dir)
    for sub in ("photos", "signatures", "exports", "documents"):
        (base / sub).mkdir(parents=True, exist_ok=True)


async def save_upload(file: UploadFile, subdir: str) -> tuple[str, str]:
    ensure_upload_dirs()
    ext = Path(file.filename or "file.bin").suffix or ".bin"
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = Path(settings.upload_dir) / subdir / filename
    content = await file.read()
    if len(content) > settings.max_upload_size_mb * 1024 * 1024:
        raise ValueError(f"Fichier trop volumineux (max {settings.max_upload_size_mb} Mo)")
    filepath.write_bytes(content)
    return filename, str(filepath)


def save_base64_image(data: str, subdir: str) -> tuple[str, str]:
    import base64

    ensure_upload_dirs()
    if "," in data:
        data = data.split(",", 1)[1]
    content = base64.b64decode(data)
    filename = f"{uuid.uuid4().hex}.png"
    filepath = Path(settings.upload_dir) / subdir / filename
    filepath.write_bytes(content)
    return filename, str(filepath)


def log_historique(
    db: Session,
    entity_type: TypeEntite,
    entity_id: int,
    action: ActionHistorique,
    description: str,
    user_id: int | None = None,
    old: dict | None = None,
    new: dict | None = None,
):
    entry = HistoriqueMouvement(
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        description=description,
        user_id=user_id,
        anciennes_valeurs=old,
        nouvelles_valeurs=new,
    )
    db.add(entry)


def model_to_dict(obj, fields: list[str]) -> dict:
    result = {}
    for f in fields:
        val = getattr(obj, f, None)
        if hasattr(val, "value"):
            val = val.value
        elif hasattr(val, "isoformat"):
            val = val.isoformat()
        result[f] = val
    return result
