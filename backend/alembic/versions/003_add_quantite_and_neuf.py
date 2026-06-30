"""Add quantite to materiel/destockage and neuf etat

Revision ID: 003_quantite_neuf
Revises: 002_destockage
Create Date: 2026-06-29
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "003_quantite_neuf"
down_revision: Union[str, None] = "002_destockage"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE etatmateriel ADD VALUE IF NOT EXISTS 'neuf'")
    op.add_column("materiels", sa.Column("quantite", sa.Integer(), nullable=False, server_default="1"))
    op.add_column("destockages", sa.Column("quantite", sa.Integer(), nullable=False, server_default="1"))


def downgrade() -> None:
    op.drop_column("destockages", "quantite")
    op.drop_column("materiels", "quantite")
