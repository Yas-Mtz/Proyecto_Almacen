# interfaces.py

from abc import ABC, abstractmethod


class Command(ABC):
    """
    Interfaz base para los comandos, define el método `execute`.
    """
    @abstractmethod
    def execute(self):
        """
        Ejecuta el comando, este método debe ser implementado por las clases concretas.
        """
        pass


class EstadoProducto(ABC):
    """
    Interfaz para los estados de un producto.
    """
    @abstractmethod
    def manejar_estado(self, producto):
        """
        Devuelve una cadena de texto que describe el estado de un producto.
        """
        pass
