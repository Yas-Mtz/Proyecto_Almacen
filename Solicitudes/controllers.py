from django.http import JsonResponse
from django.shortcuts import render
from django.db import connection
from django.contrib.auth.decorators import login_required
from SistemaUACM.models import Almacen, Rol, Personal
from GestiondeProductos.models import Producto
import json
import re

ESTATUS_SOL = {1: 'SOLICITADA', 2: 'APROBADA', 3: 'CANCELADA'}


@login_required
def solicitud(request):
    almacenes = Almacen.objects.select_related("id_talmacen").all()
    productos = Producto.objects.all()
    roles = Rol.objects.all()
    return render(request, "solicitud.html", {
        "almacenes": almacenes,
        "productos": productos,
        "roles": roles
    })


@login_required
def crear_solicitud(request):
    if request.method != "POST":
        return JsonResponse({"error": "Método no permitido"}, status=405)

    try:
        data = json.loads(request.body)

        id_personal = data.get("id_personal") or None
        observaciones = data.get("observaciones_solicitud") or None

        with connection.cursor() as cursor:
            cursor.callproc(
                "sp_crear_solicitud",
                [
                    data["id_almacen"],
                    id_personal,
                    observaciones,
                    json.dumps(data["productos"])
                ]
            )
            result = cursor.fetchone()
            id_solicitud = result[0]

        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT
                    s.id_solicitud,
                    ta.tipo_almacen,
                    s.fecha_solicitud,
                    s.observaciones_solicitud,
                    p.id_personal,
                    CONCAT(p.nombre_personal, ' ', p.apellido_paterno,
                           IFNULL(CONCAT(' ', p.apellido_materno), '')) AS nombre,
                    r.nombre_rol
                FROM solicitud s
                JOIN almacen a       ON a.id_almacen   = s.id_almacen
                JOIN tipo_almacen ta ON ta.id_talmacen = a.id_talmacen
                LEFT JOIN personal p ON p.id_personal  = s.id_personal
                LEFT JOIN rol r      ON r.id_rol        = p.id_rol
                WHERE s.id_solicitud = %s
            """, [id_solicitud])
            sol = cursor.fetchone()

            cursor.execute("""
                SELECT
                    p.id_producto,
                    p.nombre_producto,
                    d.cantidad
                FROM detalle_solicitud d
                JOIN producto p ON d.id_producto = p.id_producto
                WHERE d.id_solicitud = %s
            """, [id_solicitud])
            productos = cursor.fetchall()

        return JsonResponse({
            "status": "success",
            "solicitud": {
                "id_solicitud":  sol[0],
                "almacen":       sol[1],
                "fecha_creacion": sol[2].strftime("%Y-%m-%d %H:%M"),
                "matricula":     sol[4] or "N/A",
                "solicitante":   (sol[5] or "").strip() or "N/A",
                "cargo":         sol[6] or "N/A",
                "estatus":       "SOLICITADA",
                "productos": [
                    {"id_producto": p[0], "nombre": p[1], "cantidad": p[2]}
                    for p in productos
                ]
            }
        })

    except Exception as e:
        import traceback
        print("[ERROR crear_solicitud]", traceback.format_exc())
        return JsonResponse({"status": "error", "message": str(e)}, status=400)


@login_required
def buscar_solicitud(request, solicitud_id):
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT
                    s.id_solicitud,
                    a.id_almacen,
                    ta.tipo_almacen,
                    s.fecha_solicitud,
                    p.id_personal,
                    CONCAT(p.nombre_personal, ' ', p.apellido_paterno,
                           IFNULL(CONCAT(' ', p.apellido_materno), '')) AS nombre,
                    p.id_rol,
                    r.nombre_rol,
                    s.id_estatus
                FROM solicitud s
                JOIN almacen a       ON a.id_almacen   = s.id_almacen
                JOIN tipo_almacen ta ON ta.id_talmacen = a.id_talmacen
                LEFT JOIN personal p ON p.id_personal  = s.id_personal
                LEFT JOIN rol r      ON r.id_rol        = p.id_rol
                WHERE s.id_solicitud = %s
            """, [solicitud_id])
            sol = cursor.fetchone()

            if not sol:
                return JsonResponse({"error": "Solicitud no encontrada"}, status=404)

            cursor.execute("""
                SELECT p.id_producto, p.nombre_producto, d.cantidad
                FROM detalle_solicitud d
                JOIN producto p ON d.id_producto = p.id_producto
                WHERE d.id_solicitud = %s
            """, [solicitud_id])
            productos = cursor.fetchall()

        return JsonResponse({
            "status": "success",
            "solicitud": {
                "id_solicitud":  sol[0],
                "id_almacen":    sol[1],
                "almacen":       sol[2],
                "fecha_creacion": sol[3].strftime("%Y-%m-%d %H:%M"),
                "matricula":     sol[4] or "",
                "solicitante":   (sol[5] or "").strip() or "N/A",
                "id_rol":        sol[6] or "",
                "cargo":         sol[7] or "N/A",
                "estatus":       ESTATUS_SOL.get(sol[8], "SOLICITADA"),
                "productos": [
                    {"id_producto": p[0], "nombre": p[1], "cantidad": p[2]}
                    for p in productos
                ]
            }
        })
    except Exception as e:
        import traceback
        print("[ERROR buscar_solicitud]", traceback.format_exc())
        return JsonResponse({"error": str(e)}, status=400)


@login_required
def aprobar_solicitud(request, solicitud_id):
    if request.method != "POST":
        return JsonResponse({"error": "Método no permitido"}, status=405)

    try:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT id_estatus FROM solicitud WHERE id_solicitud = %s",
                [solicitud_id]
            )
            row = cursor.fetchone()
            if not row:
                return JsonResponse({"error": "Solicitud no encontrada"}, status=404)
            if row[0] != 1:
                return JsonResponse({"error": "Solo se pueden aprobar solicitudes en estado Solicitada"}, status=400)

            cursor.execute(
                "UPDATE solicitud SET id_estatus = 2 WHERE id_solicitud = %s",
                [solicitud_id]
            )

        return JsonResponse({"status": "success", "message": "Solicitud aprobada"})

    except Exception as e:
        import traceback
        print("[ERROR aprobar_solicitud]", traceback.format_exc())
        return JsonResponse({"error": str(e)}, status=400)


@login_required
def cancelar_solicitud(request, solicitud_id):
    if request.method != "POST":
        return JsonResponse({"error": "Método no permitido"}, status=405)

    try:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT id_estatus FROM solicitud WHERE id_solicitud = %s",
                [solicitud_id]
            )
            row = cursor.fetchone()
            if not row:
                return JsonResponse({"error": "Solicitud no encontrada"}, status=404)
            if row[0] != 1:
                return JsonResponse({"error": "La solicitud no puede cancelarse"}, status=400)

            # Restaurar stock
            cursor.execute("""
                UPDATE producto p
                JOIN detalle_solicitud d ON p.id_producto = d.id_producto
                SET p.cantidad = p.cantidad + d.cantidad
                WHERE d.id_solicitud = %s
            """, [solicitud_id])

            # Marcar como Inhabilitada (id_estatus=3)
            cursor.execute(
                "UPDATE solicitud SET id_estatus = 3 WHERE id_solicitud = %s",
                [solicitud_id]
            )

        return JsonResponse({"status": "success", "message": "Solicitud cancelada"})

    except Exception as e:
        import traceback
        print("[ERROR cancelar_solicitud]", traceback.format_exc())
        return JsonResponse({"error": str(e)}, status=400)


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
            'nombre': nombre_completo,
            'id_rol': personal.id_rol.id_rol,
            'cargo': personal.id_rol.nombre_rol
        })
    except Personal.DoesNotExist:
        return JsonResponse({'error': 'Personal no encontrado'}, status=404)
