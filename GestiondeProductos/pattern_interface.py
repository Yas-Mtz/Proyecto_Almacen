from abc import ABC, abstractmethod
from typing import Any, Dict


"""métodos en las clases abstractas"""
class Command(ABC):
    @abstractmethod
    def execute(self) -> Any:
        pass
    
    @abstractmethod
    def undo(self) -> bool:
        pass

class ProductCommand(Command):
    """
    Interfaz especializada para comandos de producto
    """
    @abstractmethod
    def validate(self) -> bool:
        pass