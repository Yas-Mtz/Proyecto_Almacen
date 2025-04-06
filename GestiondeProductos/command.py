from .models import Producto, Estatus
from .pattern_interface import Command
from django.shortcuts import get_object_or_404


class ProductoCommand(Command):
    def __init__(self, id_producto, nom_producto, desc_producto, cantidad, id_estatus, qr_producto=None):
        self.id_producto = id_producto
        self.nom_producto = nom_producto
        self.desc_producto = desc_producto
        self.cantidad = cantidad
        self.id_estatus = id_estatus
        self.qr_producto = qr_producto

    def _get_estatus(self):
        """Obtiene el objeto de estatus."""
        return get_object_or_404(Estatus, id_estatus=self.id_estatus)

    def _actualizar_producto(self, producto, estatus_obj):
        """Actualiza un producto existente sin modificar la cantidad."""
        producto.nom_producto = self.nom_producto
        producto.desc_producto = self.desc_producto
        producto.id_estatus = estatus_obj

        if self.qr_producto:
            producto.qr_producto = self.qr_producto

        # Si es una actualización, sumamos la nueva cantidad
        producto.cantidad += self.cantidad
        producto.save()

    def execute(self):
        try:
            # Comprobar si ya existe un producto con el mismo nombre, pero distinto ID
            producto_existente = Producto.objects.filter(
                nom_producto=self.nom_producto).exclude(id_producto=self.id_producto).first()

            if producto_existente:
                # Si el producto ya existe con el mismo nombre, devolvemos un mensaje
                return f"El producto con el nombre '{self.nom_producto}' ya existe en la base de datos con un ID diferente."

            # Si no existe el producto, obtenemos el estatus
            estatus_obj = self._get_estatus()
            producto = Producto.objects.filter(
                id_producto=self.id_producto).first()

            if producto:
                # Si el producto existe, actualizamos su información
                self._actualizar_producto(producto, estatus_obj)
                return f"Producto {self.nom_producto} actualizado exitosamente."
            else:
                # Si el producto no existe, lo creamos con la cantidad proporcionada
                nuevo_producto = Producto(
                    id_producto=self.id_producto,
                    nom_producto=self.nom_producto,
                    desc_producto=self.desc_producto,
                    cantidad=self.cantidad,  # Cantidad inicial sin sumas extra
                    id_estatus=estatus_obj,
                    qr_producto=self.qr_producto
                )
                nuevo_producto.save()
                return f"Producto {self.nom_producto} agregado exitosamente."
        except Exception as e:
            return f"Error: {str(e)}"


# Comando para agregar un producto
class AgregarProductoCommand(ProductoCommand):
    def __init__(self, id_producto, nom_producto, desc_producto, cantidad, id_estatus, qr_producto):
        super().__init__(id_producto, nom_producto,
                         desc_producto, cantidad, id_estatus, qr_producto)

    def execute(self):
        return super().execute()


# Comando para actualizar un producto
class ActualizarProductoCommand(ProductoCommand):
    def __init__(self, id_producto, nom_producto, desc_producto, cantidad, id_estatus, qr_producto=None):
        super().__init__(id_producto, nom_producto,
                         desc_producto, cantidad, id_estatus, qr_producto)

    def execute(self):
        return super().execute()
