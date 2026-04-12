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
    Flowable, HRFlowable, Image, PageBreak, Paragraph,
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
    'SOLICITADA':     colors.HexColor('#C9A84C'),
    'APROBADA':       colors.HexColor('#28a745'),
    'CANCELADA':      colors.HexColor('#dc3545'),
    'ENTREGA_PARCIAL': colors.HexColor('#fd7e14'),
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



def _decorate_page(folio_ref, fecha_str, gest_info=None, ultima_pag_flag=None):
    """Devuelve la función de decoración de página (barras + footer + recuadro gestión)."""
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

        # Recuadro de gestión solo en la última página
        if gest_info and ultima_pag_flag and ultima_pag_flag[0] == doc.page:
            color_g = gest_info['color']
            fondo_g = gest_info['fondo']
            texto   = gest_info['texto']
            titulo  = gest_info['titulo']

            bx = MARGIN
            bw = PAGE_W - 2 * MARGIN
            # Fila de título: 18pt alto, fila de texto: 22pt alto
            ty = 1.5 * cm   # Y base (sobre las barras del footer)
            th = 18          # altura título
            dh = 22          # altura datos

            # Fondo título
            canv.setFillColor(color_g)
            canv.rect(bx, ty + dh, bw, th, fill=1, stroke=0)
            # Fondo datos
            canv.setFillColor(fondo_g)
            canv.rect(bx, ty, bw, dh, fill=1, stroke=0)
            # Borde exterior
            canv.setStrokeColor(color_g)
            canv.setLineWidth(0.8)
            canv.rect(bx, ty, bw, th + dh, fill=0, stroke=1)

            # Texto título
            canv.setFillColor(colors.white)
            canv.setFont('Helvetica-Bold', 8)
            canv.drawString(bx + 10, ty + dh + 5, titulo)

            # Texto datos
            canv.setFillColor(colors.HexColor('#1a1a1a'))
            canv.setFont('Helvetica', 8.5)
            canv.drawString(bx + 10, ty + 7, texto)

        canv.restoreState()
    return _draw


# ── Función principal ─────────────────────────────────────────────────────────

def generar_pdf_solicitud(sol, productos, aprobador=None, fecha_aprobacion=None):
    """
    Recibe la fila de cabecera (sol) y las filas de productos,
    y devuelve un HttpResponse con el PDF generado.
    """
    id_sol      = sol['id_solicitud']
    almacen     = sol['tipo_almacen'] or "—"
    fecha_dt    = sol['fecha_solicitud']
    matricula   = sol['id_personal'] or "N/A"
    solicitante = (sol['nombre'] or "").strip() or "N/A"
    cargo       = sol['nombre_rol'] or "N/A"
    estatus     = sol['nombre_estatus'] or "SOLICITADA"
    obs         = (sol['observaciones_solicitud'] or "").strip() or "Sin observaciones"

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
    s_tot   = _sty('tot',  fontSize=9,  fontName='Helvetica-Bold',    textColor=NEGRO,  alignment=TA_RIGHT,  leading=12)

    # Estilos para columna de estado en tabla de productos
    _con_estado = estatus in ('APROBADA', 'CANCELADA')
    _parcial    = estatus == 'ENTREGA_PARCIAL'
    if _con_estado:
        _icono    = '✓' if estatus == 'APROBADA' else '✗'
        _col_icon = colors.HexColor('#1a7a3c') if estatus == 'APROBADA' else colors.HexColor('#dc3545')
        _fondo_icon = colors.HexColor('#EAF7EE') if estatus == 'APROBADA' else colors.HexColor('#FDECEA')
        s_th_icon = _sty('th_ic', fontSize=10, fontName='Helvetica-Bold',
                          textColor=BLANCO, leading=12, alignment=TA_CENTER)
        s_td_icon = _sty('td_ic', fontSize=12, fontName='Helvetica-Bold',
                          textColor=_col_icon, leading=14, alignment=TA_CENTER)
    if _parcial:
        s_td_parcial = _sty('td_parc', fontSize=9, fontName='Helvetica-Bold',
                             textColor=colors.HexColor('#dc3545'), leading=12, alignment=TA_CENTER)
        s_td_recibido = _sty('td_rec', fontSize=9, fontName='Helvetica-Bold',
                              textColor=colors.HexColor('#1a7a3c'), leading=12, alignment=TA_CENTER)

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

    if _parcial:
        _hdrs = ["#", "Clave", "Descripción del Artículo", "Solicitado", "Recibido"]
        _cols = [1.2*cm, 2*cm, None, 2.2*cm, 2.2*cm]
    else:
        _hdrs = ["#", "Clave", "Descripción del Artículo", "Cantidad"]
        _cols = [1.2*cm, 2*cm, None, 2.2*cm]
        if _con_estado:
            _hdrs.append(_icono)
            _cols.append(1.2*cm)

    prod_data = [[Paragraph(h, s_th) for h in _hdrs]]
    total_items = 0
    _filas_parciales = []  # índices de filas con entrega parcial (para resaltar)
    for i, p in enumerate(productos, 1):
        total_items += p['cantidad']
        cant_rec = p.get('cantidad_recibida')
        fila = [
            Paragraph(f"{i:02d}", s_td),
            Paragraph(str(p['id_producto']), s_td),
            Paragraph(str(p['nombre_producto']), s_td),
            Paragraph(str(p['cantidad']), s_td_r),
        ]
        if _parcial:
            es_parcial_fila = cant_rec is not None and cant_rec < p['cantidad']
            if es_parcial_fila:
                _filas_parciales.append(i)  # fila i+1 en prod_data (header es 0)
            fila[3] = Paragraph(str(p['cantidad']), s_td_parcial if es_parcial_fila else s_td_r)
            fila.append(Paragraph(str(cant_rec if cant_rec is not None else '—'), s_td_recibido))
        elif _con_estado:
            fila.append(Paragraph(_icono, s_td_icon))
        prod_data.append(fila)

    if _parcial:
        fila_tot = [
            Paragraph("", s_td), Paragraph("", s_td),
            Paragraph("Total de artículos solicitados", s_tot),
            Paragraph(str(total_items), s_td_r),
            Paragraph("", s_td),
        ]
    else:
        fila_tot = [
            Paragraph("", s_td), Paragraph("", s_td),
            Paragraph("Total de artículos solicitados", s_tot),
            Paragraph(str(total_items), s_td_r),
        ]
        if _con_estado:
            fila_tot.append(Paragraph("", s_td))
    prod_data.append(fila_tot)

    n = len(prod_data)
    prod_tbl = Table(prod_data, colWidths=_cols)
    _tbl_style = [
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
    ]
    if _con_estado:
        _tbl_style += [
            ('BACKGROUND',  (-1, 1), (-1, n-2), _fondo_icon),
            ('ALIGN',       (-1, 0), (-1, -1),  'CENTER'),
            ('TEXTCOLOR',   (-1, 0), (-1, 0),   BLANCO),
        ]
    if _parcial:
        # Resaltar filas con entrega parcial con fondo naranja suave
        for fi in _filas_parciales:
            _tbl_style.append(('BACKGROUND', (0, fi), (-1, fi), colors.HexColor('#FFF3E0')))
        _tbl_style += [
            ('ALIGN', (3, 0), (4, -1), 'CENTER'),
        ]
    prod_tbl.setStyle(TableStyle(_tbl_style))
    story.append(prod_tbl)
    story.append(Spacer(1, 0.6*cm))

    # Gestión (aprobación o cancelación)
    if aprobador:
        cancelada   = estatus == 'CANCELADA'
        ep          = estatus == 'ENTREGA_PARCIAL'
        if cancelada:
            COLOR_G = colors.HexColor('#dc3545')
            FONDO_G = colors.HexColor('#FFF5F5')
            titulo_g = "Cancelación de la Solicitud"
            accion   = "cancelada"
        elif ep:
            COLOR_G = colors.HexColor('#fd7e14')
            FONDO_G = colors.HexColor('#FFF8F0')
            titulo_g = "Aprobación y Recepción — Entrega Parcial"
            accion   = "aprobada"
        else:
            COLOR_G = colors.HexColor('#1a7a3c')
            FONDO_G = colors.HexColor('#F0FAF4')
            titulo_g = "Aprobación de la Solicitud"
            accion   = "aprobada"
        fecha_g_str = fecha_aprobacion.strftime("%d/%m/%Y a las %H:%M") if fecha_aprobacion else "—"
        nota_parcial = " Se registró una <b>entrega parcial</b> — algunos artículos no llegaron en su totalidad." if ep else ""
        texto_g     = (
            f"Esta solicitud fue <b>{accion}</b> por <b>{aprobador['nombre']}</b>"
            f" — Matrícula: {aprobador['id']}, Cargo: {aprobador['cargo']}"
            f" — el {fecha_g_str}.{nota_parcial}"
        )

        s_tit_g  = _sty('tit_g', fontSize=9,  fontName='Helvetica-Bold',
                         textColor=BLANCO, leading=13, spaceAfter=0)
        s_body_g = _sty('body_g', fontSize=9.5, fontName='Helvetica-Oblique',
                         textColor=colors.HexColor('#2a2a2a'), leading=15)

        recuadro = Table([
            [Paragraph(titulo_g, s_tit_g)],
            [Paragraph(texto_g,  s_body_g)],
        ], colWidths=[None])
        recuadro.setStyle(TableStyle([
            ('BACKGROUND',    (0, 0), (0, 0), COLOR_G),
            ('BACKGROUND',    (0, 1), (0, 1), FONDO_G),
            ('BOX',           (0, 0), (-1, -1), 0.8, COLOR_G),
            ('TOPPADDING',    (0, 0), (0, 0), 6),
            ('BOTTOMPADDING', (0, 0), (0, 0), 6),
            ('TOPPADDING',    (0, 1), (0, 1), 9),
            ('BOTTOMPADDING', (0, 1), (0, 1), 9),
            ('LEFTPADDING',   (0, 0), (-1, -1), 12),
            ('RIGHTPADDING',  (0, 0), (-1, -1), 12),
        ]))
        story.append(recuadro)

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
