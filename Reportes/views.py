# Reportes/views.py

from django.shortcuts import render
from django.db import connection
from django.http import JsonResponse
from datetime import datetime
from .pattern import GeneradorDeReportes


# Vista para generar reportes


def generar_reporte(request):
    if request.method == 'POST':
        tipo_reporte = request.POST.get(
            'tipo-reporte')  # "productos" o "inventario"
        fecha_inicio = request.POST.get('fecha-inicio')
        fecha_fin = request.POST.get('fecha-fin')

        # Puedes agregar más lógica aquí si deseas aplicar filtros o formatos
        aplicar_filtro = False  # Por ejemplo, si hay un filtro
        aplicar_formato = request.POST.get('formato')  # Puede ser PDF o Excel

        generador = GeneradorDeReportes(
            tipo_reporte, aplicar_filtro, aplicar_formato)
        data = {
            'fecha_inicio': fecha_inicio,
            'fecha_fin': fecha_fin,
        }

        # Generar el reporte usando el comando correspondiente
        resultado = generador.generar(data)

        # Mostrar el reporte (puedes devolverlo como un archivo o mostrar los resultados)
        return render(request, 'reporte_generado.html', {'resultado': resultado})

    # Si no es POST, simplemente mostrar el formulario
    return render(request, 'reportes.html')

# Vista para registrar un artículo


def registrar_articulo(request):
    if request.method == 'POST':
        # Obtener datos del formulario
        id_articulo = request.POST.get('id_articulo')
        cantidad = request.POST.get('cantidad')

        # Llamar al procedimiento almacenado para registrar el artículo
        try:
            with connection.cursor() as cursor:
                cursor.callproc('RegistrarArticulo', [id_articulo, cantidad])
            return JsonResponse({"status": "success", "message": "Artículo registrado correctamente"})
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)})

    return render(request, 'registrar_articulo.html')


# Vista para mostrar todos los reportes disponibles
def mostrar_reportes(request):
    # Aquí se muestra la plantilla 'reportes.html'
    return render(request, 'reportes.html')
