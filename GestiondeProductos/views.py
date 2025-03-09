import qrcode
import os
from PIL import Image  # Importar PIL para manipular imágenes
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse, HttpResponse
from django.conf import settings
from .models import Articulo, Estatus
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
    img = qr.make_image(fill='black', back_color='white').convert(
        "RGB")  # Convertir a RGB para insertar el logo

    # Ruta del logo de ajolote
    logo_path = os.path.join(
        settings.BASE_DIR, 'frontend_uacm', 'build', 'static', 'media', 'QR_ajolote.png')

    if os.path.exists(logo_path):
        logo = Image.open(logo_path)

        # Redimensionar el logo para que encaje en el centro del QR
        qr_width, qr_height = img.size
        logo_size = qr_width // 4  # Tamaño del logo (1/4 del QR)
        logo = logo.resize((logo_size, logo_size))

        # Posición para colocar el logo en el centro
        pos = ((qr_width - logo_size) // 2, (qr_height - logo_size) // 2)
        # Pegamos el logo con transparencia si tiene
        img.paste(logo, pos, mask=logo if logo.mode == 'RGBA' else None)

    # Guardar el QR
    qr_dir = os.path.join(settings.MEDIA_ROOT, 'qr_codes')
    os.makedirs(qr_dir, exist_ok=True)
    qr_path = os.path.join(qr_dir, nombre_archivo)
    img.save(qr_path)

    return os.path.join('UACM_QR', nombre_archivo)

# Vista para generar el código QR a través de la URL


def generar_qr_view(request):
    id_articulo = request.GET.get('id')
    nombre = request.GET.get('nombre')

    if not id_articulo or not nombre:
        return HttpResponse('Faltan parámetros', status=400)

    # Generar el QR con el logo en el centro
    qr_path = generar_qr(f'{id_articulo} - {nombre}',
                         f'{id_articulo}_{nombre}.png')

    # Generar la respuesta HTTP con el QR en formato PNG
    response = HttpResponse(content_type="image/png")
    with open(os.path.join(settings.MEDIA_ROOT, 'qr_codes', f'{id_articulo}_{nombre}.png'), "rb") as f:
        response.write(f.read())

    response['Cache-Control'] = 'public, max-age=3600'
    return response

# Función de gestión de productos


@login_required(login_url='')
def gestiondeproductos(request):
    if request.method == 'POST':
        id_articulo = request.POST.get('id_articulo')
        nom_articulo = request.POST.get('nom_articulo')
        desc_articulo = request.POST.get('descripcion_articulo')
        cantidad_articulo = request.POST.get('cantidad_articulo')
        id_estatus = request.POST.get('id_estatus')
        action = request.POST.get('action')

        try:
            cantidad = int(cantidad_articulo)
            if cantidad <= 0:
                return JsonResponse({'status': 'error', 'message': "La cantidad debe ser mayor a cero."})
        except (ValueError, TypeError):
            return JsonResponse({'status': 'error', 'message': "Cantidad inválida."})

        # Buscar el artículo en la base de datos
        articulo = Articulo.objects.filter(id_articulo=id_articulo).first()

        # Si el artículo ya tiene un QR, reutilízalo; si no, genera uno nuevo
        qr_path = articulo.qr_articulo if articulo and articulo.qr_articulo else generar_qr(
            f'{id_articulo} - {nom_articulo}', f'{id_articulo}_{nom_articulo}.png')

        # Comando para crear o actualizar el producto
        comando = ProductoCommand(
            id_articulo, nom_articulo, desc_articulo, cantidad, id_estatus, qr_path)

        try:
            mensaje_estado = comando.execute()
            return JsonResponse({'status': 'success', 'message': mensaje_estado})
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)})

    elif request.method == 'GET':
        id_articulo = request.GET.get('id_articulo')
        if id_articulo:
            # Buscar artículo en base de datos
            articulo = Articulo.objects.filter(id_articulo=id_articulo).first()
            if articulo:
                return JsonResponse({
                    'status': 'success',
                    'nombre_articulo': articulo.nom_articulo,
                    'descripcion_articulo': articulo.desc_articulo,
                    'cantidad_articulo': articulo.cantidad,
                    'id_estatus': articulo.id_estatus.id_estatus,
                    'qr_articulo': articulo.qr_articulo,
                })
            return JsonResponse({'status': 'error', 'message': 'El artículo no existe.'})

        # Obtener el siguiente ID de artículo y los estatus disponibles
        next_id = Articulo.objects.order_by(
            '-id_articulo').first().id_articulo + 1 if Articulo.objects.exists() else 1
        estatus_list = Estatus.objects.all()
        return render(request, 'gestiondeproductos.html', {'estatus_list': estatus_list, 'next_id': next_id})
