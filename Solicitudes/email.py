from django.core.mail import EmailMessage
from django.conf import settings


def enviar_correo_solicitud(sol, productos, pdf_bytes):
    """
    Envía el PDF de la solicitud al almacén central con copia al encargado.

    sol       — fila de sp_cabecera_solicitud
    productos — filas de sp_productos_solicitud
    pdf_bytes — bytes del PDF generado
    """
    id_sol      = sol[0]
    almacen     = sol[2] or "Almacén Central"
    fecha_dt    = sol[3]
    solicitante = (sol[5] or "").strip() or "N/A"
    cargo       = sol[7] or "N/A"
    correo_encargado = sol[10] if len(sol) > 10 else None

    folio_ref = f"FOLIO-{str(id_sol).zfill(5)}"
    fecha_str = fecha_dt.strftime("%d/%m/%Y %H:%M")

    destinatario  = settings.EMAIL_ALMACEN_CENTRAL
    if not destinatario:
        raise ValueError("EMAIL_ALMACEN_CENTRAL no está configurado en .env")
    remitente     = settings.EMAIL_FROM
    copia         = [correo_encargado] if correo_encargado else []

    asunto = f"Solicitud de reabastecimiento {folio_ref} — {almacen}"

    lista_productos = "\n".join(
        f"  • {p[1]} — Cantidad: {p[2]}" for p in productos
    )

    cuerpo = f"""Estimado equipo del Almacén Central,

Se ha generado una solicitud de reabastecimiento con los siguientes datos:

Folio:        {folio_ref}
Fecha:        {fecha_str}
Solicitante:  {solicitante}
Cargo:        {cargo}
Almacén:      {almacen}

Productos solicitados:
{lista_productos}

Se adjunta el documento oficial en formato PDF.

——
Sistema de Gestión UACM
"""

    correo = EmailMessage(
        subject=asunto,
        body=cuerpo,
        from_email=remitente,
        to=[destinatario],
        cc=copia,
        reply_to=[correo_encargado] if correo_encargado else [],
    )
    correo.attach(f"solicitud_{folio_ref}.pdf", pdf_bytes, "application/pdf")
    correo.send(fail_silently=False)
