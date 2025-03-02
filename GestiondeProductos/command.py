from .models import Articulo, Estatus
from .interfaz import Command
from django.db import transaction

# Comando para agregar un producto


class AgregarProductoCommand(Command):
    def __init__(self, id_articulo, nom_articulo, desc_articulo, cantidad, id_estatus, qr_articulo):
        self.id_articulo = id_articulo
        self.nom_articulo = nom_articulo
        self.desc_articulo = desc_articulo
        self.cantidad = cantidad
        self.id_estatus = id_estatus
        self.qr_articulo = qr_articulo  # Ahora se almacena el QR

    def execute(self):
        try:
            estatus_obj = Estatus.objects.get(id_estatus=self.id_estatus)
            nuevo_producto = Articulo(
                id_articulo=self.id_articulo,
                nom_articulo=self.nom_articulo,
                desc_articulo=self.desc_articulo,
                cantidad=self.cantidad,
                id_estatus=estatus_obj,
                qr_articulo=self.qr_articulo  # Se guarda el QR generado
            )
            nuevo_producto.save()
            return f"Artículo {self.nom_articulo} agregado exitosamente."
        except Estatus.DoesNotExist:
            return "Error: Estatus no válido."

# Comando para actualizar un producto


class ActualizarProductoCommand(Command):
    def __init__(self, id_articulo, nom_articulo, desc_articulo, cantidad, id_estatus, qr_articulo=None):
        self.id_articulo = id_articulo
        self.nom_articulo = nom_articulo
        self.desc_articulo = desc_articulo
        self.cantidad = cantidad
        self.id_estatus = id_estatus
        self.qr_articulo = qr_articulo  # Si no se pasa, conserva el existente

    def execute(self):
        try:
            producto = Articulo.objects.get(id_articulo=self.id_articulo)
            estatus_obj = Estatus.objects.get(id_estatus=self.id_estatus)

            producto.nom_articulo = self.nom_articulo
            producto.desc_articulo = self.desc_articulo
            producto.cantidad = self.cantidad
            producto.id_estatus = estatus_obj

            # Solo actualizar el QR si se proporciona uno nuevo
            if self.qr_articulo:
                producto.qr_articulo = self.qr_articulo

            producto.save()
            return f"Artículo {self.nom_articulo} actualizado exitosamente."
        except Articulo.DoesNotExist:
            return "Error: Producto no encontrado."
        except Estatus.DoesNotExist:
            return "Error: Estatus no válido."
