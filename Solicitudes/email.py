from django.core.mail import EmailMessage
from django.conf import settings


def enviar_correo_solicitud(sol, productos, pdf_bytes):
    """
    Envía el PDF de la solicitud al almacén central con copia al encargado.

    sol       — fila de sp_cabecera_solicitud
    productos — filas de sp_productos_solicitud
    pdf_bytes — bytes del PDF generado
    """
    id_sol      = sol['id_solicitud']
    almacen     = sol['tipo_almacen'] or "Almacén Central"
    fecha_dt    = sol['fecha_solicitud']
    solicitante = (sol['nombre'] or "").strip() or "N/A"
    cargo       = sol['nombre_rol'] or "N/A"
    correo_encargado = sol.get('correo_encargado')

    folio_ref = f"FOLIO-{str(id_sol).zfill(5)}"
    fecha_str = fecha_dt.strftime("%d/%m/%Y %H:%M")

    destinatario  = settings.EMAIL_ALMACEN_CENTRAL
    if not destinatario:
        raise ValueError("EMAIL_ALMACEN_CENTRAL no está configurado en .env")
    remitente     = settings.EMAIL_FROM
    copia         = [correo_encargado] if correo_encargado else []

    asunto = f"Solicitud de reabastecimiento {folio_ref} — {almacen}"

    lista_productos = "\n".join(
        f"  • {p['nombre_producto']} — Cantidad: {p['cantidad']}" for p in productos
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


def enviar_correo_entrega_parcial(sol, faltantes, id_solicitud_nueva, correo_encargado=None):
    """
    Notifica a almacén central que la entrega fue parcial e indica
    qué productos faltaron y el folio de la solicitud de seguimiento.

    sol               — fila de sp_cabecera_solicitud de la solicitud original
    faltantes         — lista de (id_prod, nombre, solicitado, recibido, faltante)
    id_solicitud_nueva — ID de la solicitud de seguimiento generada
    correo_encargado  — correo del encargado que registró la recepción
    """
    id_sol      = sol['id_solicitud']
    almacen     = sol['tipo_almacen'] or "Almacén"
    fecha_dt    = sol['fecha_solicitud']
    solicitante = (sol['nombre'] or "").strip() or "N/A"

    folio_orig  = f"FOLIO-{str(id_sol).zfill(5)}"
    folio_nuevo = f"FOLIO-{str(id_solicitud_nueva).zfill(5)}"
    fecha_str   = fecha_dt.strftime("%d/%m/%Y %H:%M")

    destinatario = settings.EMAIL_ALMACEN_CENTRAL
    if not destinatario:
        raise ValueError("EMAIL_ALMACEN_CENTRAL no está configurado en .env")

    copia  = [correo_encargado] if correo_encargado else []
    asunto = f"Entrega parcial {folio_orig} — se requiere seguimiento {folio_nuevo}"

    tabla_faltantes = "\n".join(
        f"  • {f[1]:<35} Solicitado: {f[2]:>4}  Recibido: {f[3]:>4}  Faltante: {f[4]:>4}"
        for f in faltantes
    )

    cuerpo = f"""Estimado equipo del Almacén Central,

La solicitud {folio_orig} generada el {fecha_str} por {solicitante} ({almacen})
fue registrada con entrega PARCIAL. Los siguientes artículos no llegaron completos:

{tabla_faltantes}

Se ha generado automáticamente la solicitud de seguimiento {folio_nuevo}
con las cantidades faltantes para que puedan procesar el envío pendiente.

——
Sistema de Gestión UACM
"""

    correo = EmailMessage(
        subject=asunto,
        body=cuerpo,
        from_email=settings.EMAIL_FROM,
        to=[destinatario],
        cc=copia,
        reply_to=[correo_encargado] if correo_encargado else [],
    )
    correo.send(fail_silently=False)
