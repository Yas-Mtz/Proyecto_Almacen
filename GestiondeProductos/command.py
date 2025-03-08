from .models import Articulo, Estatus
from .pattern_interface import Command
from django.shortcuts import get_object_or_404


class ProductoCommand(Command):
    def __init__(self, id_articulo, nom_articulo, desc_articulo, cantidad, id_estatus, qr_articulo=None):
        self.id_articulo = id_articulo
        self.nom_articulo = nom_articulo
        self.desc_articulo = desc_articulo
        self.cantidad = cantidad
        self.id_estatus = id_estatus
        self.qr_articulo = qr_articulo

    def _get_estatus(self):
        """Obtiene el objeto de estatus."""
        return get_object_or_404(Estatus, id_estatus=self.id_estatus)

    def _actualizar_producto(self, producto, estatus_obj):
        """Actualiza un producto existente sin modificar la cantidad."""
        producto.nom_articulo = self.nom_articulo
        producto.desc_articulo = self.desc_articulo
        producto.id_estatus = estatus_obj

        if self.qr_articulo:

            producto.cantidad += self.cantidad
        producto.save()

    def execute(self):
        try:
            estatus_obj = self._get_estatus()
            producto = Articulo.objects.filter(
                id_articulo=self.id_articulo).first()

            if producto:
                # Si el producto existe, actualizamos su información (sin cambiar la cantidad)
                self._actualizar_producto(producto, estatus_obj)
                return f"Artículo {self.nom_articulo} actualizado exitosamente."
            else:
                # Si el producto no existe, lo creamos con la cantidad proporcionada
                nuevo_producto = Articulo(
                    id_articulo=self.id_articulo,
                    nom_articulo=self.nom_articulo,
                    desc_articulo=self.desc_articulo,
                    cantidad=self.cantidad,  # Cantidad inicial sin sumas extra
                    id_estatus=estatus_obj,
                    qr_articulo=self.qr_articulo
                )
                nuevo_producto.save()
                return f"Artículo {self.nom_articulo} agregado exitosamente."
        except Exception as e:
            return f"Error: {str(e)}"

# Comando para agregar un producto


class AgregarProductoCommand(ProductoCommand):
    def __init__(self, id_articulo, nom_articulo, desc_articulo, cantidad, id_estatus, qr_articulo):
        super().__init__(id_articulo, nom_articulo,
                         desc_articulo, cantidad, id_estatus, qr_articulo)

    def execute(self):
        return super().execute()


# Comando para actualizar un producto
class ActualizarProductoCommand(ProductoCommand):
    def __init__(self, id_articulo, nom_articulo, desc_articulo, cantidad, id_estatus, qr_articulo=None):
        super().__init__(id_articulo, nom_articulo,
                         desc_articulo, cantidad, id_estatus, qr_articulo)

    def execute(self):
        return super().execute()
