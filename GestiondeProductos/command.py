from django.core.exceptions import ValidationError
from .models import Producto, Estatus, CategoriaProducto, Marca, UnidadMedida
from django.shortcuts import get_object_or_404
from .pattern_interface import ProductCommand
from django.conf import settings
import os
from typing import Dict, Any  # Importación necesaria para anotaciones de tipo


class AgregarProductoCommand(ProductCommand):
    def __init__(self, id_producto, nombre_producto, descripcion_producto, cantidad, 
                 stock_minimo, estatus_id, categoria_id, marca_id, unidad_id, 
                 observaciones=None, imagen_producto=None):
        self.id_producto = id_producto
        self.nombre_producto = nombre_producto
        self.descripcion_producto = descripcion_producto
        self.cantidad = cantidad
        self.stock_minimo = stock_minimo
        self.estatus_id = estatus_id
        self.categoria_id = categoria_id
        self.marca_id = marca_id
        self.unidad_id = unidad_id
        self.observaciones = observaciones
        self.imagen_producto = imagen_producto
        self._producto_creado = None

    def validate(self) -> bool:
        if self.cantidad < 0 or self.stock_minimo < 0:
            raise ValidationError("Las cantidades no pueden ser negativas")
        
        # Validar si ya existe un producto con el mismo nombre pero diferente ID
        existente = Producto.objects.filter(nombre_producto__iexact=self.nombre_producto).exclude(id_producto=self.id_producto).first()
        if existente:
            raise ValidationError(f"El producto '{self.nombre_producto}' ya ha sido registrado con un ID diferente: {existente.id_producto}")

        return True

    def execute(self) -> Dict[str, Any]:
        try:
            self.validate()
            estatus = get_object_or_404(Estatus, id_estatus=self.estatus_id)
            categoria = get_object_or_404(CategoriaProducto, id_categoria=self.categoria_id)
            marca = get_object_or_404(Marca, id_marca=self.marca_id)
            unidad = get_object_or_404(UnidadMedida, id_unidad=self.unidad_id)
            
            self._producto_creado = Producto(
                id_producto=self.id_producto,
                nombre_producto=self.nombre_producto,
                descripcion_producto=self.descripcion_producto,
                cantidad=self.cantidad,
                stock_minimo=self.stock_minimo,
                estatus=estatus,
                categoria=categoria,
                marca=marca,
                unidad=unidad,
                observaciones=self.observaciones,
                imagen_producto=self.imagen_producto
            )
            self._producto_creado.save()
            
            return {'success': True, 'message': 'Producto agregado exitosamente'}
            
        except Exception as e:
            return {'success': False, 'message': str(e)}

    def undo(self) -> bool:
        if self._producto_creado:
            try:
                if self._producto_creado.imagen_producto and hasattr(self._producto_creado.imagen_producto, 'path'):
                    if os.path.isfile(self._producto_creado.imagen_producto.path):
                        os.remove(self._producto_creado.imagen_producto.path)
                self._producto_creado.delete()
                return True
            except Exception:
                return False
        return False


class ActualizarProductoCommand(ProductCommand):
    def __init__(self, id_producto, nombre_producto, descripcion_producto, cantidad, 
                 stock_minimo, estatus_id, categoria_id, marca_id, unidad_id, 
                 observaciones=None, imagen_producto=None):
        self.id_producto = id_producto
        self.nombre_producto = nombre_producto
        self.descripcion_producto = descripcion_producto
        self.cantidad = cantidad
        self.stock_minimo = stock_minimo
        self.estatus_id = estatus_id
        self.categoria_id = categoria_id
        self.marca_id = marca_id
        self.unidad_id = unidad_id
        self.observaciones = observaciones
        self.imagen_producto = imagen_producto
        self._datos_originales = None

    def validate(self) -> bool:
        if self.cantidad < 0 or self.stock_minimo < 0:
            raise ValidationError("Las cantidades no pueden ser negativas")
        return True

    def execute(self) -> Dict[str, Any]:
        try:
            self.validate()
            producto = Producto.objects.get(id_producto=self.id_producto)
            
            self._datos_originales = {
                'nombre': producto.nombre_producto,
                'descripcion': producto.descripcion_producto,
                'cantidad': producto.cantidad,
                'stock_minimo': producto.stock_minimo,
                'estatus': producto.estatus,
                'categoria': producto.categoria,
                'marca': producto.marca,
                'unidad': producto.unidad,
                'observaciones': producto.observaciones,
                'imagen': producto.imagen_producto
            }
            
            producto.nombre_producto = self.nombre_producto
            producto.descripcion_producto = self.descripcion_producto
            producto.cantidad = self.cantidad
            producto.stock_minimo = self.stock_minimo
            producto.estatus = get_object_or_404(Estatus, id_estatus=self.estatus_id)
            producto.categoria = get_object_or_404(CategoriaProducto, id_categoria=self.categoria_id)
            producto.marca = get_object_or_404(Marca, id_marca=self.marca_id)
            producto.unidad = get_object_or_404(UnidadMedida, id_unidad=self.unidad_id)
            producto.observaciones = self.observaciones
            
            if self.imagen_producto:
                producto.imagen_producto = self.imagen_producto
            
            producto.save()
            
            return {'success': True, 'message': 'Producto actualizado exitosamente'}
            
        except Exception as e:
            return {'success': False, 'message': str(e)}

    def undo(self) -> bool:
        if not self._datos_originales:
            return False
            
        try:
            producto = Producto.objects.get(id_producto=self.id_producto)
            producto.nombre_producto = self._datos_originales['nombre']
            producto.descripcion_producto = self._datos_originales['descripcion']
            producto.cantidad = self._datos_originales['cantidad']
            producto.stock_minimo = self._datos_originales['stock_minimo']
            producto.estatus = self._datos_originales['estatus']
            producto.categoria = self._datos_originales['categoria']
            producto.marca = self._datos_originales['marca']
            producto.unidad = self._datos_originales['unidad']
            producto.observaciones = self._datos_originales['observaciones']
            producto.imagen_producto = self._datos_originales['imagen']
            producto.save()
            return True
        except Exception:
            return False
