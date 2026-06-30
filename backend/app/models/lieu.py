import enum
from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base, pg_enum


class TypeLieu(str, enum.Enum):
    LYCEE = "lycee"
    HOPITAL = "hopital"
    ECOLE = "ecole"
    UNIVERSITE = "universite"
    SERVICE_CRO = "service_cro"
    COMMUNE = "commune"
    PREFECTURE = "prefecture"
    DELEGATION = "delegation"
    ETABLISSEMENT_PUBLIC = "etablissement_public"
    AUTRE = "autre"


class Lieu(Base):
    __tablename__ = "lieux"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    nom: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    type_lieu: Mapped[TypeLieu] = mapped_column(pg_enum(TypeLieu, "typelieu"), default=TypeLieu.AUTRE)
    adresse: Mapped[str | None] = mapped_column(String(300), nullable=True)
    ville: Mapped[str | None] = mapped_column(String(100), nullable=True)
    responsable: Mapped[str | None] = mapped_column(String(150), nullable=True)
    telephone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    affectations: Mapped[list["Affectation"]] = relationship("Affectation", back_populates="lieu")
