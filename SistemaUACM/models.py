from django.db import models
from django.contrib.auth.hashers import make_password
from datetime import datetime


class Almacen(models.Model):
    id_almacen = models.AutoField(primary_key=True)
    tipo_almacen = models.CharField(max_length=250, null=False)
    direccion = models.CharField(max_length=250)
    telefono = models.CharField(max_length=20)
    correo = models.CharField(max_length=250)


class Personal(models.Model):
    id_persona = models.AutoField(primary_key=True)
    id_rol = models.ForeignKey('Rol', on_delete=models.CASCADE)
    nombre = models.CharField(max_length=255)
    apellido_paterno = models.CharField(max_length=255)
    apellido_materno = models.CharField(max_length=255)
    telefono = models.CharField(max_length=15)
    correo = models.EmailField()


class Rol(models.Model):
    id_rol = models.AutoField(primary_key=True)
    nombre_rol = models.CharField(max_length=250, null=False)
