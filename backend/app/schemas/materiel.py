from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class MaterielCreate(BaseModel):
    designation: str = Field(..., min_length=2, max_length=200)
    categorie: str = "autre"
    marque: str | None = None
    modele: str | None = None
    numero_serie: str | None = None
    matricule: str = Field(..., min_length=2, max_length=50)
    etat: str = "neuf"
    quantite: int = Field(1, ge=1)
    seuil_alerte: int | None = Field(None, ge=0)
    valeur_acquisition: float | None = None
    date_acquisition: datetime | None = None
    caracteristiques: str | None = None
    notes: str | None = None


class MaterielUpdate(BaseModel):
    designation: str | None = None
    categorie: str | None = None
    marque: str | None = None
    modele: str | None = None
    numero_serie: str | None = None
    matricule: str | None = None
    etat: str | None = None
    quantite: int | None = Field(None, ge=0)
    seuil_alerte: int | None = Field(None, ge=0)
    valeur_acquisition: float | None = None
    date_acquisition: datetime | None = None
    caracteristiques: str | None = None
    notes: str | None = None


class MaterielResponse(BaseModel):
    id: int
    designation: str
    categorie: str
    marque: str | None
    modele: str | None
    numero_serie: str | None
    matricule: str
    etat: str
    quantite: int
    seuil_alerte: int | None
    valeur_acquisition: float | None
    date_acquisition: datetime | None
    caracteristiques: str | None
    notes: str | None
    created_at: datetime
    updated_at: datetime

    @field_validator("categorie", "etat", mode="before")
    @classmethod
    def enum_to_str(cls, value):
        return value.value if hasattr(value, "value") else value

    class Config:
        from_attributes = True
