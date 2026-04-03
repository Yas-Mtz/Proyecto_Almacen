from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('Solicitudes', '0004_rename_aprobado_por_to_gestionado_por'),
    ]

    operations = [
        migrations.RunSQL(
            sql=[
                "ALTER TABLE solicitud CHANGE COLUMN aprobado_por gestionado_por INT NULL;",
                "ALTER TABLE solicitud CHANGE COLUMN fecha_aprobacion fecha_gestion DATETIME(6) NULL;",
            ],
            reverse_sql=[
                "ALTER TABLE solicitud CHANGE COLUMN gestionado_por aprobado_por INT NULL;",
                "ALTER TABLE solicitud CHANGE COLUMN fecha_gestion fecha_aprobacion DATETIME(6) NULL;",
            ],
        ),
    ]
