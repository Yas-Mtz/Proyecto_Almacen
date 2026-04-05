from django.http import JsonResponse, HttpResponse
from django.shortcuts import render
from django.db import connection
from django.contrib.auth.decorators import login_required
from SistemaUACM.models import Almacen, Rol, Personal, TipoAlmacen, Estatus
from GestiondeProductos.models import Producto
from .models import LimiteSolicitud
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


def _ids_almacen_central():
    """Devuelve la lista de id_almacen cuyo tipo_almacen es Central."""
    tipos = TipoAlmacen.objects.filter(tipo_almacen__icontains='central')
    return list(Almacen.objects.filter(id_talmacen__in=tipos).values_list('id_almacen', flat=True))


def _id_estatus_activo():
    """Devuelve el id_estatus del estatus de producto 'Activo'."""
    try:
        return Estatus.objects.get(nombre_estatus='Activo').id_estatus
    except Estatus.DoesNotExist:
        return None


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
        'persona_nombre':    persona_nombre,
        'user_role':         user_role,
        'id_estatus_activo': _id_estatus_activo(),
        'ids_almacen_central': _ids_almacen_central(),
        'almacenes': [
            {'id_almacen': a.id_almacen, 'tipo_almacen': a.id_talmacen.tipo_almacen}
            for a in almacenes
        ],
        'productos': [
            {'id_producto': p.id_producto, 'nombre_producto': p.nombre_producto,
             'cantidad': p.cantidad, 'id_estatus': p.estatus.id_estatus if p.estatus else None,
             'nombre_estatus': p.estatus.nombre_estatus if p.estatus else ''}
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

        # ── Enviar correo si es encargado y destino es almacén central ──────
        es_encargado  = 'encargado' in (sol[7] or '').lower()
        es_central    = sol[1] in _ids_almacen_central()
        if es_encargado and es_central:
            try:
                from .pdf import generar_pdf_solicitud
                from .email import enviar_correo_solicitud
                correo_encargado = request.user.username  # el username es el correo
                # Construir tupla extendida con correo para email.py
                sol_con_correo = sol + (correo_encargado,)
                pdf_response = generar_pdf_solicitud(sol, productos)
                pdf_bytes = pdf_response.content
                enviar_correo_solicitud(sol_con_correo, productos, pdf_bytes)
            except Exception:
                print("[WARN] No se pudo enviar el correo:", traceback.format_exc())

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

        try:
            persona = Personal.objects.get(correo=request.user.username)
            id_aprobador = persona.id_personal
        except Personal.DoesNotExist:
            id_aprobador = None

        with connection.cursor() as cursor:
            cursor.callproc("sp_registrar_gestion", [solicitud_id, id_aprobador])

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

        try:
            persona = Personal.objects.get(correo=request.user.username)
            id_gestor = persona.id_personal
        except Personal.DoesNotExist:
            id_gestor = None

        with connection.cursor() as cursor:
            cursor.callproc("sp_registrar_gestion", [solicitud_id, id_gestor])

        return JsonResponse({"status": "success", "message": "Solicitud cancelada"})

    except Exception as e:
        print("[ERROR cancelar_solicitud]", traceback.format_exc())
        msg = _parse_sp_error(e)
        status = 404 if 'no encontrada' in msg else 400
        return JsonResponse({"error": msg}, status=status)


@login_required
def registrar_recepcion(request, solicitud_id):
    if request.method != "POST":
        return JsonResponse({"error": "Método no permitido"}, status=405)
    try:
        data = json.loads(request.body)
        productos = data.get("productos", [])
        if not productos:
            return JsonResponse({"error": "Se requieren los productos recibidos"}, status=400)

        with connection.cursor() as cursor:
            cursor.callproc("sp_registrar_recepcion", [solicitud_id, json.dumps(productos)])
            row = cursor.fetchone()

        id_solicitud_nueva = row[0] if row else 0

        # Si hubo entrega parcial, enviar correo a central
        if id_solicitud_nueva:
            try:
                from .email import enviar_correo_entrega_parcial
                with connection.cursor() as cursor:
                    cursor.callproc("sp_cabecera_solicitud", [solicitud_id])
                    sol = cursor.fetchone()
                with connection.cursor() as cursor:
                    cursor.callproc("sp_productos_solicitud", [solicitud_id])
                    prods_orig = cursor.fetchall()

                # Calcular faltantes: (id, nombre, solicitado, recibido, faltante)
                recibidos = {str(p['id_producto']): p['cantidad_recibida'] for p in productos}
                faltantes = [
                    (p[0], p[1], p[2], recibidos.get(str(p[0]), 0), p[2] - recibidos.get(str(p[0]), 0))
                    for p in prods_orig
                    if p[2] - recibidos.get(str(p[0]), 0) > 0
                ]
                correo_encargado = request.user.username
                enviar_correo_entrega_parcial(sol, faltantes, id_solicitud_nueva, correo_encargado)
            except Exception:
                print("[WARN] No se pudo enviar correo de entrega parcial:", traceback.format_exc())

        return JsonResponse({
            "status": "success",
            "message": "Recepción registrada",
            "id_solicitud_nueva": id_solicitud_nueva,
        })
    except Exception as e:
        print("[ERROR registrar_recepcion]", traceback.format_exc())
        return JsonResponse({"error": _parse_sp_error(e)}, status=400)


@login_required
def alertas_stock(request):
    """Devuelve productos con cantidad < stock_minimo, sin depender de nombres de estatus."""
    bajos = []
    for p in Producto.objects.filter(stock_minimo__gt=0):
        if p.cantidad < p.stock_minimo:
            bajos.append({
                'id_producto':     p.id_producto,
                'nombre_producto': p.nombre_producto,
                'cantidad':        p.cantidad,
                'stock_minimo':    p.stock_minimo,
                'faltante':        p.stock_minimo - p.cantidad,
            })
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
        with connection.cursor() as cursor:
            cursor.callproc("sp_datos_gestion", [solicitud_id])
            gestion = cursor.fetchone()
    except Exception as e:
        return HttpResponse(f"Error: {e}", status=400)

    if gestion and gestion[1]:
        fecha_gestion = gestion[0]
        nombre_gestor = f"{gestion[2]} {gestion[3]}"
        if gestion[4]:
            nombre_gestor += f" {gestion[4]}"
        gestor = {
            'id':     gestion[1],
            'nombre': nombre_gestor,
            'cargo':  gestion[5] or '—',
        }
    else:
        fecha_gestion = None
        gestor = None

    return generar_pdf_solicitud(sol, productos, gestor, fecha_gestion)


@login_required
def limites_solicitud(request):
    """GET: lista límites. POST: crea/actualiza. DELETE: elimina."""
    if request.method == 'GET':
        limites = LimiteSolicitud.objects.select_related('id_producto').all()
        return JsonResponse({'limites': [
            {
                'id_limite':       l.id_limite,
                'id_producto':     l.id_producto.id_producto,
                'nombre_producto': l.id_producto.nombre_producto,
                'cantidad_maxima': l.cantidad_maxima,
                'periodo':         l.periodo,
            }
            for l in limites
        ]})

    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            id_producto     = data['id_producto']
            cantidad_maxima = int(data['cantidad_maxima'])
            periodo         = data.get('periodo', 'diario')
            if cantidad_maxima <= 0:
                return JsonResponse({'error': 'La cantidad máxima debe ser mayor a 0'}, status=400)
            producto = Producto.objects.get(id_producto=id_producto)
            limite, created = LimiteSolicitud.objects.update_or_create(
                id_producto=producto,
                defaults={'cantidad_maxima': cantidad_maxima, 'periodo': periodo},
            )
            return JsonResponse({
                'status': 'success',
                'id_limite':       limite.id_limite,
                'nombre_producto': producto.nombre_producto,
                'cantidad_maxima': limite.cantidad_maxima,
                'periodo':         limite.periodo,
                'created':         created,
            })
        except Producto.DoesNotExist:
            return JsonResponse({'error': 'Producto no encontrado'}, status=404)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)

    if request.method == 'DELETE':
        try:
            data = json.loads(request.body)
            LimiteSolicitud.objects.filter(id_limite=data['id_limite']).delete()
            return JsonResponse({'status': 'success'})
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)

    return JsonResponse({'error': 'Método no permitido'}, status=405)
