import qrcode
import os
from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse, HttpResponse
from django.conf import settings
from django.contrib import messages
from django.core.exceptions import ValidationError
from .models import Producto, Estatus, CategoriaProducto, Marca, UnidadMedida
from .command import AgregarProductoCommand, ActualizarProductoCommand
import logging

# Configuración del logger para el registro de errores
logger = logging.getLogger(__name__)

def generar_qr_temp(data):
    """Genera un QR temporal en memoria (no lo guarda en disco)"""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill='black', back_color='white')
    return img

def guardar_imagen_categoria(imagen_file, id_producto, categoria_nombre):
    """Guarda la imagen en una carpeta según la categoría"""
    # Limpiar el nombre de la categoría para usarlo en rutas
    safe_categoria = ''.join(c for c in categoria_nombre if c.isalnum() or c in (' ', '_')).rstrip()
    safe_categoria = safe_categoria.replace(' ', '_').lower()
    
    # Crear directorio si no existe
    categoria_dir = os.path.join(settings.MEDIA_ROOT, 'productos', safe_categoria)
    os.makedirs(categoria_dir, exist_ok=True)
    
    # Generar nombre de archivo seguro
    file_ext = os.path.splitext(imagen_file.name)[1]
    safe_filename = f'prod_{id_producto}{file_ext}'
    
    # Guardar el archivo
    file_path = os.path.join(categoria_dir, safe_filename)
    with open(file_path, 'wb+') as destination:
        for chunk in imagen_file.chunks():
            destination.write(chunk)
    
    # Retornar ruta relativa para guardar en la base de datos
    return os.path.join('productos', safe_categoria, safe_filename)

def generar_qr_view(request):
    """Vista para generar QR temporal (no lo guarda)"""
    id_producto = request.GET.get('id')
    nombre = request.GET.get('nombre')

    if not id_producto or not nombre:
        return HttpResponse('Faltan parámetros', status=400)

    img = generar_qr_temp(f'{id_producto} - {nombre}')
    
    response = HttpResponse(content_type="image/png")
    img.save(response, "PNG")
    response['Cache-Control'] = 'no-store'  # No cachear para siempre regenerar
    return response

@login_required(login_url='')
def gestiondeproductos(request):
    # Obtener listas para los selectores
    estatus_list = Estatus.objects.all()
    categorias_list = CategoriaProducto.objects.all()
    marcas_list = Marca.objects.all()
    unidades_list = UnidadMedida.objects.all()
    
    # Calcular próximo ID disponible
    next_id = Producto.objects.order_by('-id_producto').first().id_producto + 1 if Producto.objects.exists() else 1

    if request.method == 'POST':
        action = request.POST.get('action', 'add')
        
        try:
            # Validar y obtener datos del formulario
            def get_required_int(field_name, field_label):
                value = request.POST.get(field_name)
                if not value:
                    raise ValidationError(f"El campo {field_label} es requerido")
                try:
                    return int(value)
                except (TypeError, ValueError):
                    raise ValidationError(f"El campo {field_label} debe ser un número válido")

            # Obtener datos con validación
            id_producto = request.POST.get('id_producto')
            nombre_producto = request.POST.get('nombre_producto')
            descripcion_producto = request.POST.get('descripcion_producto')
            
            cantidad = get_required_int('cantidad', 'Cantidad')
            stock_minimo = get_required_int('stock_minimo', 'Stock Mínimo')
            estatus_id = get_required_int('id_estatus', 'Estatus')
            categoria_id = get_required_int('id_categoria', 'Categoría')
            marca_id = get_required_int('id_marca', 'Marca')
            unidad_id = get_required_int('id_unidad', 'Unidad de Medida')
            
            observaciones = request.POST.get('observaciones', '')
            imagen_producto = request.FILES.get('imagen_producto')

            # Validaciones adicionales
            if cantidad < 0 or stock_minimo < 0:
                raise ValidationError("Las cantidades no pueden ser negativas")

            # Verificar que los IDs de relaciones existan en la BD
            if not Estatus.objects.filter(id_estatus=estatus_id).exists():
                raise ValidationError("El estatus seleccionado no existe")
            if not CategoriaProducto.objects.filter(id_categoria=categoria_id).exists():
                raise ValidationError("La categoría seleccionada no existe")
            if not Marca.objects.filter(id_marca=marca_id).exists():
                raise ValidationError("La marca seleccionada no existe")
            if not UnidadMedida.objects.filter(id_unidad=unidad_id).exists():
                raise ValidationError("La unidad de medida seleccionada no existe")

            # Obtener nombre de categoría para la estructura de carpetas
            categoria = CategoriaProducto.objects.get(id_categoria=categoria_id)
            categoria_nombre = categoria.nombre_categoria

            # Procesar imagen si fue subida
            imagen_path = None
            if imagen_producto:
                imagen_path = guardar_imagen_categoria(imagen_producto, id_producto, categoria_nombre)

            # Seleccionar y ejecutar el comando apropiado
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

            if action == 'add':
                command = AgregarProductoCommand(**command_args)
            else:
                command = ActualizarProductoCommand(**command_args)

            result = command.execute()
            
            if result['success']:
                messages.success(request, result['message'])
            else:
                messages.error(request, result['message'])
            
            return redirect('gestiondeproductos')

        except ValidationError as e:
            messages.error(request, str(e))
        except Exception as e:
            logger.error(f"Error al procesar el formulario: {str(e)}", exc_info=True)
            messages.error(request, "Error al procesar el formulario. Por favor verifique los datos e intente nuevamente.")
        
        return redirect('gestiondeproductos')

    elif request.method == 'GET':
        # Manejar búsqueda de producto
        id_producto = request.GET.get('buscar')
        if id_producto:
            producto = Producto.objects.filter(id_producto=id_producto).first()
            if producto:
                return JsonResponse({
                    'status': 'success',
                    'id_producto': producto.id_producto,
                    'nombre_producto': producto.nombre_producto,
                    'descripcion_producto': producto.descripcion_producto,
                    'cantidad': producto.cantidad,
                    'stock_minimo': producto.stock_minimo,
                    'estatus': producto.estatus.id_estatus,
                    'categoria': producto.categoria.id_categoria,
                    'marca': producto.marca.id_marca,
                    'unidad': producto.unidad.id_unidad,
                    'observaciones': producto.observaciones,
                    'imagen_url': producto.imagen_producto.url if producto.imagen_producto else None
                })
            return JsonResponse({'status': 'error', 'message': 'Producto no encontrado'})

        # Renderizar la página con los datos necesarios
        context = {
            'estatus_list': estatus_list,
            'categorias_list': categorias_list,
            'marcas_list': marcas_list,
            'unidades_list': unidades_list,
            'next_id': next_id,
            'ESTATUS_ACTIVO': 1,  # ID del estatus Activo (ajustar según tu BD)
            'ESTATUS_INACTIVO': 2  # ID del estatus Inactivo (ajustar según tu BD)
        }
        return render(request, 'gestiondeproductos.html', context)