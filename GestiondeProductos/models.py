from django.db import models


class Estatus(models.Model):
    id_estatus = models.AutoField(primary_key=True)
    nomb_estatus = models.CharField(max_length=100)

    def __str__(self):
        return self.nomb_estatus

    class Meta:
        db_table = 'estatus'


class Articulo(models.Model):
    id_articulo = models.AutoField(primary_key=True)
    # Asegura que el nombre de la columna sea correcto
    id_estatus = models.ForeignKey(
        Estatus, on_delete=models.CASCADE, db_column='id_estatus')
    nom_articulo = models.CharField(max_length=100)
    # Asegúrate de que este campo esté bien referenciado
    # Este es el campo de descripción
    desc_articulo = models.CharField(max_length=300)
    cantidad = models.IntegerField()
    qr_articulo = models.CharField(max_length=250)

    def __str__(self):
        return self.nom_articulo

    class Meta:
        db_table = 'articulos'  # Asegura que la tabla se llame 'articulos'
