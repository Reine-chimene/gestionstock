from typing import Annotated

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.affectation import Affectation
from app.models.materiel import Materiel
from app.models.user import User
from app.services.export_service import (
    export_affectations_excel,
    export_bon_affectation_pdf,
    export_materiels_excel,
    export_materiels_pdf,
    rapport_par_lieu_pdf,
)
from app.services.import_service import lieux_import_template, materiel_import_template
from app.utils.auth import get_current_user, require_roles
from app.models.user import UserRole

router = APIRouter(prefix="/exports", tags=["Exports"])


@router.get("/materiels/template")
def template_materiels(
    current_user: Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.GESTIONNAIRE))],
):
    content = materiel_import_template()
    return Response(
        content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=modele_import_materiels.xlsx"},
    )


@router.get("/lieux/template")
def template_lieux(
    current_user: Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.GESTIONNAIRE))],
):
    content = lieux_import_template()
    return Response(
        content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=modele_import_lieux.xlsx"},
    )


@router.get("/materiels")
def export_materiels(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    format: str = Query("xlsx", pattern="^(xlsx|pdf)$"),
):
    materiels = db.query(Materiel).order_by(Materiel.matricule).all()
    if format == "pdf":
        content = export_materiels_pdf(materiels)
        return Response(content, media_type="application/pdf", headers={"Content-Disposition": "attachment; filename=inventaire_materiel.pdf"})
    content = export_materiels_excel(materiels)
    return Response(content, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers={"Content-Disposition": "attachment; filename=inventaire_materiel.xlsx"})


@router.get("/affectations")
def export_affectations(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    format: str = Query("xlsx", pattern="^(xlsx|pdf)$"),
):
    affectations = (
        db.query(Affectation)
        .options(joinedload(Affectation.materiel), joinedload(Affectation.lieu))
        .order_by(Affectation.date_debut.desc())
        .all()
    )
    if format == "pdf":
        content = export_materiels_pdf([], "Liste des affectations")
        return Response(content, media_type="application/pdf")
    content = export_affectations_excel(affectations)
    return Response(content, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers={"Content-Disposition": "attachment; filename=affectations.xlsx"})


@router.get("/affectations/{affectation_id}/bon")
def export_bon(
    affectation_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    aff = (
        db.query(Affectation)
        .options(joinedload(Affectation.materiel), joinedload(Affectation.lieu))
        .filter(Affectation.id == affectation_id)
        .first()
    )
    if not aff:
        from fastapi import HTTPException
        raise HTTPException(404, "Affectation introuvable")
    content = export_bon_affectation_pdf(aff)
    return Response(content, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=bon_affectation_{affectation_id}.pdf"})


@router.get("/rapport-structures")
def export_rapport_structures(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.GESTIONNAIRE))],
):
    content = rapport_par_lieu_pdf(db)
    return Response(content, media_type="application/pdf", headers={"Content-Disposition": "attachment; filename=rapport_structures.pdf"})
