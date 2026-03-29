from io import BytesIO
import os

from django.conf import settings
from django.http import HttpResponse
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm, mm
from reportlab.platypus import (
    HRFlowable, Image, PageBreak, Paragraph,
    SimpleDocTemplate, Spacer, Table, TableStyle,
)

# ── Colores institucionales ───────────────────────────────────────────────────
ROJO   = colors.HexColor('#6B0F1A')
ORO    = colors.HexColor('#C9A84C')
FONDO  = colors.HexColor('#F9F6F0')
GRIS   = colors.HexColor('#888888')
BLANCO = colors.white
NEGRO  = colors.HexColor('#1a1a1a')

STATUS_COLOR = {
    'SOLICITADA': colors.HexColor('#C9A84C'),
    'APROBADA':   colors.HexColor('#28a745'),
    'CANCELADA':  colors.HexColor('#dc3545'),
    'COMPLETADA': colors.HexColor('#17a2b8'),
}

PAGE_W, PAGE_H = letter
MARGIN = 2 * cm


# ── Helpers ───────────────────────────────────────────────────────────────────

def _sty(name, **kw):
    return ParagraphStyle(name, **kw)


def _make_circular_logo(path, size=120):
    from PIL import Image as PILImage, ImageDraw
    img = PILImage.open(path).convert('RGBA')
    img = img.resize((size, size), PILImage.LANCZOS)
    mask = PILImage.new('L', (size, size), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, size - 1, size - 1), fill=255)
    result = PILImage.new('RGBA', (size, size), (255, 255, 255, 0))
    result.paste(img, mask=mask)
    bg = PILImage.new('RGB', (size, size), (255, 255, 255))
    bg.paste(result, mask=result.split()[3])
    buf = BytesIO()
    bg.save(buf, format='PNG')
    buf.seek(0)
    return buf


def _decorate_page(folio_ref, fecha_str):
    """Devuelve la función de decoración de página (barras + footer)."""
    def _draw(canv, doc):
        canv.saveState()
        canv.setFillColor(ROJO)
        canv.rect(0, PAGE_H - 9*mm, PAGE_W, 9*mm, fill=1, stroke=0)
        canv.setFillColor(ORO)
        canv.rect(0, PAGE_H - 12*mm, PAGE_W, 3*mm, fill=1, stroke=0)
        canv.setFillColor(ROJO)
        canv.rect(0, 0, PAGE_W, 9*mm, fill=1, stroke=0)
        canv.setFillColor(ORO)
        canv.rect(0, 9*mm, PAGE_W, 3*mm, fill=1, stroke=0)
        canv.setFillColor(GRIS)
        canv.setFont('Helvetica', 7)
        canv.drawString(MARGIN, 4*mm, "UACM · Documento oficial — No válido sin sello")
        canv.setFillColor(ORO)
        canv.drawRightString(PAGE_W - MARGIN, 4*mm,
                             f"{folio_ref} · {fecha_str} · Pág. {doc.page}")
        canv.restoreState()
    return _draw


# ── Función principal ─────────────────────────────────────────────────────────

def generar_pdf_solicitud(sol, productos):
    """
    Recibe la fila de cabecera (sol) y las filas de productos,
    y devuelve un HttpResponse con el PDF generado.
    """
    id_sol      = sol[0]
    almacen     = sol[2] or "—"
    fecha_dt    = sol[3]
    matricula   = sol[4] or "N/A"
    solicitante = (sol[5] or "").strip() or "N/A"
    cargo       = sol[7] or "N/A"
    estatus     = sol[8] or "SOLICITADA"
    obs         = (sol[9] or "").strip() or "Sin observaciones"

    fecha_str = fecha_dt.strftime("%d/%m/%Y")
    hora_str  = fecha_dt.strftime("%H:%M")
    folio_str = f"#{str(id_sol).zfill(5)}"
    folio_ref = f"FOLIO-{str(id_sol).zfill(5)}"

    color_estatus = STATUS_COLOR.get(estatus, GRIS)

    # ── Estilos ───────────────────────────────────────────────────────────────
    s_uni   = _sty('uni',   fontSize=13, fontName='Helvetica-Bold',    textColor=NEGRO,  leading=16)
    s_title = _sty('title', fontSize=20, fontName='Helvetica-Bold',    textColor=ROJO,   alignment=TA_CENTER, leading=26)
    s_sub   = _sty('sub',   fontSize=9,  fontName='Helvetica',         textColor=GRIS,   alignment=TA_CENTER, leading=13)
    s_sec   = _sty('sec',   fontSize=10, fontName='Helvetica-Bold',    textColor=ROJO,   leading=14)
    s_label = _sty('lbl',   fontSize=7,  fontName='Helvetica-Bold',    textColor=GRIS,   leading=10, spaceAfter=1)
    s_val   = _sty('val',   fontSize=11, fontName='Helvetica',         textColor=NEGRO,  leading=15)
    s_folio = _sty('fol',   fontSize=22, fontName='Helvetica-Bold',    textColor=ROJO,   leading=26)
    s_fecha = _sty('fec',   fontSize=11, fontName='Helvetica',         textColor=NEGRO,  leading=15)
    s_estat = _sty('est',   fontSize=12, fontName='Helvetica-Bold',    textColor=color_estatus, leading=16)
    s_obs   = _sty('obs',   fontSize=11, fontName='Helvetica-Oblique', textColor=GRIS,   leading=15)
    s_th    = _sty('th',    fontSize=9,  fontName='Helvetica-Bold',    textColor=BLANCO, leading=12)
    s_td    = _sty('td',    fontSize=9,  fontName='Helvetica',         textColor=NEGRO,  leading=12)
    s_td_r  = _sty('tdr',  fontSize=9,  fontName='Helvetica-Bold',    textColor=ROJO,   alignment=TA_RIGHT, leading=12)
    s_sign  = _sty('sgn',  fontSize=9,  fontName='Helvetica',         textColor=NEGRO,  alignment=TA_CENTER, leading=13)
    s_tot   = _sty('tot',  fontSize=9,  fontName='Helvetica-Bold',    textColor=NEGRO,  alignment=TA_RIGHT,  leading=12)

    def dato(label, valor, italic=False):
        return [Paragraph(label, s_label), Paragraph(str(valor), s_obs if italic else s_val)]

    # ── Logo ──────────────────────────────────────────────────────────────────
    logo_path = os.path.join(
        settings.BASE_DIR, 'frontend_uacm', 'public', 'media', 'logouacm.jpg'
    )

    # ── Story ─────────────────────────────────────────────────────────────────
    story = []

    # Encabezado
    if os.path.exists(logo_path):
        img = Image(_make_circular_logo(logo_path), width=2*cm, height=2*cm)
        header_data = [[img, Paragraph("Universidad Autónoma de la Ciudad de México", s_uni)]]
    else:
        header_data = [['', Paragraph("Universidad Autónoma de la Ciudad de México", s_uni)]]

    header_tbl = Table(header_data, colWidths=[2.4*cm, None])
    header_tbl.setStyle(TableStyle([
        ('VALIGN',       (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING',  (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING',(0, 0), (-1, -1), 6),
    ]))
    story.append(header_tbl)
    story.append(HRFlowable(width="100%", thickness=1, color=GRIS, spaceAfter=10))

    # Título
    story.append(Paragraph("Solicitud de Artículos", s_title))
    story.append(Paragraph("Formato Oficial · Control Interno", s_sub))
    story.append(HRFlowable(width="100%", thickness=0.5, color=GRIS, spaceBefore=8, spaceAfter=10))

    # Caja Folio / Fecha / Estatus
    info_tbl = Table([[
        [Paragraph("NÚMERO DE FOLIO", s_label), Paragraph(folio_str, s_folio)],
        [Paragraph("FECHA Y HORA",    s_label), Paragraph(f"{fecha_str} · {hora_str}", s_fecha)],
        [Paragraph("ESTATUS",         s_label), Paragraph(estatus, s_estat)],
    ]], colWidths=[5*cm, 7*cm, None])
    info_tbl.setStyle(TableStyle([
        ('BOX',           (0, 0), (-1, -1), 0.8, colors.HexColor('#DDDDDD')),
        ('INNERGRID',     (0, 0), (-1, -1), 0.5, colors.HexColor('#DDDDDD')),
        ('BACKGROUND',    (0, 0), (-1, -1), FONDO),
        ('VALIGN',        (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING',    (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('LEFTPADDING',   (0, 0), (-1, -1), 12),
        ('LINEAFTER',     (1, 0), (1, 0),   3, color_estatus),
    ]))
    story.append(info_tbl)
    story.append(Spacer(1, 14))

    # Datos del solicitante
    story.append(Paragraph("Datos del Solicitante", s_sec))
    story.append(Spacer(1, 6))
    sol_tbl = Table([
        [dato("MATRÍCULA",      matricula),   dato("ALMACÉN DESTINO",   almacen)],
        [dato("NOMBRE COMPLETO",solicitante), dato("FECHA DE SOLICITUD",f"{fecha_str} · {hora_str}")],
        [dato("CARGO",          cargo),       dato("OBSERVACIONES",     obs, italic=True)],
    ], colWidths=[None, None])
    sol_tbl.setStyle(TableStyle([
        ('BOX',           (0, 0), (-1, -1), 0.8, colors.HexColor('#DDDDDD')),
        ('INNERGRID',     (0, 0), (-1, -1), 0.5, colors.HexColor('#DDDDDD')),
        ('BACKGROUND',    (0, 0), (-1, -1), FONDO),
        ('VALIGN',        (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING',    (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING',   (0, 0), (-1, -1), 12),
    ]))
    story.append(sol_tbl)

    # ── Página 2: Productos ───────────────────────────────────────────────────
    story.append(PageBreak())
    story.append(Paragraph("Productos Solicitados", s_sec))
    story.append(Spacer(1, 6))

    prod_data = [[
        Paragraph("#",                        s_th),
        Paragraph("Clave",                    s_th),
        Paragraph("Descripción del Artículo", s_th),
        Paragraph("Cantidad",                 s_th),
    ]]
    total_items = 0
    for i, p in enumerate(productos, 1):
        total_items += p[2]
        prod_data.append([
            Paragraph(f"{i:02d}", s_td),
            Paragraph(str(p[0]), s_td),
            Paragraph(str(p[1]), s_td),
            Paragraph(str(p[2]), s_td_r),
        ])
    prod_data.append([
        Paragraph("", s_td),
        Paragraph("", s_td),
        Paragraph("Total de artículos solicitados", s_tot),
        Paragraph(str(total_items), s_td_r),
    ])

    n = len(prod_data)
    prod_tbl = Table(prod_data, colWidths=[1.2*cm, 2*cm, None, 2.2*cm])
    prod_tbl.setStyle(TableStyle([
        ('BACKGROUND',    (0, 0), (-1, 0),   ROJO),
        ('TOPPADDING',    (0, 0), (-1, 0),   8),
        ('BOTTOMPADDING', (0, 0), (-1, 0),   8),
        ('ROWBACKGROUNDS',(0, 1), (-1, n-2), [BLANCO, FONDO]),
        ('BACKGROUND',    (0, n-1), (-1, n-1), colors.HexColor('#FDF3DC')),
        ('LINEABOVE',     (0, n-1), (-1, n-1), 0.5, ORO),
        ('BOX',           (0, 0), (-1, -1),  0.8, colors.HexColor('#DDDDDD')),
        ('INNERGRID',     (0, 0), (-1, -1),  0.3, colors.HexColor('#EEEEEE')),
        ('VALIGN',        (0, 0), (-1, -1),  'MIDDLE'),
        ('TOPPADDING',    (0, 1), (-1, -1),  7),
        ('BOTTOMPADDING', (0, 1), (-1, -1),  7),
        ('LEFTPADDING',   (0, 0), (-1, -1),  8),
        ('RIGHTPADDING',  (-1,0), (-1, -1),  8),
        ('ALIGN',         (-1, 0), (-1, -1), 'RIGHT'),
    ]))
    story.append(prod_tbl)
    story.append(Spacer(1, 2.5*cm))

    # Firmas
    firma_line = HRFlowable(width="80%", thickness=0.7, color=NEGRO)
    story.append(Table(
        [[firma_line, '', firma_line]],
        colWidths=[6*cm, None, 6*cm],
        style=[('VALIGN', (0, 0), (-1, -1), 'BOTTOM')],
    ))
    story.append(Spacer(1, 4))
    story.append(Table(
        [[Paragraph("Firma del Solicitante", s_sign), '', Paragraph("Encargado de Almacén", s_sign)]],
        colWidths=[6*cm, None, 6*cm],
    ))

    # ── Construir PDF ─────────────────────────────────────────────────────────
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=letter,
        rightMargin=MARGIN, leftMargin=MARGIN,
        topMargin=2.5*cm, bottomMargin=1.8*cm,
        title=f"Solicitud {folio_ref}", author="UACM",
    )
    decorator = _decorate_page(folio_ref, fecha_str)
    doc.build(story, onFirstPage=decorator, onLaterPages=decorator)

    pdf = buffer.getvalue()
    buffer.close()
    response = HttpResponse(pdf, content_type='application/pdf')
    response['Content-Disposition'] = f'inline; filename="solicitud_{folio_ref}.pdf"'
    return response
