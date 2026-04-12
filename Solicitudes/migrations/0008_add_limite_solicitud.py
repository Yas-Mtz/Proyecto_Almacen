from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('Solicitudes', '0007_add_solicitud_origen'),
    ]

    operations = [
        migrations.RunSQL(
            sql="SELECT 1",  # tabla ya existe en BD
            reverse_sql="DROP TABLE IF EXISTS limite_solicitud",
        ),
    ]
