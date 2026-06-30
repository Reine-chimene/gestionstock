import enum
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base, pg_enum


class StatutInventaire(str, enum.Enum):
    EN_COURS = "en_cours"
    TERMINE = "termine"
    VALIDE = "valide"


class InventaireAnnuel(Base):
    __tablename__ = "inventaires_annuels"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    annee: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    titre: Mapped[str] = mapped_column(String(200), nullable=False)
    date_debut: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    date_fin: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    statut: Mapped[StatutInventaire] = mapped_column(pg_enum(StatutInventaire, "statutinventaire"), default=StatutInventaire.EN_COURS)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    lignes: Mapped[list["InventaireLigne"]] = relationship(
        "InventaireLigne", back_populates="inventaire", cascade="all, delete-orphan"
    )


class InventaireLigne(Base):
    __tablename__ = "inventaire_lignes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    inventaire_id: Mapped[int] = mapped_column(Integer, ForeignKey("inventaires_annuels.id"), nullable=False, index=True)
    materiel_id: Mapped[int] = mapped_column(Integer, ForeignKey("materiels.id"), nullable=False, index=True)
    etat_attendu: Mapped[str] = mapped_column(String(50), nullable=False)
    etat_constate: Mapped[str | None] = mapped_column(String(50), nullable=True)
    present: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    compte_par: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    date_comptage: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    inventaire: Mapped["InventaireAnnuel"] = relationship("InventaireAnnuel", back_populates="lignes")
    materiel: Mapped["Materiel"] = relationship("Materiel")
