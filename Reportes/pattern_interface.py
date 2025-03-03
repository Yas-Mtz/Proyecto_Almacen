# reportes_interfaces.py

from abc import ABC, abstractmethod

# --------- INTERFACE PARA EL PATRÓN STRATEGY ---------


class ReporteStrategy(ABC):
    @abstractmethod
    def generar_reporte(self, data):
        """
        Método que define la interfaz para la generación del reporte.
        Las clases concretas deben implementar esta lógica.
        """
        pass


# --------- INTERFACE PARA EL PATRÓN TEMPLATE METHOD ---------

class ReporteBase(ABC):
    def generar_reporte(self, data):
        """
        Método template que define el esqueleto del proceso de generación del reporte.
        """
        self.validar_datos(data)
        self.formatear_datos(data)
        return self.generar_pdf(data)

    @abstractmethod
    def validar_datos(self, data):
        """
        Método para validar los datos del reporte.
        Las subclases deben implementarlo.
        """
        pass

    @abstractmethod
    def formatear_datos(self, data):
        """
        Método para formatear los datos del reporte.
        Las subclases deben implementarlo.
        """
        pass

    def generar_pdf(self, data):
        """
        Método para generar un archivo PDF del reporte.
        """
        return f"Reporte PDF generado con {data}"


# --------- INTERFACE PARA EL PATRÓN DECORATOR ---------

class ReporteDecorator(ReporteBase):
    """
    Esta clase decoradora será la base para todos los decoradores.
    Asegura que la interfaz del decorador mantenga la estructura de `ReporteBase`.
    """

    def __init__(self, reporte: ReporteBase):
        self.reporte = reporte

    def generar_reporte(self, data):
        """
        Llamamos al método `generar_reporte` del objeto `reporte` decorado.
        """
        return self.reporte.generar_reporte(data)


class ReporteConFiltro(ReporteDecorator):
    """
    Decorador para agregar filtros al reporte.
    """

    def __init__(self, reporte: ReporteBase, filtro):
        super().__init__(reporte)
        self.filtro = filtro

    def generar_reporte(self, data):
        # Aquí puedes aplicar lógica para filtrar datos antes de generar el reporte
        data_filtrada = self.filtrar_datos(data)
        return super().generar_reporte(data_filtrada)

    def filtrar_datos(self, data):
        """
        Implementa el filtro para los datos.
        """
        return data  # Implementa la lógica de filtrado


class ReporteConFormato(ReporteDecorator):
    """
    Decorador para aplicar formato adicional al reporte (por ejemplo, HTML o PDF).
    """

    def __init__(self, reporte: ReporteBase, formato):
        super().__init__(reporte)
        self.formato = formato

    def generar_reporte(self, data):
        reporte_generado = super().generar_reporte(data)
        return self.aplicar_formato(reporte_generado)

    def aplicar_formato(self, reporte_generado):
        """
        Aplica el formato al reporte generado.
        """
        return f"{reporte_generado} con formato {self.formato}"
