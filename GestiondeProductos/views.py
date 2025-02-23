from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.db import connection
from django.http import JsonResponse
from .command import AgregarProductoCommand, ActualizarProductoCommand


@login_required(login_url='')
def gestiondeproductos(request):
    if request.method == 'POST':
        # Imprimir la acción recibida en la consola para verificar
        print(f"Acción recibida: {request.POST.get('action')}")

        # Obtener los datos del formulario
        id_articulo = request.POST.get('id_articulo')
        nom_articulo = request.POST.get('nombre_articulo')
        desc_articulo = request.POST.get('descripcion_articulo')
        cantidad_articulo = request.POST.get('cantidad_articulo')
        id_estatus = request.POST.get('id_estatus')
        qr_articulo = request.POST.get('qr_articulo')

        # Validar que la cantidad_articulo sea un número entero
        try:
            cantidad = int(cantidad_articulo)
        except ValueError:
            return JsonResponse({'status': 'error', 'message': "La cantidad debe ser un número entero válido."})

        # Verificar que la acción sea válida y ejecutar el comando adecuado
        action = request.POST.get('action')
        if action == 'add':
            # Se ejecuta el procedimiento de RegistrarArticulo
            comando = AgregarProductoCommand(
                id_articulo, nom_articulo, desc_articulo, cantidad, id_estatus, qr_articulo)
        elif action == 'update':
            # Se ejecuta el procedimiento de ActualizarArticulo
            comando = ActualizarProductoCommand(
                id_articulo, nom_articulo, desc_articulo, cantidad, id_estatus, qr_articulo)
        else:
            return JsonResponse({'status': 'error', 'message': 'Acción no válida'})

        # Ejecutar el comando, que llamará al procedimiento almacenado
        try:
            mensaje_estado = comando.execute()
            return JsonResponse({'status': 'success', 'message': mensaje_estado})
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)})

    elif request.method == 'GET':
        # Obtener detalles de un artículo si se envía su ID
        id_articulo = request.GET.get('id_articulo', None)

        if id_articulo:
            with connection.cursor() as cursor:
                cursor.execute(""" 
                    SELECT nom_articulo, desc_articulo, cantidad, id_estatus, qr_articulo
                    FROM articulos
                    WHERE id_articulo = %s
                """, [id_articulo])
                articulo = cursor.fetchone()

            if articulo:
                return JsonResponse({
                    'status': 'success',
                    'nombre_articulo': articulo[0],
                    'descripcion_articulo': articulo[1],
                    'cantidad_articulo': articulo[2],
                    'id_estatus': articulo[3],
                    'qr_articulo': articulo[4]
                })
            else:
                return JsonResponse({'status': 'error', 'message': 'El artículo no existe en la base de datos.'})

        # Obtener la lista de estatus
        with connection.cursor() as cursor:
            cursor.execute("SELECT id_estatus, nomb_estatus FROM estatus")
            estatus_list = cursor.fetchall()

        return render(request, 'gestiondeproductos.html', {'estatus_list': estatus_list})
