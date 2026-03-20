from django.http import JsonResponse, HttpResponse
from django.shortcuts import render
from django.db import connection
from django.contrib.auth.decorators import login_required
from SistemaUACM.models import Almacen, Rol, Personal
from GestiondeProductos.models import Producto
import json
import re
import traceback


@login_required
def solicitud(request):
    return render(request, 'solicitud.html')


def _parse_sp_error(e):
    """Extrae el mensaje de texto de un error SIGNAL de MySQL."""
    match = re.search(r"'([^']+)'", str(e))
    return match.group(1) if match else str(e)


@login_required
def datos_solicitud(request):
    """API endpoint para React: catálogos e info de usuario"""
    productos = Producto.objects.select_related('estatus').all()
    roles     = Rol.objects.all()
    almacenes = Almacen.objects.select_related("id_talmacen").all()
    user_role = request.user.groups.first().name if request.user.groups.exists() else 'Usuario'

    try:
        persona = Personal.objects.get(correo=request.user.username)
        persona_nombre = f"{persona.nombre_personal} {persona.apellido_paterno}"
    except Personal.DoesNotExist:
        persona_nombre = request.user.username

    return JsonResponse({
        'persona_nombre': persona_nombre,
        'user_role':      user_role,
        'almacenes': [
            {'id_almacen': a.id_almacen, 'tipo_almacen': a.id_talmacen.tipo_almacen}
            for a in almacenes
        ],
        'productos': [
            {'id_producto': p.id_producto, 'nombre_producto': p.nombre_producto,
             'cantidad': p.cantidad, 'id_estatus': p.estatus.id_estatus}
            for p in productos
        ],
        'roles': [
            {'id_rol': r.id_rol, 'nombre_rol': r.nombre_rol}
            for r in roles
        ],
    })


@login_required
def crear_solicitud(request):
    if request.method != "POST":
        return JsonResponse({"error": "Método no permitido"}, status=405)

    try:
        data = json.loads(request.body)

        with connection.cursor() as cursor:
            cursor.callproc("sp_crear_solicitud", [
                data["id_almacen"],
                data.get("id_personal") or None,
                data.get("observaciones_solicitud") or None,
                json.dumps(data["productos"]),
            ])
            id_solicitud = cursor.fetchone()[0]

        with connection.cursor() as cursor:
            cursor.callproc("sp_cabecera_solicitud", [id_solicitud])
            sol = cursor.fetchone()
        with connection.cursor() as cursor:
            cursor.callproc("sp_productos_solicitud", [id_solicitud])
            productos = cursor.fetchall()

        return JsonResponse({
            "status": "success",
            "solicitud": {
                "id_solicitud":   sol[0],
                "id_almacen":     sol[1],
                "fecha_creacion": sol[3].strftime("%Y-%m-%d %H:%M"),
                "matricula":      sol[4] or "N/A",
                "solicitante":    (sol[5] or "").strip() or "N/A",
                "cargo":          sol[7] or "N/A",
                "estatus":        sol[8],
                "productos": [
                    {"id_producto": p[0], "nombre": p[1], "cantidad": p[2]}
                    for p in productos
                ],
            }
        })

    except Exception as e:
        print("[ERROR crear_solicitud]", traceback.format_exc())
        return JsonResponse({"status": "error", "message": _parse_sp_error(e)}, status=400)


@login_required
def buscar_solicitud(request, solicitud_id):
    try:
        with connection.cursor() as cursor:
            cursor.callproc("sp_cabecera_solicitud", [solicitud_id])
            sol = cursor.fetchone()

        if not sol:
            return JsonResponse({"error": "Solicitud no encontrada"}, status=404)

        with connection.cursor() as cursor:
            cursor.callproc("sp_productos_solicitud", [solicitud_id])
            productos = cursor.fetchall()

        return JsonResponse({
            "status": "success",
            "solicitud": {
                "id_solicitud":   sol[0],
                "id_almacen":     sol[1],
                "almacen":        sol[2],
                "fecha_creacion": sol[3].strftime("%Y-%m-%d %H:%M"),
                "matricula":      sol[4] or "",
                "solicitante":    (sol[5] or "").strip() or "N/A",
                "id_rol":         sol[6] or "",
                "cargo":          sol[7] or "N/A",
                "estatus":        sol[8],
                "productos": [
                    {"id_producto": p[0], "nombre": p[1], "cantidad": p[2]}
                    for p in productos
                ],
            }
        })
    except Exception as e:
        print("[ERROR buscar_solicitud]", traceback.format_exc())
        return JsonResponse({"error": _parse_sp_error(e)}, status=400)


@login_required
def aprobar_solicitud(request, solicitud_id):
    if request.method != "POST":
        return JsonResponse({"error": "Método no permitido"}, status=405)

    try:
        with connection.cursor() as cursor:
            cursor.callproc("sp_aprobar_solicitud", [solicitud_id])
        return JsonResponse({"status": "success", "message": "Solicitud aprobada"})

    except Exception as e:
        print("[ERROR aprobar_solicitud]", traceback.format_exc())
        msg = _parse_sp_error(e)
        status = 404 if 'no encontrada' in msg else 400
        return JsonResponse({"error": msg}, status=status)


@login_required
def cancelar_solicitud(request, solicitud_id):
    if request.method != "POST":
        return JsonResponse({"error": "Método no permitido"}, status=405)

    try:
        with connection.cursor() as cursor:
            cursor.callproc("sp_cancelar_solicitud", [solicitud_id])
        return JsonResponse({"status": "success", "message": "Solicitud cancelada"})

    except Exception as e:
        print("[ERROR cancelar_solicitud]", traceback.format_exc())
        msg = _parse_sp_error(e)
        status = 404 if 'no encontrada' in msg else 400
        return JsonResponse({"error": msg}, status=status)


@login_required
def alertas_stock(request):
    """Devuelve productos activos con cantidad < stock_minimo"""
    productos = Producto.objects.select_related('estatus').filter(
        estatus__id_estatus=1,       # solo Activo
        stock_minimo__gt=0,
    )
    bajos = [
        {
            'id_producto':    p.id_producto,
            'nombre_producto': p.nombre_producto,
            'cantidad':       p.cantidad,
            'stock_minimo':   p.stock_minimo,
            'faltante':       p.stock_minimo - p.cantidad,
        }
        for p in productos if p.cantidad < p.stock_minimo
    ]
    return JsonResponse({'alertas': bajos})


@login_required
def buscar_personal_qr(request):
    qr_data = request.GET.get('qr_data', '').strip()
    numeros = re.findall(r'\d+', qr_data)
    if not numeros:
        return JsonResponse({'error': 'No se encontró un ID válido en el QR'}, status=400)
    id_personal = numeros[-1]
    try:
        personal = Personal.objects.select_related('id_rol').get(id_personal=id_personal)
        nombre_completo = f"{personal.nombre_personal} {personal.apellido_paterno}"
        if personal.apellido_materno:
            nombre_completo += f" {personal.apellido_materno}"
        return JsonResponse({
            'matricula': personal.id_personal,
            'nombre':    nombre_completo,
            'id_rol':    personal.id_rol.id_rol,
            'cargo':     personal.id_rol.nombre_rol,
        })
    except Personal.DoesNotExist:
        return JsonResponse({'error': 'Personal no encontrado'}, status=404)

@login_required
def exportar_pdf(request, solicitud_id):
    from .pdf import generar_pdf_solicitud
    try:
        with connection.cursor() as cursor:
            cursor.callproc("sp_cabecera_solicitud", [solicitud_id])
            sol = cursor.fetchone()
        if not sol:
            return HttpResponse("Solicitud no encontrada", status=404)
        with connection.cursor() as cursor:
            cursor.callproc("sp_productos_solicitud", [solicitud_id])
            productos = cursor.fetchall()
    except Exception as e:
        return HttpResponse(f"Error: {e}", status=400)

    return generar_pdf_solicitud(sol, productos)
