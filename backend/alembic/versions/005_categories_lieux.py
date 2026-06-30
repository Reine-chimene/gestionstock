"""Elargir categories materiel et types de lieu

Revision ID: 005_categories
Revises: 004_maint_sig
Create Date: 2026-06-29
"""

from typing import Sequence, Union

from alembic import op

revision: str = "005_categories"
down_revision: Union[str, None] = "004_maint_sig"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

NEW_CATEGORIES = [
    "genie_civil",
    "climatisation",
    "plomberie",
    "electricite",
    "sport",
    "agricole",
    "communication",
    "securite",
    "outillage",
    "consommable",
    "immobilier",
    "textile",
    "cuisine",
]

NEW_LIEU_TYPES = [
    "universite",
    "prefecture",
    "delegation",
    "etablissement_public",
]


def upgrade() -> None:
    for value in NEW_CATEGORIES:
        op.execute(f"ALTER TYPE categoriemateriel ADD VALUE IF NOT EXISTS '{value}'")
    for value in NEW_LIEU_TYPES:
        op.execute(f"ALTER TYPE typelieu ADD VALUE IF NOT EXISTS '{value}'")


def downgrade() -> None:
    # PostgreSQL ne permet pas de retirer facilement des valeurs d'enum
    pass
