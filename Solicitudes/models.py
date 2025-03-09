from django.db import models

# Modelo de Almacen


class TipoAlmacen(models.Model):
    tipo_almacen = models.CharField(max_length=50)

    def __str__(self):
        return self.tipo_almacen


class Almacen(models.Model):
    tipo_almacen = models.ForeignKey(TipoAlmacen, on_delete=models.CASCADE)
    direccion = models.CharField(max_length=250)
    correo = models.EmailField(max_length=250, null=True, blank=True)
    telefono = models.CharField(max_length=10, null=True, blank=True)

    def __str__(self):
        return f'{self.direccion} ({self.tipo_almacen})'


# Modelo de Personal
class Rol(models.Model):
    nombre_rol = models.CharField(max_length=25)

    def __str__(self):
        return self.nombre_rol


class Personal(models.Model):
    rol = models.ForeignKey(Rol, on_delete=models.CASCADE)
    nombre_persona = models.CharField(max_length=50)
    ap_pat = models.CharField(max_length=50)
    ap_mat = models.CharField(max_length=50, null=True, blank=True)
    telefono = models.CharField(max_length=10, null=True, blank=True)
    correo = models.EmailField(max_length=250, null=True, blank=True)

    def __str__(self):
        return f'{self.nombre_persona} {self.ap_pat}'


# Modelo de Estatus
class Estatus(models.Model):
    nomb_estatus = models.CharField(max_length=100)

    def __str__(self):
        return self.nomb_estatus


# Modelo de Articulos
class Articulo(models.Model):
    estatus = models.ForeignKey(Estatus, on_delete=models.CASCADE)
    nom_articulo = models.CharField(max_length=100)
    desc_articulo = models.CharField(max_length=300)
    cantidad = models.IntegerField()
    qr_articulo = models.CharField(max_length=250, null=True, blank=True)

    def __str__(self):
        return self.nom_articulo


# Modelo de Solicitudes
class Solicitud(models.Model):
    almacen = models.ForeignKey(Almacen, on_delete=models.CASCADE)
    personal = models.ForeignKey(Personal, on_delete=models.CASCADE)
    articulo = models.ForeignKey(Articulo, on_delete=models.CASCADE)
    cantidad = models.IntegerField()
    fecha_sol = models.DateTimeField()

    def __str__(self):
        return f'Solicitud de {self.cantidad} de {self.articulo} por {self.personal}'
