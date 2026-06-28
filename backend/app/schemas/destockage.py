from datetime import datetime

from pydantic import BaseModel, Field


class DestockageCreate(BaseModel):
    materiel_id: int
    type_destockage: str = Field(..., min_length=3)
    motif: str = Field(..., min_length=5)
    document_reference: str | None = None
    notes: str | None = None
    valeur_residuelle: float | None = Field(None, ge=0)
    date_operation: datetime | None = None


class MaterielBrief(BaseModel):
    id: int
    designation: str
    matricule: str
    numero_serie: str | None
    etat: str
    categorie: str

    class Config:
        from_attributes = True


class DestockageResponse(BaseModel):
    id: int
    materiel_id: int
    type_destockage: str
    motif: str
    document_reference: str | None
    notes: str | None
    valeur_residuelle: float | None
    ancien_etat: str
    nouveau_etat: str
    date_operation: datetime
    created_at: datetime
    materiel: MaterielBrief | None = None

    class Config:
        from_attributes = True
