from django.db import models

# Modelo de Core (Estatus, TipoAlmacen, EstadoAlmacen)
class Estatus(models.Model):
    id_estatus = models.AutoField(primary_key=True, db_column='id_estatus')
    nombre_estatus = models.CharField(max_length=100, db_column='nombre_estatus')

    class Meta:
        db_table = 'estatus'
        managed = False
        verbose_name_plural = 'estatus'

    def __str__(self):
        return self.nombre_estatus


class TipoAlmacen(models.Model):
    id_talmacen = models.AutoField(primary_key=True, db_column='id_talmacen')
    tipo_almacen = models.CharField(max_length=50, db_column='tipo_almacen')

    class Meta:
        db_table = 'tipo_almacen'
        managed = False

    def __str__(self):
        return self.tipo_almacen


class EstadoAlmacen(models.Model):
    id_estado_almacen = models.AutoField(primary_key=True, db_column='id_estado_almacen')
    nombre_estado_almacen = models.CharField(max_length=50, db_column='nombre_estado_almacen')

    class Meta:
        db_table = 'estado_almacen'
        managed = False

    def __str__(self):
        return self.nombre_estado_almacen


# Modelo de Personal
class Rol(models.Model):
    id_rol = models.AutoField(primary_key=True, db_column='id_rol')
    nombre_rol = models.CharField(max_length=25, db_column='nombre_rol')

    class Meta:
        db_table = 'rol'
        managed = False  # Crucial para evitar creación de tablas

    def __str__(self):
        return self.nombre_rol


class CategoriaSalarial(models.Model):
    id_cat_sal = models.AutoField(primary_key=True, db_column='id_cat_sal')
    categoria_salarial = models.CharField(max_length=50, db_column='categoria_salarial')
    descripcion = models.CharField(max_length=200, db_column='descripcion')

    class Meta:
        db_table = 'categoria_salarial'
        managed = False


class Personal(models.Model):
    id_personal = models.IntegerField(primary_key=True, db_column='id_personal')
    id_rol = models.ForeignKey(Rol, on_delete=models.DO_NOTHING, db_column='id_rol')
    nombre_personal = models.CharField(max_length=50, db_column='nombre_personal')
    apellido_paterno = models.CharField(max_length=50, db_column='apellido_paterno')
    apellido_materno = models.CharField(max_length=50, null=True, blank=True, db_column='apellido_materno')
    telefono = models.CharField(max_length=10, db_column='telefono')
    correo = models.EmailField(max_length=250, db_column='correo')
    id_categoria_sal = models.ForeignKey(
        CategoriaSalarial, 
        on_delete=models.DO_NOTHING, 
        null=True, 
        blank=True, 
        db_column='id_categoria_sal'
    )

    class Meta:
        db_table = 'personal'
        managed = False

    def __str__(self):
        return f"{self.nombre_personal} {self.apellido_paterno}"


# Modelo de Almacen
class Almacen(models.Model):
    id_almacen = models.AutoField(primary_key=True, db_column='id_almacen')
    id_talmacen = models.ForeignKey(TipoAlmacen, on_delete=models.DO_NOTHING, db_column='id_talmacen')
    direccion = models.CharField(max_length=250, db_column='direccion')
    correo = models.EmailField(max_length=250, null=True, blank=True, db_column='correo')
    telefono = models.CharField(max_length=10, null=True, blank=True, db_column='telefono')
    capacidad_maxima = models.IntegerField(db_column='capacidad_maxima')
    id_estado_almacen = models.ForeignKey(EstadoAlmacen, on_delete=models.DO_NOTHING, db_column='id_estado_almacen')
    id_responsable = models.OneToOneField(
        Personal,
        on_delete=models.DO_NOTHING,
        null=True,
        blank=True,
        db_column='id_responsable'
    )

    class Meta:
        db_table = 'almacen'
        managed = False  # Evita que Django cree/modifique la tabla

    def __str__(self):
        return f"Almacen {self.id_almacen} - {self.direccion}"
