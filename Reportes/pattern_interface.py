from abc import ABC, abstractmethod

# Interfaz de Comando


class ReporteCommand(ABC):
    """Interfaz base para los comandos de reporte."""

    @abstractmethod
    def execute(self, data):
        """Método que ejecuta el comando con los datos proporcionados."""
        pass


# Interfaz de Estrategia

class ReporteStrategy(ABC):
    """Interfaz de estrategia para generar reportes."""

    @abstractmethod
    def generar_reporte(self, data):
        """Método para generar el reporte con los datos proporcionados."""
        pass


# Interfaz de ReporteBase

class ReporteBase(ABC):
    """Interfaz base para los reportes."""

    @abstractmethod
    def validar_datos(self, data):
        """Método para validar los datos del reporte."""
        pass

    @abstractmethod
    def formatear_datos(self, data):
        """Método para formatear los datos del reporte."""
        pass

    @abstractmethod
    def generar_pdf(self, data):
        """Método para generar el archivo PDF del reporte."""
        pass

    @abstractmethod
    def generar_reporte(self, data):
        """Método para generar el reporte completo."""
        pass


# Interfaz de Decorador para reportes con filtros

class ReporteConFiltro(ReporteBase):
    """Decorador que aplica un filtro adicional al reporte."""

    def __init__(self, reporte, filtro):
        self.reporte = reporte
        self.filtro = filtro

    @abstractmethod
    def validar_datos(self, data):
        pass

    @abstractmethod
    def formatear_datos(self, data):
        pass

    @abstractmethod
    def generar_pdf(self, data):
        pass


# Interfaz de Decorador para reportes con formato

class ReporteConFormato(ReporteBase):
    """Decorador que aplica un formato adicional al reporte."""

    def __init__(self, reporte, formato):
        self.reporte = reporte
        self.formato = formato

    @abstractmethod
    def validar_datos(self, data):
        pass

    @abstractmethod
    def formatear_datos(self, data):
        pass

    @abstractmethod
    def generar_pdf(self, data):
        pass
