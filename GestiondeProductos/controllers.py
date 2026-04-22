import json
import logging

from django.shortcuts import render, redirect
from django.http import JsonResponse, HttpResponse
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt

from .command import (
    AgregarProductoCommand, ActualizarProductoCommand,
    generar_qr_temp, cambiar_estatus_producto, buscar_producto_por_id,
    verificar_nombre_producto, actualizar_stock_producto
)
from .repository import ProductoRepository

logger = logging.getLogger(__name__)


def generar_qr_view(request):
    """Controlador para generar QR temporal"""
    id_producto = request.GET.get('id')
    nombre = request.GET.get('nombre')

    if not id_producto or not nombre:
        return HttpResponse('Faltan parámetros', status=400)

    img = generar_qr_temp(f'{id_producto} - {nombre}')
    response = HttpResponse(content_type="image/png")
    img.save(response, "PNG")
    response['Cache-Control'] = 'no-store'
    return response


@login_required(login_url='')
def gestiondeproductos(request):
    """Controlador principal de gestión de productos"""
    if request.method == 'POST':
        action = request.POST.get('action', 'add')
        is_ajax = request.headers.get('X-Requested-With') == 'XMLHttpRequest'

        try:
            # Extracción de datos del request — responsabilidad del Controlador
            command_args = {
                'id_producto': request.POST.get('id_producto'),
                'nombre_producto': request.POST.get('nombre_producto'),
                'descripcion_producto': request.POST.get('descripcion_producto'),
                'cantidad': request.POST.get('cantidad'),
                'stock_minimo': request.POST.get('stock_minimo'),
                'estatus_id': request.POST.get('id_estatus'),
                'categoria_id': request.POST.get('id_categoria'),
                'marca_id': request.POST.get('id_marca'),
                'unidad_id': request.POST.get('id_unidad'),
                'observaciones': request.POST.get('observaciones'),
                'imagen_file': request.FILES.get('imagen_producto'),
            }

            command = AgregarProductoCommand(**command_args) if action == 'add' else ActualizarProductoCommand(**command_args)
            result = command.execute()

            if is_ajax:
                return JsonResponse(result)

            if result['success']:
                messages.success(request, result['message'])
            else:
                messages.error(request, result['message'])
            return redirect('gestiondeproductos')

        except Exception as e:
            logger.error(f"Error en gestiondeproductos: {str(e)}", exc_info=True)
            error_msg = f"Error inesperado: {str(e)}"
            if is_ajax:
                return JsonResponse({'success': False, 'message': error_msg}, status=500)
            messages.error(request, error_msg)
            return redirect('gestiondeproductos')

    # GET — cambiar estatus
    cambiar_estatus = request.GET.get('cambiar_estatus')
    if cambiar_estatus:
        result = cambiar_estatus_producto(
            request.GET.get('producto_id'),
            request.GET.get('nuevo_estatus')
        )
        status_code = 200 if result['status'] == 'success' else 500
        return JsonResponse(result, status=status_code)

    # GET — buscar producto
    buscar_param = request.GET.get('buscar')
    if buscar_param:
        result = buscar_producto_por_id(buscar_param)
        status_code = 200 if result['status'] == 'success' else 404
        return JsonResponse(result, status=status_code)

    # GET — página principal (React la obtiene vía /GestiondeProductos/datos/)
    return render(request, 'gestiondeproductos.html')


@login_required(login_url='')
def verificar_producto(request):
    """Controlador AJAX para verificar duplicados por nombre"""
    if request.method != 'GET':
        return JsonResponse({'error': 'Método no permitido'}, status=405)

    nombre = request.GET.get('nombre', '').strip()
    try:
        result = verificar_nombre_producto(nombre)
        if 'error' in result:
            return JsonResponse(result, status=400)
        return JsonResponse(result)
    except Exception as e:
        logger.error(f"Error al verificar producto: {str(e)}", exc_info=True)
        return JsonResponse({'error': 'Error interno del servidor'}, status=500)


@login_required(login_url='')
def datos_gestion(request):
    """API endpoint para React: catálogos e info de usuario"""
    user_role = request.user.groups.first().name if request.user.groups.exists() else 'Usuario'
    data = ProductoRepository.datos_gestion(request.user.username)
    return JsonResponse({**data, 'user_role': user_role})


@login_required
def actualizar_stock(request):
    """Controlador para actualizar stock de un producto"""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Método no permitido'}, status=405)

    result = actualizar_stock_producto(
        request.POST.get('id_producto'),
        request.POST.get('nueva_cantidad')
    )
    status_code = 200 if result['success'] else 400
    return JsonResponse(result, status=status_code)


@login_required
def crear_producto_rapido(request):
    """Crea un producto nuevo desde el formulario de solicitudes y devuelve su ID"""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Método no permitido'}, status=405)
    try:
        data = json.loads(request.body)

        estatus = ProductoRepository.estatus_por_nombre('inactivo')
        if not estatus:
            return JsonResponse({'success': False, 'message': 'No se encontró el estatus Inactivo en el catálogo.'}, status=400)

        marca   = ProductoRepository.marca_sin_marca()
        next_id = ProductoRepository.siguiente_id()

        stock_minimo = int(data.get('stock_minimo', 10) or 10)

        command = AgregarProductoCommand(
            id_producto=next_id,
            nombre_producto=data.get('nombre_producto', '').strip(),
            descripcion_producto=data.get('descripcion_producto', ''),
            cantidad=0,
            stock_minimo=stock_minimo,
            estatus_id=estatus.id_estatus,
            categoria_id=data.get('categoria_id'),
            marca_id=marca.id_marca,
            unidad_id=data.get('unidad_id'),
            observaciones=data.get('observaciones', ''),
        )
        result = command.execute()
        if result['success']:
            return JsonResponse({
                'success': True,
                'id_producto': next_id,
                'nombre_producto': data.get('nombre_producto', '').strip(),
                'cantidad': 0,
            })
        return JsonResponse(result, status=400)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)
