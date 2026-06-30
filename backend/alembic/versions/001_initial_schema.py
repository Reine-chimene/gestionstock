"""Initial schema

Revision ID: 001_initial
Revises:
Create Date: 2026-06-28
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True, index=True),
        sa.Column("nom", sa.String(100), nullable=False),
        sa.Column("prenom", sa.String(100), nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("role", sa.Enum("admin", "gestionnaire", "lecteur", name="userrole"), nullable=False),
        sa.Column("service", sa.String(150)),
        sa.Column("telephone", sa.String(20)),
        sa.Column("is_active", sa.Boolean(), default=False),
        sa.Column("is_verified", sa.Boolean(), default=False),
        sa.Column("created_at", sa.DateTime()),
        sa.Column("updated_at", sa.DateTime()),
    )

    op.create_table(
        "verification_codes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False, index=True),
        sa.Column("code", sa.String(6), nullable=False),
        sa.Column("purpose", sa.String(50), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("is_used", sa.Boolean(), default=False),
        sa.Column("created_at", sa.DateTime()),
    )

    op.create_table(
        "lieux",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("nom", sa.String(200), nullable=False, index=True),
        sa.Column("type_lieu", sa.Enum("lycee", "hopital", "ecole", "service_cro", "commune", "autre", name="typelieu"), nullable=False),
        sa.Column("adresse", sa.String(300)),
        sa.Column("ville", sa.String(100)),
        sa.Column("responsable", sa.String(150)),
        sa.Column("telephone", sa.String(20)),
        sa.Column("email", sa.String(255)),
        sa.Column("notes", sa.Text()),
        sa.Column("created_at", sa.DateTime()),
    )

    op.create_table(
        "materiels",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("designation", sa.String(200), nullable=False, index=True),
        sa.Column("categorie", sa.Enum("informatique", "mobilier", "vehicule", "equipement_medical", "bureautique", "electronique", "autre", name="categoriemateriel"), nullable=False),
        sa.Column("marque", sa.String(100)),
        sa.Column("modele", sa.String(100)),
        sa.Column("numero_serie", sa.String(100), unique=True, index=True),
        sa.Column("matricule", sa.String(50), nullable=False, unique=True, index=True),
        sa.Column("etat", sa.Enum("disponible", "affecte", "en_maintenance", "hors_service", "reforme", name="etatmateriel"), nullable=False),
        sa.Column("valeur_acquisition", sa.Float()),
        sa.Column("date_acquisition", sa.DateTime()),
        sa.Column("caracteristiques", sa.Text()),
        sa.Column("notes", sa.Text()),
        sa.Column("created_at", sa.DateTime()),
        sa.Column("updated_at", sa.DateTime()),
    )

    op.create_table(
        "affectations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("materiel_id", sa.Integer(), sa.ForeignKey("materiels.id"), nullable=False, index=True),
        sa.Column("lieu_id", sa.Integer(), sa.ForeignKey("lieux.id"), nullable=False, index=True),
        sa.Column("beneficiaire", sa.String(200), nullable=False),
        sa.Column("raison", sa.Text(), nullable=False),
        sa.Column("statut", sa.Enum("active", "terminee", "annulee", name="statutaffectation"), nullable=False),
        sa.Column("date_debut", sa.DateTime()),
        sa.Column("date_fin", sa.DateTime()),
        sa.Column("document_reference", sa.String(100)),
        sa.Column("notes", sa.Text()),
        sa.Column("signature_beneficiaire", sa.Text()),
        sa.Column("signature_filepath", sa.String(500)),
        sa.Column("signataire_nom", sa.String(200)),
        sa.Column("date_signature", sa.DateTime()),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id")),
        sa.Column("created_at", sa.DateTime()),
    )

    op.create_table(
        "historique_mouvements",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("entity_type", sa.Enum("materiel", "affectation", "lieu", "inventaire", "maintenance", name="typeentite"), nullable=False, index=True),
        sa.Column("entity_id", sa.Integer(), nullable=False, index=True),
        sa.Column("action", sa.Enum("creation", "modification", "suppression", "affectation", "retour", "signature", "photo", "inventaire", name="actionhistorique"), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id")),
        sa.Column("anciennes_valeurs", postgresql.JSONB()),
        sa.Column("nouvelles_valeurs", postgresql.JSONB()),
        sa.Column("created_at", sa.DateTime(), index=True),
    )

    op.create_table(
        "maintenances",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("materiel_id", sa.Integer(), sa.ForeignKey("materiels.id"), nullable=False, index=True),
        sa.Column("type_maintenance", sa.String(100), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("date_prevue", sa.DateTime(), nullable=False, index=True),
        sa.Column("date_fin", sa.DateTime()),
        sa.Column("statut", sa.Enum("planifiee", "en_cours", "terminee", "annulee", name="statutmaintenance"), nullable=False),
        sa.Column("rappel_jours", sa.Integer(), default=7),
        sa.Column("alerte_envoyee", sa.Boolean(), default=False),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id")),
        sa.Column("created_at", sa.DateTime()),
    )

    op.create_table(
        "inventaires_annuels",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("annee", sa.Integer(), nullable=False, index=True),
        sa.Column("titre", sa.String(200), nullable=False),
        sa.Column("date_debut", sa.DateTime()),
        sa.Column("date_fin", sa.DateTime()),
        sa.Column("statut", sa.Enum("en_cours", "termine", "valide", name="statutinventaire"), nullable=False),
        sa.Column("notes", sa.Text()),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id")),
        sa.Column("created_at", sa.DateTime()),
    )

    op.create_table(
        "inventaire_lignes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("inventaire_id", sa.Integer(), sa.ForeignKey("inventaires_annuels.id"), nullable=False, index=True),
        sa.Column("materiel_id", sa.Integer(), sa.ForeignKey("materiels.id"), nullable=False, index=True),
        sa.Column("etat_attendu", sa.String(50), nullable=False),
        sa.Column("etat_constate", sa.String(50)),
        sa.Column("present", sa.Boolean()),
        sa.Column("notes", sa.Text()),
        sa.Column("compte_par", sa.Integer(), sa.ForeignKey("users.id")),
        sa.Column("date_comptage", sa.DateTime()),
    )

    op.create_table(
        "materiel_photos",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("materiel_id", sa.Integer(), sa.ForeignKey("materiels.id"), nullable=False, index=True),
        sa.Column("filename", sa.String(255), nullable=False),
        sa.Column("filepath", sa.String(500), nullable=False),
        sa.Column("caption", sa.String(300)),
        sa.Column("uploaded_by", sa.Integer(), sa.ForeignKey("users.id")),
        sa.Column("created_at", sa.DateTime()),
    )


def downgrade() -> None:
    op.drop_table("materiel_photos")
    op.drop_table("inventaire_lignes")
    op.drop_table("inventaires_annuels")
    op.drop_table("maintenances")
    op.drop_table("historique_mouvements")
    op.drop_table("affectations")
    op.drop_table("materiels")
    op.drop_table("lieux")
    op.drop_table("verification_codes")
    op.drop_table("users")
    for name in ["userrole", "typelieu", "categoriemateriel", "etatmateriel", "statutaffectation",
                 "typeentite", "actionhistorique", "statutmaintenance", "statutinventaire"]:
        op.execute(f"DROP TYPE IF EXISTS {name}")
