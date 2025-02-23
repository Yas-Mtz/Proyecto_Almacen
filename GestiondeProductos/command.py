from django.db import connection
from abc import ABC, abstractmethod


class Command(ABC):
    """
    Clase base abstracta para el patrón de comando.

    Define la interfaz para ejecutar comandos.
    """

    @abstractmethod
    def execute(self):
        """
        Ejecuta el comando.

        Este método debe ser implementado por las clases de comando concretas.

        Retorna:
            Any: El resultado de ejecutar el comando.
        """
        pass

# Comando para agregar un artículo


class AgregarProductoCommand(Command):
    """
    Comando para agregar un nuevo producto.
    """

    def __init__(self, id_articulo, nom_articulo, desc_articulo, cantidad, id_estatus, qr_articulo):
        """
        Inicializa una nueva instancia de la clase AgregarProductoCommand.

        Args:
            id_articulo (int): El identificador único del producto.
            nom_articulo (str): El nombre del producto.
            desc_articulo (str): La descripción del producto.
            cantidad (int): La cantidad del producto.
            id_estatus (int): El estado del producto (por ejemplo, activo, inactivo).
            qr_articulo (str): El código QR asociado con el producto.

        Retorna:
            None
        """
        self.id_articulo = id_articulo
        self.nom_articulo = nom_articulo
        self.desc_articulo = desc_articulo
        self.cantidad = cantidad
        self.id_estatus = id_estatus
        self.qr_articulo = qr_articulo

    def execute(self):
        """
        Ejecuta el comando para agregar un nuevo producto a la base de datos.

        Llama al procedimiento almacenado 'RegistrarArticulo'.

        Retorna:
            str: Un mensaje que indica la adición exitosa del producto.
        """
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
    """
    Comando para actualizar un producto existente.
    """

    def __init__(self, id_articulo, nom_articulo, desc_articulo, cantidad, id_estatus, qr_articulo):
        """
        Inicializa una nueva instancia de la clase ActualizarProductoCommand.

        Args:
            id_articulo (int): El identificador único del producto.
            nom_articulo (str): El nombre del producto.
            desc_articulo (str): La descripción del producto.
            cantidad (int): La cantidad del producto.
            id_estatus (int): El estado del producto (por ejemplo, activo, inactivo).
            qr_articulo (str): El código QR asociado con el producto.

        Retorna:
            None
        """
        self.id_articulo = id_articulo
        self.nom_articulo = nom_articulo
        self.desc_articulo = desc_articulo
        self.cantidad = cantidad
        self.id_estatus = id_estatus
        self.qr_articulo = qr_articulo

    def execute(self):
        """
        Ejecuta el comando para actualizar un producto existente en la base de datos.

        Llama al procedimiento almacenado 'RegistrarArticulo'. Nota: Idealmente, esto debería llamar a un procedimiento almacenado diferente para la actualización.

        Retorna:
            str: Un mensaje que indica la actualización exitosa del producto.
        """
        with connection.cursor() as cursor:
            cursor.callproc('RegistrarArticulo', [
                self.id_articulo,
                self.nom_articulo,
                self.desc_articulo,
                self.cantidad,
                self.id_estatus,
                self.qr_articulo
            ])
        return f"Artículo {self.nom_articulo} actualizado exitosamente."
