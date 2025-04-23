from django.db import models
from SistemaUACM.models import Almacen, Personal
from GestiondeProductos.models import Producto
from datetime import datetime


ESTADOS_SOLICITUD = [
    ('PEND', 'Pendiente'),
    ('APRO', 'Aprobada'),
    ('CANC', 'Cancelada'),
    ('COMP', 'Completada')
]

# Modelo de Solicitud
class Solicitud(models.Model):
    id_solicitud = models.AutoField(primary_key=True, db_column='id_solicitud')
    estado = models.CharField(max_length=4, choices=ESTADOS_SOLICITUD, default='PEND')
    id_almacen = models.ForeignKey(
        Almacen,
        on_delete=models.CASCADE,
        db_column='id_almacen'
    )
    id_personal = models.ForeignKey(
        Personal,
        on_delete=models.CASCADE,
        db_column='id_personal'
    )
    fecha_solicitud = models.DateTimeField(
        db_column='fecha_solicitud',
        default=models.functions.Now()  # Por defecto la fecha y hora actual
    )
    observaciones_solicitud = models.CharField(
        max_length=300,
        null=True,
        blank=True,
        db_column='observaciones_solicitud'
    )

    class Meta:
        db_table = 'solicitud'  # Nombre de la tabla en la base de datos
        verbose_name_plural = 'Solicitudes'  # Nombre plural para el modelo

    def __str__(self):
        return f'Solicitud #{self.id_solicitud} de {self.id_personal} en {self.id_almacen}'

# Modelo de Detalle de Solicitud (Productos solicitados)
class DetalleSolicitud(models.Model):
    id_solicitud = models.ForeignKey(
        Solicitud,
        on_delete=models.CASCADE,
        db_column='id_solicitud'
    )
    id_producto = models.ForeignKey(
        Producto,
        on_delete=models.CASCADE,
        db_column='id_producto'
    )
    cantidad = models.IntegerField(
        db_column='cantidad'
    )

    class Meta:
        db_table = 'detalle_solicitud'  # Nombre de la tabla en la base de datos
        unique_together = ('id_solicitud', 'id_producto')  # Asegura que un producto no se repita en una solicitud

    def __str__(self):
        return f'{self.id_producto.nombre_producto} ({self.cantidad})'

