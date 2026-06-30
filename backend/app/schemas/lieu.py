from datetime import datetime

from pydantic import BaseModel, Field, field_validator


def _empty_to_none(value: str | None) -> str | None:
    if value is None:
        return None
    stripped = value.strip()
    return stripped if stripped else None


class LieuCreate(BaseModel):
    nom: str = Field(..., min_length=2, max_length=200)
    type_lieu: str = "autre"
    adresse: str | None = None
    ville: str | None = None
    responsable: str | None = None
    telephone: str | None = None
    email: str | None = None
    notes: str | None = None

    @field_validator("adresse", "ville", "responsable", "telephone", "email", "notes", mode="before")
    @classmethod
    def blank_strings_to_none(cls, value):
        return _empty_to_none(value)


class LieuUpdate(BaseModel):
    nom: str | None = None
    type_lieu: str | None = None
    adresse: str | None = None
    ville: str | None = None
    responsable: str | None = None
    telephone: str | None = None
    email: str | None = None
    notes: str | None = None

    @field_validator("nom", "adresse", "ville", "responsable", "telephone", "email", "notes", mode="before")
    @classmethod
    def blank_strings_to_none(cls, value):
        return _empty_to_none(value)


class LieuResponse(BaseModel):
    id: int
    nom: str
    type_lieu: str
    adresse: str | None
    ville: str | None
    responsable: str | None
    telephone: str | None
    email: str | None
    notes: str | None
    created_at: datetime

    @field_validator("type_lieu", mode="before")
    @classmethod
    def enum_to_str(cls, value):
        return value.value if hasattr(value, "value") else value

    class Config:
        from_attributes = True
