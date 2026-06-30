"""Seuil stock, documents affectation, alerte stock

Revision ID: 006_alerts
Revises: 005_categories
Create Date: 2026-06-29
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "006_alerts"
down_revision: Union[str, None] = "005_categories"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("materiels", sa.Column("seuil_alerte", sa.Integer(), nullable=True))
    op.add_column("materiels", sa.Column("stock_alerte_envoyee", sa.Boolean(), server_default="false", nullable=False))

    op.create_table(
        "affectation_documents",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("affectation_id", sa.Integer(), sa.ForeignKey("affectations.id"), nullable=False, index=True),
        sa.Column("filename", sa.String(255), nullable=False),
        sa.Column("filepath", sa.String(500), nullable=False),
        sa.Column("caption", sa.String(255), nullable=True),
        sa.Column("uploaded_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("affectation_documents")
    op.drop_column("materiels", "stock_alerte_envoyee")
    op.drop_column("materiels", "seuil_alerte")
