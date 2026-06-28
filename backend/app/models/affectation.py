import enum
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base, pg_enum


class StatutAffectation(str, enum.Enum):
    ACTIVE = "active"
    TERMINEE = "terminee"
    ANNULEE = "annulee"


class Affectation(Base):
    __tablename__ = "affectations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    materiel_id: Mapped[int] = mapped_column(Integer, ForeignKey("materiels.id"), nullable=False, index=True)
    lieu_id: Mapped[int] = mapped_column(Integer, ForeignKey("lieux.id"), nullable=False, index=True)
    beneficiaire: Mapped[str] = mapped_column(String(200), nullable=False)
    raison: Mapped[str] = mapped_column(Text, nullable=False)
    statut: Mapped[StatutAffectation] = mapped_column(pg_enum(StatutAffectation, "statutaffectation"), default=StatutAffectation.ACTIVE)
    date_debut: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    date_fin: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    document_reference: Mapped[str | None] = mapped_column(String(100), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    signature_beneficiaire: Mapped[str | None] = mapped_column(Text, nullable=True)
    signature_filepath: Mapped[str | None] = mapped_column(String(500), nullable=True)
    signataire_nom: Mapped[str | None] = mapped_column(String(200), nullable=True)
    date_signature: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_by: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    materiel: Mapped["Materiel"] = relationship("Materiel", back_populates="affectations")
    lieu: Mapped["Lieu"] = relationship("Lieu", back_populates="affectations")
