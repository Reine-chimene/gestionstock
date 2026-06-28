import enum
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base, pg_enum


class StatutMaintenance(str, enum.Enum):
    PLANIFIEE = "planifiee"
    EN_COURS = "en_cours"
    TERMINEE = "terminee"
    ANNULEE = "annulee"


class MaintenancePlanifiee(Base):
    __tablename__ = "maintenances"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    materiel_id: Mapped[int] = mapped_column(Integer, ForeignKey("materiels.id"), nullable=False, index=True)
    type_maintenance: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    date_prevue: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True)
    date_fin: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    statut: Mapped[StatutMaintenance] = mapped_column(pg_enum(StatutMaintenance, "statutmaintenance"), default=StatutMaintenance.PLANIFIEE)
    rappel_jours: Mapped[int] = mapped_column(Integer, default=7)
    alerte_envoyee: Mapped[bool] = mapped_column(Boolean, default=False)
    created_by: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    materiel: Mapped["Materiel"] = relationship("Materiel", back_populates="maintenances")
