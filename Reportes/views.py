from django.http import JsonResponse
from django.shortcuts import render
from django.db import connection


def reportes(request):
    # Consulta de tipos de reporte
    with connection.cursor() as cursor:
        cursor.execute("SELECT id_reporte, tip_report FROM tipo_reporte")
        tipos_reporte = cursor.fetchall()

    return render(request, 'reportes.html', {'tipos_reporte': tipos_reporte})


def generar_reporte(request):
    if request.method == 'POST':
        tipo_reporte = request.POST.get('opcion')
        fecha_inicio = request.POST.get('fecha_inicio')
        fecha_fin = request.POST.get('fecha_fin')

        if not tipo_reporte or not fecha_inicio or not fecha_fin:
            return JsonResponse({'error': 'Faltan parámetros en la solicitud'}, status=400)

        # procedimiento almacenado
        with connection.cursor() as cursor:
            cursor.callproc('GenerarReportes', [
                            tipo_reporte, fecha_inicio, fecha_fin])

            # Obtener los resultados
            resultados = cursor.fetchall()

        if resultados:
            return JsonResponse({'resultados': resultados})
        else:
            return JsonResponse({'error': 'No se encontraron datos para el reporte'}, status=404)
