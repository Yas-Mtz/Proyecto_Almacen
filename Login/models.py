from django.db import models
from django.contrib.auth.models import User


class PerfilUsuario(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='perfil')
    id_personal = models.IntegerField(null=True, blank=True)

    class Meta:
        db_table = 'perfil_usuario'
