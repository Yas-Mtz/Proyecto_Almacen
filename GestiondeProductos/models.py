from django.db import models

# Create your models here.


class articulos(models.Model):
    id_articulo = models.AutoField(primary_key=True)
    nombre_articulo = models.CharField(max_length=250, null=False)
    descripcion_articulo = models.CharField(max_length=250, null=False)
    cantidad_articulo = models.IntegerField(null=False)
    id_estatus = models.ForeignKey('estatus', on_delete=models.CASCADE)
    qr_articulo = models.CharField(max_length=250, null=True)


class estatus(models.Model):
    id_estatus = models.AutoField(primary_key=True)
    nombre_estatus = models.CharField(max_length=250, null=False)
