from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('Solicitudes', '0003_alter_solicitud_aprobado_por'),
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
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.RenameField('solicitud', 'aprobado_por', 'gestionado_por'),
                migrations.RenameField('solicitud', 'fecha_aprobacion', 'fecha_gestion'),
            ],
            database_operations=[],
        ),
    ]
