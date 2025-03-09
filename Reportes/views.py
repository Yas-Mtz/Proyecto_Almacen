from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import render
from django.utils import timezone
from datetime import datetime
from .pattern_interface import ReporteSolicitudes, ReporteInventario, ExportadorReporteDecorator
import os


def reportes(request):
    """ Renderiza la página de reportes"""
    return render(request, 'reportes.html')


# Permite peticiones POST sin token CSRF (solo para pruebas, no recomendado en producción)
@csrf_exempt
def generar_reporte(request):
    """Genera el reporte en base a las fechas y formato seleccionado"""
    if request.method == "POST":
        fecha_inicio = request.POST.get("fecha_inicio")
        fecha_fin = request.POST.get("fecha_fin")
        formato = request.POST.get("formato")

        # Determina el tipo de reporte
        if fecha_inicio and fecha_fin:
            reporte = ReporteSolicitudes()
        else:
            reporte = ReporteInventario()

        # Generación del reporte
        datos = reporte.generar_reporte(fecha_inicio, fecha_fin)
        # depuración de dato, verificación para ver si hay datos
        print(f"Datos del reporte de inventario: {datos}")

        # Si no se encontraron datos, se devuelve un mensaje
        if not datos:
            return JsonResponse({"mensaje": "No se encontraron datos para el reporte."})

        # Si se seleccionó un formato de exportación
        if formato in ["PDF", "CSV"]:
            # Aplica decorador para exportar el reporte en el formato deseado
            reporte = ExportadorReporteDecorator(reporte, formato)

            # Genera el archivo del reporte (el archivo se guarda en el servidor)
            ruta_reporte = reporte.generar_reporte(fecha_inicio, fecha_fin)

            # Retorna la URL para acceder al archivo generado
            return JsonResponse({"url": ruta_reporte})

        # Si no se seleccionó formato de exportación, solo se retornan los datos en JSON
        return JsonResponse({"datos": list(datos)})

    return render(request, "reportes.html")
