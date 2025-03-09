import qrcode
import os
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
    img = qr.make_image(fill='black', back_color='white')

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

    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(f'{id_articulo} - {nombre}')
    qr.make(fit=True)
    img = qr.make_image(fill='black', back_color='white')

    response = HttpResponse(content_type="image/png")
    img.save(response, "PNG")
    response['Cache-Control'] = 'public, max-age=3600'
    return response


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

        articulo = Articulo.objects.filter(id_articulo=id_articulo).first()

        qr_path = articulo.qr_articulo if articulo and articulo.qr_articulo else generar_qr(
            f'{id_articulo} - {nom_articulo}', f'{id_articulo}_{nom_articulo}.png')

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

        next_id = Articulo.objects.order_by(
            '-id_articulo').first().id_articulo + 1 if Articulo.objects.exists() else 1
        estatus_list = Estatus.objects.all()
        return render(request, 'gestiondeproductos.html', {'estatus_list': estatus_list, 'next_id': next_id})
