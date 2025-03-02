from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('GestiondeProductos', '0001_initial'),
    ]

    operations = [
        # Eliminamos la operación que cambia el nombre de la tabla
        # migrations.AlterModelTable(
        #     name='articulo',
        #     table='articulos',
        # ),
    ]
