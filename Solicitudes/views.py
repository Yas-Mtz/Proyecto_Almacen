from django.http import JsonResponse
from django.shortcuts import render
from django.db import connection
from django.contrib.auth.decorators import login_required
from SistemaUACM.models import Almacen
from .models import Producto
from SistemaUACM.models import Rol
import json


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

        with connection.cursor() as cursor:
            cursor.callproc(
                "sp_crear_solicitud",
                [
                    data["id_almacen"],
                    data.get("observaciones_solicitud", ""),
                    json.dumps(data["productos"])
                ]
            )

            result = cursor.fetchone()
            id_solicitud = result[0]

        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT 
                    s.id_solicitud,
                    a.id_almacen,
                    t.tipo_almacen,
                    s.fecha_solicitud,
                    s.observaciones_solicitud
                FROM solicitud s
                JOIN almacen a ON s.id_almacen = a.id_almacen
                JOIN tipo_almacen t ON a.id_talmacen = t.id_talmacen
                WHERE s.id_solicitud = %s
            """, [id_solicitud])

            sol = cursor.fetchone()

            datos_solicitante = {}
            try:
                datos_solicitante = json.loads(sol[4]) if sol[4] else {}
            except Exception:
                datos_solicitante = {}

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
                "id_solicitud": sol[0],
                "almacen": sol[2],
                "fecha_creacion": sol[3].strftime("%Y-%m-%d %H:%M"),
                "solicitante": datos_solicitante.get("nombre", "N/A"),
                "matricula": datos_solicitante.get("matricula", "N/A"),
                "cargo": datos_solicitante.get("cargo", "N/A"),
                "estatus": "SOLICITADA",
                "productos": [
                    {
                        "id_producto": p[0],
                        "nombre": p[1],
                        "cantidad": p[2]
                    }
                    for p in productos
                ]
            }
        })

    except Exception as e:
        return JsonResponse({
            "status": "error",
            "message": str(e)
        }, status=400)
