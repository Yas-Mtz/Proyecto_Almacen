from django.db import models

class Estatus(models.Model):
    id_estatus = models.AutoField(primary_key=True, db_column='id_estatus')
    nombre_estatus = models.CharField(max_length=100, db_column='nombre_estatus')

    class Meta:
        db_table = 'estatus'
        managed = False  # Ajusta según necesites
        verbose_name_plural = 'estatus'

    def __str__(self):
        return self.nombre_estatus


class CategoriaProducto(models.Model):
    id_categoria = models.AutoField(primary_key=True, db_column='id_categoria')
    nombre_categoria = models.CharField(max_length=100, db_column='nombre_categoria')
    descripcion_categoria = models.CharField(max_length=300, db_column='descripcion_categoria')
    fecha_creacion = models.DateTimeField(auto_now_add=True, db_column='fecha_creacion')

    class Meta:
        db_table = 'categoria_producto'
        managed = False  # Ajusta según necesites
        verbose_name = 'Categoría de Producto'
        verbose_name_plural = 'Categorías de Producto'

    def __str__(self):
        return self.nombre_categoria


class UnidadMedida(models.Model):
    id_unidad = models.AutoField(primary_key=True, db_column='id_unidad')
    nombre_unidad = models.CharField(max_length=50, db_column='nombre_unidad')
    abreviatura = models.CharField(max_length=5, db_column='abreviatura')

    class Meta:
        db_table = 'unidad_medida'
        managed = False  # Ajusta según necesites
        verbose_name = 'Unidad de Medida'
        verbose_name_plural = 'Unidades de Medida'

    def __str__(self):
        return f"{self.nombre_unidad} ({self.abreviatura})"

#cambios 
class Marca(models.Model):
    id_marca = models.AutoField(primary_key=True, db_column='id_marca')
    nombre_marca = models.CharField(max_length=100, db_column='nombre_marca')

    class Meta:
        db_table = 'marca'
        managed = False  # Ajusta según necesites
        verbose_name = 'Marca'
        verbose_name_plural = 'Marcas'

    def __str__(self):
        return self.nombre_marca



class Producto(models.Model):
    id_producto = models.AutoField(primary_key=True, db_column='id_producto')
    estatus = models.ForeignKey(
        Estatus,
        on_delete=models.DO_NOTHING,
        db_column='id_estatus',
        null=True,
        blank=True,
        verbose_name='Imagen del Producto'
    )
    categoria = models.ForeignKey(
        CategoriaProducto,
        on_delete=models.DO_NOTHING,
        db_column='id_categoria',
        null=True,
        blank=True
    )
    marca = models.ForeignKey(
        Marca,
        on_delete=models.DO_NOTHING,
        db_column='id_marca',
        null=True,
        blank=True
    )
    unidad = models.ForeignKey(
        UnidadMedida,
        on_delete=models.DO_NOTHING,
        db_column='id_unidad',
        null=True,
        blank=True
    )
    nombre_producto = models.CharField(max_length=100, db_column='nombre_producto')
    descripcion_producto = models.CharField(
        max_length=300,
        db_column='descripcion_producto',
        null=True,
        blank=True
    )
    cantidad = models.IntegerField(db_column='cantidad')
    stock_minimo = models.IntegerField(db_column='stock_minimo')
    observaciones = models.CharField(
        max_length=300,
        db_column='observaciones',
        null=True,
        blank=True
    )
    fecha_creacion = models.DateTimeField(auto_now_add=True, db_column='fecha_creacion')
    imagen_producto = models.CharField(
        max_length=250,
        db_column='imagen_producto',
        null=True,
        blank=True
    )

    class Meta:
        db_table = 'producto'
        managed = False  # Ajusta según necesites
        verbose_name = 'Producto'
        verbose_name_plural = 'Productos'

    def __str__(self):
        return self.nombre_producto

    @property
    def necesita_reabastecimiento(self):
        return self.cantidad <= self.stock_minimo
