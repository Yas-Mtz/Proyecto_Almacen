from django.db import connection

from abc import ABC, abstractmethod

# Clase base de Command


class Command(ABC):
    @abstractmethod
    def execute(self):
        pass

# Comando para agregar un artículo


class AgregarProductoCommand(Command):
    def __init__(self, id_articulo, nom_articulo, desc_articulo, cantidad, id_estatus, qr_articulo):
        self.id_articulo = id_articulo
        self.nom_articulo = nom_articulo
        self.desc_articulo = desc_articulo
        self.cantidad = cantidad
        self.id_estatus = id_estatus
        self.qr_articulo = qr_articulo

    def execute(self):
        with connection.cursor() as cursor:
            cursor.callproc('RegistrarArticulo', [
                self.id_articulo,
                self.nom_articulo,
                self.desc_articulo,
                self.cantidad,
                self.id_estatus,
                self.qr_articulo
            ])
        return f"Artículo {self.nom_articulo} agregado exitosamente."

# Comando para actualizar un artículo


class ActualizarProductoCommand(Command):
    def __init__(self, id_articulo, nom_articulo, desc_articulo, cantidad, id_estatus, qr_articulo):
        self.id_articulo = id_articulo
        self.nom_articulo = nom_articulo
        self.desc_articulo = desc_articulo
        self.cantidad = cantidad
        self.id_estatus = id_estatus
        self.qr_articulo = qr_articulo

    def execute(self):
        with connection.cursor() as cursor:
            cursor.callproc('ActualizarArticulo', [
                self.id_articulo,
                self.nom_articulo,
                self.desc_articulo,
                self.cantidad,
                self.id_estatus,
                self.qr_articulo
            ])
        return f"Artículo {self.nom_articulo} actualizado exitosamente."
