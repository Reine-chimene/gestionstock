import enum
from datetime import datetime

from sqlalchemy import DateTime, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base, pg_enum


class EtatMateriel(str, enum.Enum):
    NEUF = "neuf"
    DISPONIBLE = "disponible"
    AFFECTE = "affecte"
    EN_MAINTENANCE = "en_maintenance"
    HORS_SERVICE = "hors_service"
    REFORME = "reforme"


class CategorieMateriel(str, enum.Enum):
    INFORMATIQUE = "informatique"
    MOBILIER = "mobilier"
    VEHICULE = "vehicule"
    EQUIPEMENT_MEDICAL = "equipement_medical"
    BUREAUTIQUE = "bureautique"
    ELECTRONIQUE = "electronique"
    GENIE_CIVIL = "genie_civil"
    CLIMATISATION = "climatisation"
    PLOMBERIE = "plomberie"
    ELECTRICITE = "electricite"
    SPORT = "sport"
    AGRICOLE = "agricole"
    COMMUNICATION = "communication"
    SECURITE = "securite"
    OUTILLAGE = "outillage"
    CONSOMMABLE = "consommable"
    IMMOBILIER = "immobilier"
    TEXTILE = "textile"
    CUISINE = "cuisine"
    AUTRE = "autre"


class Materiel(Base):
    __tablename__ = "materiels"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    designation: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    categorie: Mapped[CategorieMateriel] = mapped_column(pg_enum(CategorieMateriel, "categoriemateriel"), default=CategorieMateriel.AUTRE)
    marque: Mapped[str | None] = mapped_column(String(100), nullable=True)
    modele: Mapped[str | None] = mapped_column(String(100), nullable=True)
    numero_serie: Mapped[str | None] = mapped_column(String(100), unique=True, nullable=True, index=True)
    matricule: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    etat: Mapped[EtatMateriel] = mapped_column(pg_enum(EtatMateriel, "etatmateriel"), default=EtatMateriel.NEUF)
    quantite: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    valeur_acquisition: Mapped[float | None] = mapped_column(Float, nullable=True)
    date_acquisition: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    caracteristiques: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    affectations: Mapped[list["Affectation"]] = relationship(
        "Affectation", back_populates="materiel", order_by="desc(Affectation.date_debut)"
    )
    photos: Mapped[list["MaterielPhoto"]] = relationship(
        "MaterielPhoto", back_populates="materiel", cascade="all, delete-orphan"
    )
    maintenances: Mapped[list["MaintenancePlanifiee"]] = relationship(
        "MaintenancePlanifiee", back_populates="materiel"
    )
    destockages: Mapped[list["DestockageOperation"]] = relationship(
        "DestockageOperation", back_populates="materiel", order_by="desc(DestockageOperation.date_operation)"
    )
