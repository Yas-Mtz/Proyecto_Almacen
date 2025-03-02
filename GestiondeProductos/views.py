import qrcode
import os
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse, HttpResponse
from django.conf import settings
from .models import Articulo, Estatus
from .command import AgregarProductoCommand, ActualizarProductoCommand


# Función para generar el código QR
def generar_qr(data, nombre_archivo):
    """
    Genera un código QR y lo guarda en el sistema de archivos.
    """
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill='black', back_color='white')

    # Directorio donde se guardarán los códigos QR generados
    qr_dir = os.path.join(settings.MEDIA_ROOT, 'qr_codes')
    os.makedirs(qr_dir, exist_ok=True)  # Crear el directorio si no existe
    qr_path = os.path.join(qr_dir, nombre_archivo)
    img.save(qr_path)

    # Devuelve la ruta relativa
    return os.path.join('qr_codes', nombre_archivo)


# Vista para generar el código QR a través de la URL
def generar_qr_view(request):
    # Obtener los parámetros 'id' y 'nombre' de la URL
    id_articulo = request.GET.get('id')
    nombre = request.GET.get('nombre')

    print(f'Parámetros recibidos: id={id_articulo}, nombre={nombre}')

    # Si faltan parámetros, devolver error 400
    if not id_articulo or not nombre:
        return HttpResponse('Faltan parámetros', status=400)

    # Generar el código QR
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(f'{id_articulo} - {nombre}')
    qr.make(fit=True)
    img = qr.make_image(fill='black', back_color='white')

    # Devolver la imagen QR como respuesta
    response = HttpResponse(content_type="image/png")
    img.save(response, "PNG")
    return response


@login_required(login_url='')
def gestiondeproductos(request):
    if request.method == 'POST':
        # Procesamiento de formulario para agregar o actualizar producto
        id_articulo = request.POST.get('id_articulo')
        nom_articulo = request.POST.get('nom_articulo')
        desc_articulo = request.POST.get('descripcion_articulo')
        cantidad_articulo = request.POST.get('cantidad_articulo')
        id_estatus = request.POST.get('id_estatus')
        action = request.POST.get('action')

        try:
            cantidad = int(cantidad_articulo)
        except (ValueError, TypeError):
            return JsonResponse({'status': 'error', 'message': "La cantidad debe ser un número entero válido."})

        if action == 'add':
            # Generar código QR automáticamente
            qr_nombre = f'{id_articulo}_{nom_articulo}.png'
            qr_path = generar_qr(f'{id_articulo} - {nom_articulo}', qr_nombre)

            # Crear el producto con el código QR generado
            comando = AgregarProductoCommand(
                id_articulo, nom_articulo, desc_articulo, cantidad, id_estatus, qr_path)

        elif action == 'update':
            articulo = Articulo.objects.filter(id_articulo=id_articulo).first()
            if articulo:
                # Si el producto ya tiene un QR, se usa, sino se genera uno nuevo
                qr_path = articulo.qr_articulo if articulo.qr_articulo else generar_qr(
                    f'{id_articulo} - {nom_articulo}', f'{id_articulo}_{nom_articulo}.png')
                comando = ActualizarProductoCommand(
                    id_articulo, nom_articulo, desc_articulo, cantidad, id_estatus, qr_path)
            else:
                return JsonResponse({'status': 'error', 'message': 'Producto no encontrado para actualizar.'})

        else:
            return JsonResponse({'status': 'error', 'message': 'Acción no válida'})

        try:
            mensaje_estado = comando.execute()
            return JsonResponse({'status': 'success', 'message': mensaje_estado})
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)})

    elif request.method == 'GET':
        # Lógica de búsqueda para obtener producto por id_articulo
        id_articulo = request.GET.get('id_articulo')
        if id_articulo:
            articulo = Articulo.objects.filter(id_articulo=id_articulo).first()
            if articulo:
                return JsonResponse({
                    'status': 'success',
                    'nombre_articulo': articulo.nom_articulo,
                    # Cambiado de descripcion_articulo a desc_articulo
                    'descripcion_articulo': articulo.desc_articulo,
                    'cantidad_articulo': articulo.cantidad,
                    'id_estatus': articulo.id_estatus.id_estatus,
                    'qr_articulo': articulo.qr_articulo,
                })
            else:
                return JsonResponse({'status': 'error', 'message': 'El artículo no existe en la base de datos.'})

        next_id = (Articulo.objects.order_by(
            '-id_articulo').first().id_articulo + 1) if Articulo.objects.exists() else 1
        estatus_list = Estatus.objects.all()

        return render(request, 'gestiondeproductos.html', {
            'estatus_list': estatus_list,
            'next_id': next_id
        })
