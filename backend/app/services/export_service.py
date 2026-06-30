import io
from datetime import datetime

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from sqlalchemy.orm import Session, joinedload

from app.models.affectation import Affectation, StatutAffectation
from app.models.lieu import Lieu
from app.models.materiel import Materiel


def _header_fill():
    return PatternFill(start_color="0B3D3D", end_color="0B3D3D", fill_type="solid")


def export_materiels_excel(materiels: list[Materiel]) -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.title = "Inventaire Materiel"
    headers = ["Matricule", "Designation", "Categorie", "Marque", "Modele", "N Serie", "Etat", "Valeur FCFA"]
    ws.append(headers)
    for cell in ws[1]:
        cell.font = Font(bold=True, color="FFFFFF")
        cell.fill = _header_fill()
    for m in materiels:
        ws.append([
            m.matricule, m.designation, m.categorie.value, m.marque or "", m.modele or "",
            m.numero_serie or "", m.etat.value, m.valeur_acquisition or "",
        ])
    buffer = io.BytesIO()
    wb.save(buffer)
    return buffer.getvalue()


def export_affectations_excel(affectations: list[Affectation]) -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.title = "Affectations"
    headers = ["Matricule", "Materiel", "Lieu", "Beneficiaire", "Raison", "Statut", "Date debut", "Date fin"]
    ws.append(headers)
    for cell in ws[1]:
        cell.font = Font(bold=True, color="FFFFFF")
        cell.fill = _header_fill()
    for a in affectations:
        ws.append([
            a.materiel.matricule if a.materiel else "",
            a.materiel.designation if a.materiel else "",
            a.lieu.nom if a.lieu else "",
            a.beneficiaire, a.raison, a.statut.value,
            a.date_debut.strftime("%d/%m/%Y") if a.date_debut else "",
            a.date_fin.strftime("%d/%m/%Y") if a.date_fin else "",
        ])
    buffer = io.BytesIO()
    wb.save(buffer)
    return buffer.getvalue()


def export_materiels_pdf(materiels: list[Materiel], titre: str = "Inventaire Materiel CRO") -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=landscape(A4), rightMargin=1.5 * cm, leftMargin=1.5 * cm)
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("Title", parent=styles["Heading1"], textColor=colors.HexColor("#0B3D3D"))
    elements = [
        Paragraph("Conseil Regional de l'Ouest", title_style),
        Paragraph(titre, styles["Heading2"]),
        Paragraph(f"Genere le {datetime.now().strftime('%d/%m/%Y a %H:%M')}", styles["Normal"]),
        Spacer(1, 0.5 * cm),
    ]
    data = [["Matricule", "Designation", "Categorie", "Etat", "N Serie"]]
    for m in materiels:
        data.append([m.matricule, m.designation[:40], m.categorie.value, m.etat.value, m.numero_serie or "-"])
    table = Table(data, repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0B3D3D")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F7F5F0")]),
    ]))
    elements.append(table)
    doc.build(elements)
    return buffer.getvalue()


def export_bon_affectation_pdf(affectation: Affectation) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=2 * cm, leftMargin=2 * cm)
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("Title", parent=styles["Heading1"], textColor=colors.HexColor("#0B3D3D"))
    m = affectation.materiel
    l = affectation.lieu
    elements = [
        Paragraph("CONSEIL REGIONAL DE L'OUEST", title_style),
        Paragraph("BON D'AFFECTATION DE MATERIEL", styles["Heading2"]),
        Spacer(1, 0.5 * cm),
        Paragraph(f"<b>Reference :</b> AFF-{affectation.id:05d}", styles["Normal"]),
        Paragraph(f"<b>Date :</b> {affectation.date_debut.strftime('%d/%m/%Y')}", styles["Normal"]),
        Spacer(1, 0.3 * cm),
        Paragraph("<b>MATERIEL AFFECTE</b>", styles["Heading3"]),
        Paragraph(f"Designation : {m.designation if m else '-'}", styles["Normal"]),
        Paragraph(f"Matricule : {m.matricule if m else '-'} | N° serie : {m.numero_serie or '-'}", styles["Normal"]),
        Spacer(1, 0.3 * cm),
        Paragraph("<b>DESTINATION</b>", styles["Heading3"]),
        Paragraph(f"Lieu : {l.nom if l else '-'} ({l.type_lieu.value if l else '-'})", styles["Normal"]),
        Paragraph(f"Beneficiaire : {affectation.beneficiaire}", styles["Normal"]),
        Spacer(1, 0.3 * cm),
        Paragraph(f"<b>Raison :</b> {affectation.raison}", styles["Normal"]),
    ]
    if affectation.signataire_nom:
        elements.append(Paragraph(
            f"<b>Signe par :</b> {affectation.signataire_nom} le {affectation.date_signature.strftime('%d/%m/%Y') if affectation.date_signature else ''}",
            styles["Normal"],
        ))
    elements.append(Spacer(1, 1 * cm))
    elements.append(Paragraph("Signature beneficiaire : _________________________", styles["Normal"]))
    doc.build(elements)
    return buffer.getvalue()


def rapport_par_lieu_pdf(db: Session) -> bytes:
    lieux = db.query(Lieu).all()
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    styles = getSampleStyleSheet()
    elements = [
        Paragraph("Rapport par structure - CRO", styles["Heading1"]),
        Spacer(1, 0.5 * cm),
    ]
    for lieu in lieux:
        affs = (
            db.query(Affectation)
            .options(joinedload(Affectation.materiel))
            .filter(Affectation.lieu_id == lieu.id, Affectation.statut == StatutAffectation.ACTIVE)
            .all()
        )
        if not affs:
            continue
        elements.append(Paragraph(f"<b>{lieu.nom}</b> ({lieu.type_lieu.value}) - {len(affs)} materiel(s)", styles["Heading3"]))
        for a in affs:
            elements.append(Paragraph(
                f"  • {a.materiel.designation if a.materiel else '?'} [{a.materiel.matricule if a.materiel else '?'}] → {a.beneficiaire}",
                styles["Normal"],
            ))
        elements.append(Spacer(1, 0.3 * cm))
    doc.build(elements)
    return buffer.getvalue()
