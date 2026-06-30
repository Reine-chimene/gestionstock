"""Add destockage module

Revision ID: 002_destockage
Revises: 001_initial
Create Date: 2026-06-28
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "002_destockage"
down_revision: Union[str, None] = "001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

typedestockage = postgresql.ENUM(
    "reforme", "vente", "don", "casse", "perte", "vol", "autre",
    name="typedestockage",
    create_type=False,
)


def upgrade() -> None:
    op.execute("ALTER TYPE typeentite ADD VALUE IF NOT EXISTS 'destockage'")
    op.execute("ALTER TYPE actionhistorique ADD VALUE IF NOT EXISTS 'destockage'")
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE typedestockage AS ENUM (
                'reforme', 'vente', 'don', 'casse', 'perte', 'vol', 'autre'
            );
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)

    op.create_table(
        "destockages",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("materiel_id", sa.Integer(), sa.ForeignKey("materiels.id"), nullable=False, index=True),
        sa.Column("type_destockage", typedestockage, nullable=False),
        sa.Column("motif", sa.Text(), nullable=False),
        sa.Column("document_reference", sa.String(100)),
        sa.Column("notes", sa.Text()),
        sa.Column("valeur_residuelle", sa.Float()),
        sa.Column("ancien_etat", sa.String(50), nullable=False),
        sa.Column("nouveau_etat", sa.String(50), nullable=False),
        sa.Column("date_operation", sa.DateTime(), index=True),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id")),
        sa.Column("created_at", sa.DateTime()),
    )


def downgrade() -> None:
    op.drop_table("destockages")
    op.execute("DROP TYPE IF EXISTS typedestockage")
