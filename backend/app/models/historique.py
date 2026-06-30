import enum
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base, pg_enum


class TypeEntite(str, enum.Enum):
    MATERIEL = "materiel"
    AFFECTATION = "affectation"
    LIEU = "lieu"
    INVENTAIRE = "inventaire"
    MAINTENANCE = "maintenance"
    DESTOCKAGE = "destockage"


class ActionHistorique(str, enum.Enum):
    CREATION = "creation"
    MODIFICATION = "modification"
    SUPPRESSION = "suppression"
    AFFECTATION = "affectation"
    RETOUR = "retour"
    SIGNATURE = "signature"
    PHOTO = "photo"
    INVENTAIRE = "inventaire"
    DESTOCKAGE = "destockage"


class HistoriqueMouvement(Base):
    __tablename__ = "historique_mouvements"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    entity_type: Mapped[TypeEntite] = mapped_column(pg_enum(TypeEntite, "typeentite"), nullable=False, index=True)
    entity_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    action: Mapped[ActionHistorique] = mapped_column(pg_enum(ActionHistorique, "actionhistorique"), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    user_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    anciennes_valeurs: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    nouvelles_valeurs: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
