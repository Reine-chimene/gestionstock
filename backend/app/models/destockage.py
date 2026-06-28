import enum
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base, pg_enum


class TypeDestockage(str, enum.Enum):
    REFORME = "reforme"
    VENTE = "vente"
    DON = "don"
    CASSE = "casse"
    PERTE = "perte"
    VOL = "vol"
    AUTRE = "autre"


class DestockageOperation(Base):
    __tablename__ = "destockages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    materiel_id: Mapped[int] = mapped_column(Integer, ForeignKey("materiels.id"), nullable=False, index=True)
    type_destockage: Mapped[TypeDestockage] = mapped_column(pg_enum(TypeDestockage, "typedestockage"), nullable=False)
    motif: Mapped[str] = mapped_column(Text, nullable=False)
    document_reference: Mapped[str | None] = mapped_column(String(100), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    valeur_residuelle: Mapped[float | None] = mapped_column(Float, nullable=True)
    ancien_etat: Mapped[str] = mapped_column(String(50), nullable=False)
    nouveau_etat: Mapped[str] = mapped_column(String(50), nullable=False)
    date_operation: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    created_by: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    materiel: Mapped["Materiel"] = relationship("Materiel", back_populates="destockages")
