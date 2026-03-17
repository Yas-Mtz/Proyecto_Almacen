from django.db import models
from django.utils import timezone
from SistemaUACM.models import Almacen, Personal
from GestiondeProductos.models import Producto


class EstatusSolicitud(models.Model):
    id_estatus_solicitud = models.AutoField(primary_key=True, db_column='id_estatus_solicitud')
    nombre_estatus = models.CharField(max_length=100, db_column='nombre_estatus')

    class Meta:
        db_table = 'estatus_solicitud'

    def __str__(self):
        return self.nombre_estatus


class Solicitud(models.Model):
    id_solicitud = models.AutoField(primary_key=True, db_column='id_solicitud')
    id_almacen = models.ForeignKey(
        Almacen,
        on_delete=models.DO_NOTHING,
        null=True,
        blank=True,
        db_column='id_almacen'
    )
    id_personal = models.ForeignKey(
        Personal,
        on_delete=models.DO_NOTHING,
        null=True,
        blank=True,
        db_column='id_personal'
    )
    fecha_solicitud = models.DateTimeField(default=timezone.now, db_column='fecha_solicitud')
    observaciones_solicitud = models.CharField(
        max_length=300,
        null=True,
        blank=True,
        db_column='observaciones_solicitud'
    )
    id_estatus = models.ForeignKey(
        EstatusSolicitud,
        on_delete=models.DO_NOTHING,
        null=True,
        blank=True,
        db_column='id_estatus',
        default=1
    )

    class Meta:
        db_table = 'solicitud'
        verbose_name_plural = 'Solicitudes'

    def __str__(self):
        return f'Solicitud #{self.id_solicitud}'


class DetalleSolicitud(models.Model):
    id_detalle = models.AutoField(primary_key=True, db_column='id_detalle')
    id_solicitud = models.ForeignKey(
        Solicitud,
        on_delete=models.CASCADE,
        db_column='id_solicitud'
    )
    id_producto = models.ForeignKey(
        Producto,
        on_delete=models.DO_NOTHING,
        db_column='id_producto'
    )
    cantidad = models.IntegerField(db_column='cantidad')

    class Meta:
        db_table = 'detalle_solicitud'
        unique_together = ('id_solicitud', 'id_producto')

    def __str__(self):
        return f'{self.id_producto.nombre_producto} ({self.cantidad})'
