from django.db import connection

# Interfaz de Comando


class ReporteCommand:
    """Interfaz base para los comandos de reporte."""

    def execute(self, data):
        raise NotImplementedError("Método no implementado en la clase base")


# Comandos de Reporte

class ReporteProductosCommand(ReporteCommand):
    """Comando para generar el reporte de productos."""

    def execute(self, data):
        reporte = ReporteProductosStrategy()
        return reporte.generar_reporte(data)


class ReporteInventarioCommand(ReporteCommand):
    """Comando para generar el reporte de inventario."""

    def execute(self, data):
        reporte = ReporteInventarioStrategy()
        return reporte.generar_reporte(data)


# Interfaz de Estrategia

class ReporteStrategy:
    """Interfaz de estrategia para generar reportes."""

    def generar_reporte(self, data):
        raise NotImplementedError("Método no implementado en la clase base")


# Estrategias de Reporte

class ReporteProductosStrategy(ReporteStrategy):
    """Estrategia para generar el reporte de productos."""

    def generar_reporte(self, data):
        reporte = ReporteProductos()
        return reporte.generar_reporte(data)


class ReporteInventarioStrategy(ReporteStrategy):
    """Estrategia para generar el reporte de inventario."""

    def generar_reporte(self, data):
        reporte = ReporteInventario()
        return reporte.generar_reporte(data)


# Clase base para reportes

class ReporteBase:
    """Clase base para los reportes."""

    def validar_datos(self, data):
        raise NotImplementedError("Método no implementado en la clase base")

    def formatear_datos(self, data):
        raise NotImplementedError("Método no implementado en la clase base")

    def generar_pdf(self, data):
        raise NotImplementedError("Método no implementado en la clase base")

    def generar_reporte(self, data):
        """Genera el reporte completo."""
        if not self.validar_datos(data):
            return "Datos inválidos"

        datos_formateados = self.formatear_datos(data)
        pdf_resultado = self.generar_pdf(data)
        return f"{datos_formateados}: {pdf_resultado}"


# Decoradores para reportes

class ReporteConFiltro(ReporteBase):
    """Decorador que aplica un filtro adicional al reporte."""

    def __init__(self, reporte, filtro):
        self.reporte = reporte
        self.filtro = filtro

    def validar_datos(self, data):
        return self.reporte.validar_datos(data)

    def formatear_datos(self, data):
        data['filtro'] = self.filtro
        return self.reporte.formatear_datos(data)

    def generar_pdf(self, data):
        return self.reporte.generar_pdf(data)


class ReporteConFormato(ReporteBase):
    """Decorador que aplica un formato adicional al reporte."""

    def __init__(self, reporte, formato):
        self.reporte = reporte
        self.formato = formato

    def validar_datos(self, data):
        return self.reporte.validar_datos(data)

    def formatear_datos(self, data):
        data['formato'] = self.formato
        return self.reporte.formatear_datos(data)

    def generar_pdf(self, data):
        resultado = self.reporte.generar_pdf(data)
        if self.formato == "PDF":
            return f"{resultado} en formato PDF"
        elif self.formato == "Excel":
            return f"{resultado} en formato Excel"
        return resultado


# Estrategias de reportes

class ReporteProductos(ReporteBase):
    """Estrategia para generar reportes de productos sin procedimiento almacenado."""

    def validar_datos(self, data):
        return data["fecha_inicio"] and data["fecha_fin"]

    def formatear_datos(self, data):
        return f"Reporte de Productos ({data['fecha_inicio']} - {data['fecha_fin']})"

    def generar_pdf(self, data):
        query = """
            SELECT id_producto, descripcion, cantidad, fecha_ingreso 
            FROM productos 
            WHERE fecha_ingreso BETWEEN %s AND %s
        """
        with connection.cursor() as cursor:
            cursor.execute(query, [data["fecha_inicio"], data["fecha_fin"]])
            resultados = cursor.fetchall()

        return f"PDF con {len(resultados)} productos" if resultados else "No hay datos"


class ReporteInventario(ReporteBase):
    """Estrategia para generar reportes de inventario sin procedimiento almacenado."""

    def validar_datos(self, data):
        return data["fecha_inicio"] and data["fecha_fin"]

    def formatear_datos(self, data):
        return f"Reporte de Inventario ({data['fecha_inicio']} - {data['fecha_fin']})"

    def generar_pdf(self, data):
        query = """
            SELECT id_producto, cantidad_actual, ubicacion 
            FROM inventario 
            WHERE fecha_actualizacion BETWEEN %s AND %s
        """
        with connection.cursor() as cursor:
            cursor.execute(query, [data["fecha_inicio"], data["fecha_fin"]])
            resultados = cursor.fetchall()

        return f"PDF con {len(resultados)} artículos en inventario" if resultados else "No hay datos"


# Clase principal para generar reportes

class GeneradorDeReportes:
    """Clase principal que selecciona la estrategia y aplica decoradores si es necesario."""

    def __init__(self, tipo_reporte, aplicar_filtro=False, aplicar_formato=None):
        self.tipo_reporte = tipo_reporte
        self.aplicar_filtro = aplicar_filtro
        self.aplicar_formato = aplicar_formato
        self.reporte_command = self.seleccionar_comando()

    def seleccionar_comando(self):
        if self.tipo_reporte == "productos":
            return ReporteProductosCommand()
        elif self.tipo_reporte == "inventario":
            return ReporteInventarioCommand()
        else:
            raise ValueError("Tipo de reporte no válido")

    def generar(self, data):
        return self.reporte_command.execute(data)
