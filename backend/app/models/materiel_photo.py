from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class MaterielPhoto(Base):
    __tablename__ = "materiel_photos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    materiel_id: Mapped[int] = mapped_column(Integer, ForeignKey("materiels.id"), nullable=False, index=True)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    filepath: Mapped[str] = mapped_column(String(500), nullable=False)
    caption: Mapped[str | None] = mapped_column(String(300), nullable=True)
    uploaded_by: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    materiel: Mapped["Materiel"] = relationship("Materiel", back_populates="photos")
