from abc import ABC, abstractmethod
import pandas as pd
from django.http import HttpResponse
import csv
from reportlab.pdfgen import canvas
from io import BytesIO
from .models import Solicitudes, Articulo
from django.utils import timezone


# 🔹 Template Method
class ReporteBase(ABC):
    """Clase base para generación de reportes"""

    def generar_reporte(self, fecha_inicio=None, fecha_fin=None):
        """Método plantilla que sigue la estructura del reporte"""
        datos = self.obtener_datos(fecha_inicio, fecha_fin)

        return self.exportar(datos)

    @abstractmethod
    def obtener_datos(self, fecha_inicio, fecha_fin):
        pass

    @abstractmethod
    def exportar(self, datos):
        pass


class ReporteSolicitudes(ReporteBase):
    """Reporte de solicitudes en un rango de fechas"""

    def obtener_datos(self, fecha_inicio, fecha_fin):
        # Asegurarse de que las fechas estén en el formato correcto (aware)
        if fecha_inicio and fecha_fin:
            # Validar que las fechas sean "aware"
            if timezone.is_naive(fecha_inicio) or timezone.is_naive(fecha_fin):
                raise ValueError(
                    "Las fechas deben ser  (con zona horaria)")

            return list(Solicitudes.objects.filter(fecha_sol__range=[fecha_inicio, fecha_fin]).values())
        return list(Solicitudes.objects.all().values())

    def exportar(self, datos):
        return datos  # Retorna los datos sin formato para su posterior procesamiento


class ReporteInventario(ReporteBase):
    """Reporte del inventario completo"""

    def obtener_datos(self, fecha_inicio, fecha_fin):
        # No hay necesidad de usar las fechas, simplemente devuelve todos los artículos
        return list(Articulo.objects.all().values())

    def exportar(self, datos):
        return datos


# 🔹 Decorator
class ReporteDecorator(ReporteBase):
    """Clase base para decoradores de reportes"""

    def __init__(self, reporte):
        self._reporte = reporte

    def obtener_datos(self, fecha_inicio, fecha_fin):
        return self._reporte.obtener_datos(fecha_inicio, fecha_fin)

    def exportar(self, datos):
        return self._reporte.exportar(datos)


class FiltroReporteDecorator(ReporteDecorator):
    """Aplica filtros a los datos del reporte"""

    def __init__(self, reporte, criterio):
        super().__init__(reporte)
        self.criterio = criterio

    def exportar(self, datos):
        # Aplica el filtro sobre los datos
        if self.criterio:
            datos = [d for d in datos if self.criterio(d)]
        return datos


class ExportadorReporteDecorator(ReporteDecorator):
    """Exporta el reporte en PDF o CSV"""

    def __init__(self, reporte, formato):
        super().__init__(reporte)
        self.formato = formato

    def exportar(self, datos):
        # Depuración de datos
        print(f"Exportando datos: {datos}")
        if self.formato == "PDF":
            return self._exportar_pdf(datos)
        elif self.formato == "CSV":
            return self._exportar_csv(datos)
        return datos  # Devuelve datos sin formato si no es PDF/CSV

    def _exportar_pdf(self, datos):
        """Exporta los datos en formato PDF"""
        print(
            f"Generando PDF con los datos: {datos}")  # Agregado para depuración
        buffer = BytesIO()
        pdf = canvas.Canvas(buffer)
        y = 800
        pdf.drawString(200, 820, "Reporte Generado")

        for item in datos:
            # Si los datos son diccionarios, podemos mejorar la visualización
            y = self._dibujar_datos_pdf(pdf, item, y)

        pdf.save()
        buffer.seek(0)
        response = HttpResponse(buffer, content_type='application/pdf')
        response['Content-Disposition'] = 'attachment; filename="reporte.pdf"'
        return response

    def _dibujar_datos_pdf(self, pdf, item, y):
        """Dibuja los datos en el PDF"""
        # Aquí puedes hacer un formato más estructurado de los datos
        if isinstance(item, dict):
            for key, value in item.items():
                pdf.drawString(100, y, f"{key}: {value}")
                y -= 20
        else:
            pdf.drawString(100, y, str(item))
            y -= 20
        if y < 50:
            pdf.showPage()
            y = 800
        return y

    def _exportar_csv(self, datos):
        """Exporta los datos en formato CSV"""
        print(
            f"Generando CSV con los datos: {datos}")  # Agregado para depuración
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="reporte.csv"'

        writer = csv.writer(response)

        if datos:
            # Escribe encabezados si hay datos
            writer.writerow(datos[0].keys())
            for item in datos:
                writer.writerow(item.values())

        return response
