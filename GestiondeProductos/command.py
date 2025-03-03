from .models import Articulo, Estatus
from .pattern_interface import Command
from django.shortcuts import get_object_or_404
from django.db import connection

# Comando para agregar o actualizar un producto


class ProductoCommand(Command):
    def __init__(self, id_articulo, nom_articulo, desc_articulo, cantidad, id_estatus, qr_articulo=None):
        self.id_articulo = id_articulo
        self.nom_articulo = nom_articulo
        self.desc_articulo = desc_articulo
        self.cantidad = cantidad
        self.id_estatus = id_estatus
        self.qr_articulo = qr_articulo

    def _get_estatus(self):
        return get_object_or_404(Estatus, id_estatus=self.id_estatus)

    def _actualizar_producto(self, producto, estatus_obj):
        # Obtener la cantidad actual del producto en la base de datos
        cantidad_actual = producto.cantidad

        # Actualizar los atributos del producto, no sumamos la cantidad aquí
        producto.nom_articulo = self.nom_articulo
        producto.desc_articulo = self.desc_articulo
        producto.id_estatus = estatus_obj

        if self.qr_articulo:
            producto.qr_articulo = self.qr_articulo

        producto.save()

    def _ejecutar_procedimiento_almacenado(self):
        try:
            # Llamada al procedimiento almacenado para actualizar la cantidad del artículo
            # El procedimiento almacenado se encarga de sumar la cantidad correctamente
            cursor = connection.cursor()
            cursor.callproc('RegistrarArticulo', [
                            self.id_articulo, self.cantidad])
        except Exception as e:
            raise Exception(
                f"Error al ejecutar el procedimiento almacenado: {str(e)}")

    def execute(self):
        try:
            estatus_obj = self._get_estatus()
            producto = Articulo.objects.filter(
                id_articulo=self.id_articulo).first()

            if producto:
                # Actualizar producto existente
                self._actualizar_producto(producto, estatus_obj)
                # Ejecutar el procedimiento almacenado después de actualizar el producto
                self._ejecutar_procedimiento_almacenado()
                return f"Artículo {self.nom_articulo} actualizado exitosamente."
            else:
                # Crear un nuevo producto
                nuevo_producto = Articulo(
                    id_articulo=self.id_articulo,
                    nom_articulo=self.nom_articulo,
                    desc_articulo=self.desc_articulo,
                    cantidad=self.cantidad,
                    id_estatus=estatus_obj,
                    qr_articulo=self.qr_articulo
                )
                nuevo_producto.save()
                # Ejecutar el procedimiento almacenado después de agregar el nuevo producto
                self._ejecutar_procedimiento_almacenado()
                return f"Artículo {self.nom_articulo} agregado exitosamente."
        except Exception as e:
            return f"Error: {str(e)}"


# Comando para agregar un producto
class AgregarProductoCommand(ProductoCommand):
    def __init__(self, id_articulo, nom_articulo, desc_articulo, cantidad, id_estatus, qr_articulo):
        super().__init__(id_articulo, nom_articulo,
                         desc_articulo, cantidad, id_estatus, qr_articulo)

    def execute(self):
        # Llamar al método de la clase base para agregar el producto
        return super().execute()


# Comando para actualizar un producto
class ActualizarProductoCommand(ProductoCommand):
    def __init__(self, id_articulo, nom_articulo, desc_articulo, cantidad, id_estatus, qr_articulo=None):
        super().__init__(id_articulo, nom_articulo,
                         desc_articulo, cantidad, id_estatus, qr_articulo)

    def execute(self):
        # Llamar al método de la clase base para actualizar el producto
        return super().execute()
