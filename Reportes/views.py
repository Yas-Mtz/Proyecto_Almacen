from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import render
from .pattern_interface import ReporteSolicitudes, ReporteInventario, ExportadorReporteDecorator
from django.utils.dateparse import parse_datetime
from django.utils import timezone
import os


def reportes(request):
    """Renderiza la página de reportes"""
    return render(request, 'reportes.html')


@csrf_exempt
def generar_reporte(request):
    """Genera el reporte en base a las fechas y formato seleccionado"""
    if request.method == "POST":
        fecha_inicio_str = request.POST.get("fecha_inicio")
        fecha_fin_str = request.POST.get("fecha_fin")
        formato = request.POST.get("formato")

        # Depuración de los parámetros recibidos
        print(
            f"Recibidos fecha_inicio: {fecha_inicio_str}, fecha_fin: {fecha_fin_str}, formato: {formato}")

        # Validación: si hay una fecha pero no la otra, muestra un mensaje de error
        if (fecha_inicio_str and not fecha_fin_str) or (fecha_fin_str and not fecha_inicio_str):
            return JsonResponse({"mensaje": "Debe ingresar ambas fechas o ninguna."})

        # Parsear las fechas a objetos datetime
        fecha_inicio = parse_datetime(
            fecha_inicio_str) if fecha_inicio_str else None
        fecha_fin = parse_datetime(fecha_fin_str) if fecha_fin_str else None

        # Verificar que las fechas sean correctas
        if fecha_inicio and fecha_fin:
            if timezone.is_naive(fecha_inicio) or timezone.is_naive(fecha_fin):
                return JsonResponse({"mensaje": "Las fechas deben ser con zona horaria."})

        # Determina el tipo de reporte
        if fecha_inicio and fecha_fin:
            reporte = ReporteSolicitudes()
        else:
            reporte = ReporteInventario()

        # Generación del reporte
        try:
            datos = reporte.generar_reporte(fecha_inicio, fecha_fin)
            print(f"Datos generados: {datos}")
            if not datos:
                return JsonResponse({"mensaje": "No se encontraron datos para el reporte."})

            # Si se seleccionó un formato de exportación
            if formato in ["PDF", "CSV"]:
                # Aplica decorador para exportar el reporte en el formato deseado
                reporte = ExportadorReporteDecorator(reporte, formato)

                # Genera el archivo del reporte (esto debería retornar un HttpResponse con el archivo)
                response = reporte.generar_reporte(fecha_inicio, fecha_fin)

                # Verifica si la respuesta es válida (un archivo generado)
                if isinstance(response, HttpResponse):
                    # Establece el tipo de contenido para forzar la descarga
                    if formato == "PDF":
                        response['Content-Type'] = 'application/pdf'
                        response['Content-Disposition'] = 'attachment; filename="reporte.pdf"'
                    elif formato == "CSV":
                        response['Content-Type'] = 'text/csv'
                        response['Content-Disposition'] = 'attachment; filename="reporte.csv"'

                    return response  # Regresa el archivo generado directamente

                return JsonResponse({"mensaje": "Ocurrió un error al generar el archivo."})

            # Si no se seleccionó formato de exportación, solo se retornan los datos en JSON
            return JsonResponse({"datos": list(datos)})

        except Exception as e:
            # Captura errores en la generación del reporte
            print(f"Error al generar el reporte: {e}")
            return JsonResponse({"mensaje": f"Ocurrió un error al generar el archivo: {str(e)}"})

    return render(request, "reportes.html")
