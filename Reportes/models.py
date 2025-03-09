# Importamos el modelo Articulo de GestiondeProductos
from GestiondeProductos.models import Articulo, Estatus
from django.db import models

# Modelo para la tabla tipo_almacen


class TipoAlmacen(models.Model):
    tipo_almacen = models.CharField(max_length=50)

    def __str__(self):
        return self.tipo_almacen

    class Meta:
        db_table = 'tipo_almacen'


# Modelo para la tabla almacen
class Almacen(models.Model):
    tipo_almacen = models.ForeignKey(TipoAlmacen, on_delete=models.CASCADE)
    direccion = models.CharField(max_length=250)
    correo = models.EmailField(null=True, blank=True)
    telefono = models.CharField(max_length=10, null=True, blank=True)

    def __str__(self):
        return f"Almacen {self.id_almacen} - {self.direccion}"

    class Meta:
        db_table = 'almacen'


# Modelo para la tabla solicitudes en Reportes
class Solicitudes(models.Model):
    id_almacen = models.ForeignKey(Almacen, on_delete=models.CASCADE)
    # Usamos el modelo Articulo de GestiondeProductos
    id_articulo = models.ForeignKey(Articulo, on_delete=models.CASCADE)
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
            raise ValueError(
                "No hay suficiente cantidad en inventario para realizar la solicitud.")

    def __str__(self):
        return f"Solicitud {self.id_solicitud} - Articulo: {self.id_articulo.nom_articulo}"

    class Meta:
        db_table = 'solicitudes'
