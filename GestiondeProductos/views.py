import os
import qrcode
import logging
import glob

from django.shortcuts import render, redirect
from django.http import JsonResponse, HttpResponse
from django.contrib import messages
from django.core.exceptions import ValidationError
from django.core.files.storage import default_storage
from django.conf import settings
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt

from .models import Producto, Estatus, CategoriaProducto, Marca, UnidadMedida
from .command import AgregarProductoCommand, ActualizarProductoCommand

logger = logging.getLogger(__name__)

def generar_qr_temp(data):
    """Genera un QR temporal en memoria"""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color='black', back_color='white')  # fill_color en lugar de fill
    return img


def guardar_imagen_categoria(imagen_file, id_producto, categoria_nombre):
    """Guarda o actualiza la imagen en la carpeta según la categoría, eliminando cualquier imagen anterior del producto."""
    safe_categoria = ''.join(c for c in categoria_nombre if c.isalnum() or c in (' ', '_')).rstrip()
    safe_categoria = safe_categoria.replace(' ', '_').lower()
    categoria_dir = os.path.join(settings.MEDIA_ROOT, 'productos', safe_categoria)
    os.makedirs(categoria_dir, exist_ok=True)

    nueva_ext = os.path.splitext(imagen_file.name)[1].lower()
    safe_filename = f'prod_{id_producto}{nueva_ext}'
    imagen_path = os.path.join(categoria_dir, safe_filename)

    # Eliminar cualquier archivo anterior con el mismo id, sin importar la extensión
    patrones = glob.glob(os.path.join(categoria_dir, f'prod_{id_producto}.*'))
    for archivo in patrones:
        try:
            os.remove(archivo)
        except Exception as e:
            logger.warning(f"No se pudo eliminar la imagen anterior {archivo}: {str(e)}")

    # Guardar la nueva imagen
    with default_storage.open(imagen_path, 'wb+') as destination:
        for chunk in imagen_file.chunks():
            destination.write(chunk)

    return os.path.join('productos', safe_categoria, safe_filename)


def generar_qr_view(request):
    """Vista para generar QR temporal"""
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
    estatus_list = Estatus.objects.all()
    categorias_list = CategoriaProducto.objects.all()
    marcas_list = Marca.objects.all()
    unidades_list = UnidadMedida.objects.all()

    ultimo_producto = Producto.objects.order_by('-id_producto').first()
    next_id = ultimo_producto.id_producto + 1 if ultimo_producto else 1

    if request.method == 'POST':
        action = request.POST.get('action', 'add')
        is_ajax = request.headers.get('X-Requested-With') == 'XMLHttpRequest'

        try:
            def get_required(field_name, field_label, is_int=False):
                value = request.POST.get(field_name)
                if not value and field_name not in ['descripcion_producto', 'observaciones']:
                    raise ValidationError(f"El campo {field_label} es requerido")
                if is_int and value:
                    try:
                        return int(value)
                    except ValueError:
                        raise ValidationError(f"El campo {field_label} debe ser un número válido")
                return value

            id_producto = get_required('id_producto', 'ID Producto', True)
            nombre_producto = get_required('nombre_producto', 'Nombre')
            descripcion_producto = get_required('descripcion_producto', 'Descripción')
            cantidad = get_required('cantidad', 'Cantidad', True)
            stock_minimo = get_required('stock_minimo', 'Stock Mínimo', True)
            estatus_id = get_required('id_estatus', 'Estatus', True)
            categoria_id = get_required('id_categoria', 'Categoría', True)
            marca_id = get_required('id_marca', 'Marca', True)
            unidad_id = get_required('id_unidad', 'Unidad', True)
            observaciones = get_required('observaciones', 'Observaciones')
            imagen_producto = request.FILES.get('imagen_producto')

            if cantidad < 0 or stock_minimo < 0:
                raise ValidationError("Las cantidades no pueden ser negativas")

            estatus = Estatus.objects.get(id_estatus=estatus_id)
            categoria = CategoriaProducto.objects.get(id_categoria=categoria_id)
            marca = Marca.objects.get(id_marca=marca_id)
            unidad = UnidadMedida.objects.get(id_unidad=unidad_id)

            imagen_path = None
            if imagen_producto:
                imagen_path = guardar_imagen_categoria(imagen_producto, id_producto, categoria.nombre_categoria)

            command_args = {
                'id_producto': id_producto,
                'nombre_producto': nombre_producto,
                'descripcion_producto': descripcion_producto,
                'cantidad': cantidad,
                'stock_minimo': stock_minimo,
                'estatus_id': estatus_id,
                'categoria_id': categoria_id,
                'marca_id': marca_id,
                'unidad_id': unidad_id,
                'observaciones': observaciones,
                'imagen_producto': imagen_path
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

        except ValidationError as e:
            error_msg = str(e)
            logger.warning(f"Error de validación: {error_msg}")
            if is_ajax:
                return JsonResponse({'success': False, 'message': error_msg}, status=400)
            messages.error(request, error_msg)
            return redirect('gestiondeproductos')

        except Exception as e:
            error_msg = "Error al procesar el formulario"
            logger.error(f"{error_msg}: {str(e)}", exc_info=True)
            if is_ajax:
                return JsonResponse({'success': False, 'message': error_msg}, status=500)
            messages.error(request, error_msg)
            return redirect('gestiondeproductos')

    elif request.method == 'GET':
        buscar_param = request.GET.get('buscar')
        cambiar_estatus = request.GET.get('cambiar_estatus')

        if cambiar_estatus:
            try:
                producto_id = request.GET.get('producto_id')
                nuevo_estatus = request.GET.get('nuevo_estatus')

                producto = Producto.objects.get(id_producto=producto_id)
                producto.estatus = Estatus.objects.get(id_estatus=nuevo_estatus)
                producto.save()

                return JsonResponse({
                    'status': 'success',
                    'message': 'Estatus actualizado correctamente',
                    'nuevo_estatus': {
                        'id': producto.estatus.id_estatus,
                        'nombre': producto.estatus.nombre_estatus
                    }
                })
            except Exception as e:
                logger.error(f"Error al cambiar estatus: {str(e)}", exc_info=True)
                return JsonResponse({'status': 'error', 'message': 'Error al cambiar el estatus'}, status=500)

        if buscar_param:
            try:
                producto = None
                if buscar_param.isdigit():
                    producto = Producto.objects.filter(id_producto=buscar_param).first()

                if producto:
                    imagen_url = None
                    imagen_nombre = None
                    if producto.imagen_producto:
                        try:
                            imagen_url = settings.MEDIA_URL + str(producto.imagen_producto)
                            imagen_nombre = os.path.basename(str(producto.imagen_producto))
                        except Exception as e:
                            logger.warning(f"Error al construir la URL de la imagen: {str(e)}")

                    return JsonResponse({
                        'status': 'success',
                        'id_producto': producto.id_producto,
                        'nombre_producto': producto.nombre_producto,
                        'descripcion_producto': producto.descripcion_producto,
                        'cantidad': producto.cantidad,
                        'stock_minimo': producto.stock_minimo,
                        'id_estatus': producto.estatus.id_estatus,
                        'nombre_estatus': producto.estatus.nombre_estatus,
                        'id_categoria': producto.categoria.id_categoria,
                        'nombre_categoria': producto.categoria.nombre_categoria,
                        'id_marca': producto.marca.id_marca,
                        'nombre_marca': producto.marca.nombre_marca,
                        'id_unidad': producto.unidad.id_unidad,
                        'nombre_unidad': producto.unidad.nombre_unidad,
                        'observaciones': producto.observaciones,
                        'imagen_url': imagen_url,
                        'imagen_nombre': imagen_nombre
                    })

                return JsonResponse({'status': 'error', 'message': 'Producto no encontrado'}, status=404)

            except Exception as e:
                logger.error(f"Error en búsqueda de producto: {str(e)}", exc_info=True)
                return JsonResponse({'status': 'error', 'message': 'Error al buscar el producto'}, status=500)

        context = {
            'estatus_list': estatus_list,
            'categorias_list': categorias_list,
            'marcas_list': marcas_list,
            'unidades_list': unidades_list,
            'next_id': next_id
        }
        return render(request, 'gestiondeproductos.html', context)


@csrf_exempt  # Necesario si no estás usando tokens CSRF en las solicitudes AJAX
def actualizar_stock(request):
    if request.method == 'POST':
        try:
            id_producto = request.POST.get('id_producto')
            nueva_cantidad_str = request.POST.get('nueva_cantidad')
            if nueva_cantidad_str is None:
                return JsonResponse({'success': False, 'message': 'No se proporcionó la cantidad'}, status=400)
            nueva_cantidad = int(nueva_cantidad_str)

            if nueva_cantidad < 0:
                return JsonResponse({'success': False, 'message': 'La cantidad no puede ser negativa'}, status=400)

            producto = Producto.objects.get(id_producto=id_producto)
            producto.cantidad = nueva_cantidad
            producto.save()

            return JsonResponse({'success': True, 'message': 'Stock actualizado correctamente'})

        except Producto.DoesNotExist:
            return JsonResponse({'success': False, 'message': 'Producto no encontrado'}, status=404)
        except ValueError:
            return JsonResponse({'success': False, 'message': 'Cantidad inválida'}, status=400)
        except Exception as e:
            logger.error(f"Error al actualizar stock: {str(e)}", exc_info=True)
            return JsonResponse({'success': False, 'message': 'Error interno'}, status=500)
    else:
        return JsonResponse({'success': False, 'message': 'Método no permitido'}, status=405)
