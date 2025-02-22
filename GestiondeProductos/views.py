from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.db import connection
from django.http import JsonResponse


@login_required(login_url='')
def gestiondeproductos(request):
    if request.method == 'POST':
        # Recibe los datos del formulario o petición
        id_articulo = request.POST.get('id_articulo')
        # Cambiado a 'nom_articulo' según la BD
        nom_articulo = request.POST.get('nombre_articulo')
        desc_articulo = request.POST.get(
            'descripcion_articulo')

        cantidad = int(request.POST.get('cantidad_articulo'))
        id_estatus = request.POST.get('id_estatus')
        qr_articulo = request.POST.get('qr_articulo')

        try:
            # procedimiento almacenado
            with connection.cursor() as cursor:
                cursor.callproc('RegistrarArticulo', [
                    id_articulo,
                    nom_articulo,
                    desc_articulo,
                    cantidad,
                    id_estatus,
                    qr_articulo
                ])

            return JsonResponse({'status': 'success', 'message': 'Artículo registrado o actualizado correctamente'})

        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)})

    elif request.method == 'GET':
        id_articulo = request.GET.get('id_articulo', None)

        if id_articulo:
            # Verificar si el artículo existe en la base de datos
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT nom_articulo, desc_articulo, cantidad, id_estatus, qr_articulo
                    FROM articulos
                    WHERE id_articulo = %s
                    """, [id_articulo])
                articulo = cursor.fetchone()

            if articulo:
                # Si el artículo existe, devolver datos del artículo
                return JsonResponse({
                    'status': 'success',
                    'nombre_articulo': articulo[0],
                    'descripcion_articulo': articulo[1],
                    'cantidad_articulo': articulo[2],
                    'id_estatus': articulo[3],
                    'qr_articulo': articulo[4]
                })
            else:
                # Si el artículo no existe, mostrar un mensaje de error
                return JsonResponse({'status': 'error', 'message': 'El artículo no existe en la base de datos.'})

        # Obtener la lista de estatus
        with connection.cursor() as cursor:
            cursor.execute("SELECT id_estatus, nomb_estatus FROM estatus")
            estatus_list = cursor.fetchall()

        return render(request, 'gestiondeproductos.html', {'estatus_list': estatus_list})
