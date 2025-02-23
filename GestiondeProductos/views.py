from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.db import connection
from django.http import JsonResponse
from .command import AgregarProductoCommand, ActualizarProductoCommand
import qrcode
import io
import base64


@login_required(login_url='')
def gestiondeproductos(request):
    """
    Vista para la gestión de productos.

    Maneja tanto las solicitudes GET como POST para agregar o actualizar productos.

    Args:
        request (HttpRequest): El objeto de solicitud HTTP.

    Returns:
        JsonResponse: Respuesta JSON con el estado de la operación y mensajes correspondientes.
        HttpResponse: Respuesta HTTP con el renderizado de la plantilla 'gestiondeproductos.html'.
    """
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
            comando = AgregarProductoCommand(
                id_articulo, nom_articulo, desc_articulo, cantidad, id_estatus, qr_articulo)
        elif action == 'update':
            comando = ActualizarProductoCommand(
                id_articulo, nom_articulo, desc_articulo, cantidad, id_estatus, qr_articulo)
        else:
            return JsonResponse({'status': 'error', 'message': 'Acción no válida'})

        try:
            # Si se trata de agregar, generar el QR para el nuevo producto
            if action == 'add':
                qr_data = f"ID: {id_articulo}, Nombre: {nom_articulo}, Cantidad: {cantidad}"
                qr_code = qrcode.make(qr_data)
                buffer = io.BytesIO()
                qr_code.save(buffer, format="PNG")
                buffer.seek(0)
                qr_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
            # Ejecutar el comando (llama al procedimiento almacenado)
            mensaje_estado = comando.execute()
            return JsonResponse({
                'status': 'success',
                'message': mensaje_estado,
                'qr_url': f"data:image/png;base64,{qr_base64}" if action == 'add' else ""
            })
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)})

    elif request.method == 'GET':
        # Si se envía el id_articulo, consultamos el producto
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
                # Generar el QR usando los datos obtenidos (la cantidad se deja vacía en el formulario)
                qr_data = f"ID: {id_articulo}, Nombre: {articulo[0]}, Cantidad: {articulo[2]}"
                qr = qrcode.make(qr_data)
                buffer = io.BytesIO()
                qr.save(buffer, format="PNG")
                qr_base64 = base64.b64encode(buffer.getvalue()).decode()
                return JsonResponse({
                    'status': 'success',
                    'nombre_articulo': articulo[0],
                    'descripcion_articulo': articulo[1],
                    # Se envía vacío para que el usuario ingrese la cantidad adicional
                    'cantidad_articulo': "",
                    'id_estatus': articulo[3],
                    'qr_articulo': articulo[4],
                    'qr_url': f"data:image/png;base64,{qr_base64}"
                })
            else:
                return JsonResponse({'status': 'error', 'message': 'El artículo no existe en la base de datos.'})
        else:
            # Si no se envía un id_articulo, es un registro nuevo:
            # Consultar el siguiente ID disponible **************************************************
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT IFNULL(MAX(id_articulo), 0) + 1 FROM articulos")
                next_id = cursor.fetchone()[0]
            # Obtener la lista de estatus
            with connection.cursor() as cursor:
                cursor.execute("SELECT id_estatus, nomb_estatus FROM estatus")
                estatus_list = cursor.fetchall()
            return render(request, 'gestiondeproductos.html', {
                'estatus_list': estatus_list,
                'next_id': next_id
            })
