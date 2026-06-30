from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class MaintenanceDocument(Base):
    __tablename__ = "maintenance_documents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    maintenance_id: Mapped[int] = mapped_column(Integer, ForeignKey("maintenances.id"), nullable=False, index=True)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    filepath: Mapped[str] = mapped_column(String(500), nullable=False)
    caption: Mapped[str | None] = mapped_column(String(255), nullable=True)
    uploaded_by: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    maintenance: Mapped["MaintenancePlanifiee"] = relationship("MaintenancePlanifiee", back_populates="documents")
