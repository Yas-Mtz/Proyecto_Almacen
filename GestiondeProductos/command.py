from django.core.exceptions import ValidationError
from .models import Producto, Estatus, CategoriaProducto, Marca, UnidadMedida
from django.shortcuts import get_object_or_404
import os
from django.conf import settings

class AgregarProductoCommand:
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

    def execute(self):
        try:
            # Validación y lógica para agregar producto
            estatus = get_object_or_404(Estatus, id_estatus=self.estatus_id)
            categoria = get_object_or_404(CategoriaProducto, id_categoria=self.categoria_id)
            marca = get_object_or_404(Marca, id_marca=self.marca_id)
            unidad = get_object_or_404(UnidadMedida, id_unidad=self.unidad_id)
            
            producto = Producto(
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
            producto.save()
            
            return {'success': True, 'message': 'Producto agregado exitosamente'}
            
        except Exception as e:
            return {'success': False, 'message': str(e)}

class ActualizarProductoCommand:
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

    def execute(self):
        try:
            producto = Producto.objects.get(id_producto=self.id_producto)
            
            # Actualizar campos
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