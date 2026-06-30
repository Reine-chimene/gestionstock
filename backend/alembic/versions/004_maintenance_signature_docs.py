"""Maintenance signature, documents and audit fields

Revision ID: 004_maint_sig
Revises: 003_quantite_neuf
Create Date: 2026-06-29
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "004_maint_sig"
down_revision: Union[str, None] = "003_quantite_neuf"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("maintenances", sa.Column("signature_data", sa.Text(), nullable=True))
    op.add_column("maintenances", sa.Column("signature_filepath", sa.String(500), nullable=True))
    op.add_column("maintenances", sa.Column("signataire_nom", sa.String(200), nullable=True))
    op.add_column("maintenances", sa.Column("date_signature", sa.DateTime(), nullable=True))

    op.create_table(
        "maintenance_documents",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("maintenance_id", sa.Integer(), sa.ForeignKey("maintenances.id"), nullable=False, index=True),
        sa.Column("filename", sa.String(255), nullable=False),
        sa.Column("filepath", sa.String(500), nullable=False),
        sa.Column("caption", sa.String(255), nullable=True),
        sa.Column("uploaded_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime()),
    )


def downgrade() -> None:
    op.drop_table("maintenance_documents")
    op.drop_column("maintenances", "date_signature")
    op.drop_column("maintenances", "signataire_nom")
    op.drop_column("maintenances", "signature_filepath")
    op.drop_column("maintenances", "signature_data")
