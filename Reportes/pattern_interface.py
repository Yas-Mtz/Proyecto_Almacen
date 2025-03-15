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
        datos = self.obtener_datos(
            fecha_inicio, fecha_fin)  # Obtención de los datos
        print(f"Datos obtenidos para el reporte: {datos}")  # Depuración
        return self.exportar(datos)  # Exportación de los datos

    @abstractmethod
    def obtener_datos(self, fecha_inicio, fecha_fin):
        """Método abstracto para obtener los datos del reporte"""
        pass

    @abstractmethod
    def exportar(self, datos):
        """Método abstracto para exportar los datos"""
        pass


class ReporteSolicitudes(ReporteBase):
    """Reporte de solicitudes en un rango de fechas"""

    def obtener_datos(self, fecha_inicio, fecha_fin):
        # Asegurarse de que las fechas estén en el formato correcto (aware)
        if fecha_inicio and fecha_fin:
            # Validar que las fechas sean "aware"
            if timezone.is_naive(fecha_inicio) or timezone.is_naive(fecha_fin):
                raise ValueError(
                    "Las fechas deben ser con zona horaria (aware).")
            solicitudes = list(Solicitudes.objects.filter(
                fecha_sol__range=[fecha_inicio, fecha_fin]).values())
            print(f"Solicitudes encontradas: {solicitudes}")  # Depuración
            return solicitudes
        else:
            solicitudes = list(Solicitudes.objects.all().values())
            # Depuración
            print(f"Solicitudes encontradas (sin fechas): {solicitudes}")
            return solicitudes

    def exportar(self, datos):
        if not datos:
            print("No se encontraron datos para exportar.")  # Depuración
        return datos  # Retorna los datos sin formato para su posterior procesamiento


class ReporteInventario(ReporteBase):
    """Reporte del inventario completo"""

    def obtener_datos(self, fecha_inicio, fecha_fin):
        # No hay necesidad de usar las fechas, simplemente devuelve todos los artículos
        articulos = list(Articulo.objects.all().values())
        print(f"Artículos encontrados: {articulos}")  # Depuración
        return articulos

    def exportar(self, datos):
        if not datos:
            print("No se encontraron datos para exportar.")  # Depuración
        return datos


# 🔹 Decorator
class ReporteDecorator(ReporteBase):
    """Clase base para decoradores de reportes"""

    def __init__(self, reporte):
        self._reporte = reporte  # Guarda el reporte al que se va a aplicar el decorador

    def obtener_datos(self, fecha_inicio, fecha_fin):
        return self._reporte.obtener_datos(fecha_inicio, fecha_fin)

    def exportar(self, datos):
        return self._reporte.exportar(datos)


class FiltroReporteDecorator(ReporteDecorator):
    """Aplica filtros a los datos del reporte"""

    def __init__(self, reporte, criterio):
        super().__init__(reporte)  # Llama al constructor de la clase base (ReporteDecorator)
        self.criterio = criterio  # Establece el criterio para filtrar los datos

    def exportar(self, datos):
        # Aplica el filtro sobre los datos
        if self.criterio:
            # Filtra los datos con el criterio especificado
            datos = [d for d in datos if self.criterio(d)]
        print(f"Datos después de aplicar el filtro: {datos}")  # Depuración
        return datos


class ExportadorReporteDecorator(ReporteDecorator):
    """Exporta el reporte en PDF o CSV"""

    def __init__(self, reporte, formato):
        super().__init__(reporte)  # Llama al constructor de la clase base (ReporteDecorator)
        self.formato = formato  # Establece el formato (PDF o CSV)

    def exportar(self, datos):
        print(f"Exportando datos: {datos}")  # Depuración
        if self.formato == "PDF":
            return self._exportar_pdf(datos)  # Exporta los datos a PDF
        elif self.formato == "CSV":
            return self._exportar_csv(datos)  # Exporta los datos a CSV
        return datos  # Si el formato no es PDF ni CSV, retorna los datos sin formato

    def _exportar_pdf(self, datos):
        """Exporta los datos en formato PDF"""
        print(f"Generando PDF con los datos: {datos}")  # Depuración
        buffer = BytesIO()  # Crea un buffer en memoria para el PDF
        pdf = canvas.Canvas(buffer)
        y = 800  # Posición vertical inicial para escribir en el PDF
        pdf.drawString(200, 820, "Reporte Generado")

        for item in datos:
            # Dibuja los datos en el PDF
            y = self._dibujar_datos_pdf(pdf, item, y)

        pdf.save()  # Guarda el PDF
        buffer.seek(0)  # Vuelve al inicio del buffer
        # Devuelve la respuesta en PDF
        response = HttpResponse(buffer, content_type='application/pdf')
        response['Content-Disposition'] = 'attachment; filename="reporte.pdf"'
        return response

    def _dibujar_datos_pdf(self, pdf, item, y):
        """Dibuja los datos en el PDF"""
        if isinstance(item, dict):
            for key, value in item.items():
                pdf.drawString(100, y, f"{key}: {value}")
                y -= 20
        else:
            pdf.drawString(100, y, str(item))
            y -= 20
        if y < 50:  # Si se está quedando sin espacio en la página, crea una nueva página
            pdf.showPage()
            y = 800
        return y

    def _exportar_csv(self, datos):
        """Exporta los datos en formato CSV"""
        print(f"Generando CSV con los datos: {datos}")  # Depuración
        # Crea la respuesta en formato CSV
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="reporte.csv"'

        writer = csv.writer(response)  # Crea un escritor CSV

        if datos:
            # Escribe encabezados si hay datos
            writer.writerow(datos[0].keys())
            for item in datos:
                # Escribe los valores de los registros
                writer.writerow(item.values())

        return response
