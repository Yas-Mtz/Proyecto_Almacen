from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('Solicitudes', '0006_add_cantidad_recibida_detalle'),
    ]

    operations = [
        migrations.AddField(
            model_name='solicitud',
            name='id_solicitud_origen',
            field=models.ForeignKey(
                'self',
                on_delete=django.db.models.deletion.DO_NOTHING,
                null=True,
                blank=True,
                db_column='id_solicitud_origen',
                related_name='solicitudes_seguimiento',
            ),
        ),
    ]
