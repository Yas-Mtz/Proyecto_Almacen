from django.db import models
from SistemaUACM.models import Almacen, Personal  # Importando Almacen y Personal desde SistemaUACM.models
from GestiondeProductos.models import Producto
from Solicitudes.models import Solicitud  # Cambiado a la app 'Solicitudes'

from datetime import datetime

class ReporteSolicitud(models.Model):
    # Campos relacionados con la solicitud
    id_solicitud = models.ForeignKey(Solicitud, on_delete=models.DO_NOTHING, db_column='id_solicitud')
    nombre_personal = models.CharField(max_length=100, db_column='nombre_personal')
    nombre_almacen = models.CharField(max_length=250, db_column='nombre_almacen')
    nombre_producto = models.CharField(max_length=100, db_column='nombre_producto')
    cantidad_solicitada = models.IntegerField(db_column='cantidad_solicitada')
    fecha_solicitud = models.DateTimeField(db_column='fecha_solicitud')

    # Método para obtener el reporte
    @classmethod
    def generar_reporte(cls, fecha_inicio=None, fecha_fin=None):
        """Genera el reporte de solicitudes filtrado por fecha (si es necesario)"""
        reportes = cls.objects.all()

        # Filtro por fecha si se pasa como parámetro
        if fecha_inicio and fecha_fin:
            reportes = reportes.filter(fecha_solicitud__range=[fecha_inicio, fecha_fin])

        return reportes

    class Meta:
        db_table = 'reporte_solicitud'  # Este es un modelo de reporte, no una tabla física
        managed = False  # Evita que Django cree/modifique la tabla
        verbose_name_plural = 'Reportes de Solicitudes'

    def __str__(self):
        return f"Reporte de solicitud #{self.id_solicitud} - {self.nombre_personal} ({self.nombre_almacen})"
