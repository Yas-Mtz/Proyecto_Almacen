from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import render
from django.db import connection
from datetime import datetime

def reportes(request):
    """Renderiza la página de reportes"""
    return render(request, 'reportes.html')

@csrf_exempt
def reporte_solicitudes(request):
    if request.method == 'POST':
        fecha_inicio = request.POST.get('fecha_inicio')
        fecha_fin = request.POST.get('fecha_fin')

        # Convertir las fechas a formato datetime
        fecha_inicio = datetime.strptime(fecha_inicio, '%Y-%m-%d')
        fecha_fin = datetime.strptime(fecha_fin, '%Y-%m-%d')

        # Llamar al procedimiento almacenado para el reporte de solicitudes
        with connection.cursor() as cursor:
            cursor.callproc('GenerarReporteSolicitudes', [fecha_inicio, fecha_fin])
            results = cursor.fetchall()

        # Imprimir los resultados en la terminal para depurar
        print("Resultados de reporte_solicitudes:", results)

        # Convertir los resultados a una lista de diccionarios (si es necesario)
        productos = []
        for result in results:
            productos.append({
                'id_solicitud': result[0],
                'almacen_direccion': result[1],
                'nom_articulo': result[2],
                'cantidad': result[3],
                'nombre_persona': result[4],
                'fecha_sol': result[5].strftime('%Y-%m-%d'),
            })

        # Retornar los datos como JSON para que el frontend los consuma
        return JsonResponse({'productos': productos})

def inventario(request):
    """Obtener los datos de inventario y devolverlos en formato JSON"""
    # Llamar al procedimiento almacenado para obtener todos los artículos
    with connection.cursor() as cursor:
        cursor.callproc('GenerarInventario')
        results = cursor.fetchall()

    # Imprimir los resultados en la terminal para depurar
    print("Resultados de inventario:", results)

    # Convertir los resultados a una lista de diccionarios
    articulos = []
    for result in results:
        articulos.append({
            'nom_articulo': result[0],
            'desc_articulo': result[1],
            'cantidad': result[2],
            'nomb_estatus': result[3]
        })

    return JsonResponse({'articulos': articulos})
