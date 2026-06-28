from datetime import datetime
from pydantic import BaseModel, Field


class LieuCreate(BaseModel):
    nom: str = Field(..., min_length=2, max_length=200)
    type_lieu: str = "autre"
    adresse: str | None = None
    ville: str | None = None
    responsable: str | None = None
    telephone: str | None = None
    email: str | None = None
    notes: str | None = None


class LieuUpdate(BaseModel):
    nom: str | None = None
    type_lieu: str | None = None
    adresse: str | None = None
    ville: str | None = None
    responsable: str | None = None
    telephone: str | None = None
    email: str | None = None
    notes: str | None = None


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

    class Config:
        from_attributes = True
