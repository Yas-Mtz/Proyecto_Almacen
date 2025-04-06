import qrcode
import os
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse, HttpResponse
from django.conf import settings
from .models import Producto, Estatus
from .command import ProductoCommand

# Función para generar un código QR a partir de datos proporcionados
def generar_qr(data, nombre_archivo):
    # Genera y guarda un código QR con los datos especificados
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill='black', back_color='white')

    qr_dir = os.path.join(settings.MEDIA_ROOT, 'qr_codes')
    os.makedirs(qr_dir, exist_ok=True)
    qr_path = os.path.join(qr_dir, nombre_archivo)
    img.save(qr_path)

    return os.path.join('UACM_QR', nombre_archivo)

# Vista para generar el código QR a través de la URL
def generar_qr_view(request):
    id_producto = request.GET.get('id')
    nombre = request.GET.get('nombre')

    if not id_producto or not nombre:
        return HttpResponse('Faltan parámetros', status=400)

    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(f'{id_producto} - {nombre}')
    qr.make(fit=True)
    img = qr.make_image(fill='black', back_color='white')

    response = HttpResponse(content_type="image/png")
    img.save(response, "PNG")
    response['Cache-Control'] = 'public, max-age=3600'
    return response

@login_required(login_url='')
def gestiondeproductos(request):
    if request.method == 'POST':
        id_producto = request.POST.get('id_producto')
        nombre_producto = request.POST.get('nombre_producto')
        descripcion_producto = request.POST.get('descripcion_producto')
        cantidad_producto = request.POST.get('cantidad_producto')
        id_estatus = request.POST.get('id_estatus')
        action = request.POST.get('action')

        try:
            cantidad = int(cantidad_producto)
            if cantidad <= 0:
                return JsonResponse({'status': 'error', 'message': "La cantidad debe ser mayor a cero."})
        except (ValueError, TypeError):
            return JsonResponse({'status': 'error', 'message': "Cantidad inválida."})

        # Aquí cambiamos de Articulo a Producto
        producto = Producto.objects.filter(id_producto=id_producto).first()

        # Si el producto existe, obtenemos el QR o lo generamos
        qr_path = producto.imagen_producto if producto and producto.imagen_producto else generar_qr(
            f'{id_producto} - {nombre_producto}', f'{id_producto}_{nombre_producto}.png')

        comando = ProductoCommand(
            id_producto, nombre_producto, descripcion_producto, cantidad, id_estatus, qr_path)

        try:
            mensaje_estado = comando.execute()
            return JsonResponse({'status': 'success', 'message': mensaje_estado})
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)})

    elif request.method == 'GET':
        id_producto = request.GET.get('id_producto')
        if id_producto:
            producto = Producto.objects.filter(id_producto=id_producto).first()
            if producto:
                return JsonResponse({
                    'status': 'success',
                    'nombre_producto': producto.nombre_producto,
                    'descripcion_producto': producto.descripcion_producto,
                    'cantidad_producto': producto.cantidad,
                    'id_estatus': producto.estatus.id_estatus,
                    'imagen_producto': producto.imagen_producto,
                })
            return JsonResponse({'status': 'error', 'message': 'El producto no existe.'})

        next_id = Producto.objects.order_by('-id_producto').first().id_producto + 1 if Producto.objects.exists() else 1
        estatus_list = Estatus.objects.all()
        return render(request, 'gestiondeproductos.html', {'estatus_list': estatus_list, 'next_id': next_id})
