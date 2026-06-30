from datetime import datetime
from pydantic import BaseModel, Field, field_validator


class AffectationCreate(BaseModel):
    materiel_id: int
    lieu_id: int
    beneficiaire: str = Field(..., min_length=2, max_length=200)
    raison: str = Field(..., min_length=5)
    document_reference: str | None = None
    notes: str | None = None


class AffectationUpdate(BaseModel):
    beneficiaire: str | None = None
    raison: str | None = None
    statut: str | None = None
    date_fin: datetime | None = None
    document_reference: str | None = None
    notes: str | None = None


class LieuBrief(BaseModel):
    id: int
    nom: str
    type_lieu: str

    @field_validator("type_lieu", mode="before")
    @classmethod
    def enum_to_str(cls, value):
        return value.value if hasattr(value, "value") else value

    class Config:
        from_attributes = True


class MaterielBrief(BaseModel):
    id: int
    designation: str
    matricule: str
    numero_serie: str | None
    etat: str

    @field_validator("etat", mode="before")
    @classmethod
    def enum_to_str(cls, value):
        return value.value if hasattr(value, "value") else value

    class Config:
        from_attributes = True


class AffectationDocumentBrief(BaseModel):
    id: int
    url: str
    caption: str | None
    created_at: datetime


class AffectationResponse(BaseModel):
    id: int
    materiel_id: int
    lieu_id: int
    beneficiaire: str
    raison: str
    statut: str
    date_debut: datetime
    date_fin: datetime | None
    document_reference: str | None
    notes: str | None
    signataire_nom: str | None = None
    date_signature: datetime | None = None
    created_at: datetime
    materiel: MaterielBrief | None = None
    lieu: LieuBrief | None = None
    documents: list[AffectationDocumentBrief] = []

    @field_validator("statut", mode="before")
    @classmethod
    def enum_to_str(cls, value):
        return value.value if hasattr(value, "value") else value

    class Config:
        from_attributes = True
