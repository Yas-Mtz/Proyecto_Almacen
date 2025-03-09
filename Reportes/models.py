# Importamos el modelo Articulo de GestiondeProductos
from GestiondeProductos.models import Articulo
from django.db import models
from django.core.exceptions import ValidationError

# Modelo para la tabla tipo_almacen


class TipoAlmacen(models.Model):
    tipo_almacen = models.CharField(max_length=50, unique=True)

    def __str__(self):
        return self.tipo_almacen

    class Meta:
        db_table = 'tipo_almacen'


# Modelo para la tabla almacen
class Almacen(models.Model):
    tipo_almacen = models.ForeignKey(TipoAlmacen, on_delete=models.PROTECT)
    direccion = models.CharField(max_length=250)
    correo = models.EmailField(null=True, blank=True)
    telefono = models.CharField(max_length=10, null=True, blank=True)

    def __str__(self):
        return f"Almacen {self.id} - {self.direccion}"

    class Meta:
        db_table = 'almacen'


# Modelo para la tabla solicitudes en Reportes
class Solicitudes(models.Model):
    id_solicitud = models.AutoField(primary_key=True)
    id_almacen = models.IntegerField()
    id_personal = models.IntegerField()
    id_articulo = models.IntegerField()
    cantidad = models.IntegerField()
    fecha_sol = models.DateTimeField()

    def save(self, *args, **kwargs):
        # Lógica para actualizar el inventario al hacer una solicitud
        articulo = self.id_articulo
        if articulo.cantidad >= self.cantidad:
            articulo.cantidad -= self.cantidad
            articulo.save()
            super().save(*args, **kwargs)
        else:
            raise ValidationError(
                "No hay suficiente cantidad en inventario para realizar la solicitud."
            )

    def __str__(self):
        return f"Solicitud {self.id} - Artículo: {self.id_articulo.nom_articulo}"

    class Meta:
        db_table = 'solicitudes'
