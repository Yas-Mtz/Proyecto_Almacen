import os
import glob
import logging

from typing import Dict, Any
from django.core.exceptions import ValidationError
from django.core.files.storage import default_storage
from django.shortcuts import get_object_or_404
from django.conf import settings

from .models import Producto, Estatus, CategoriaProducto, Marca, UnidadMedida
from .pattern_interface import ProductCommand

logger = logging.getLogger(__name__)


# ── Funciones del Modelo ──────────────────────────────────────────────────────

def generar_qr_temp(data):
    """Genera un QR temporal en memoria — lógica de negocio del Modelo"""
    import qrcode
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(data)
    qr.make(fit=True)
    return qr.make_image(fill_color='black', back_color='white')


def guardar_imagen_categoria(imagen_file, id_producto, categoria_nombre):
    """Guarda o actualiza la imagen del producto — lógica de negocio del Modelo"""
    safe_categoria = ''.join(c for c in categoria_nombre if c.isalnum() or c in (' ', '_')).rstrip()
    safe_categoria = safe_categoria.replace(' ', '_').lower()
    categoria_dir = os.path.join(settings.MEDIA_ROOT, 'productos', safe_categoria)
    os.makedirs(categoria_dir, exist_ok=True)

    nueva_ext = os.path.splitext(imagen_file.name)[1].lower()
    safe_filename = f'prod_{id_producto}{nueva_ext}'
    imagen_path = os.path.join(categoria_dir, safe_filename)

    patrones = glob.glob(os.path.join(categoria_dir, f'prod_{id_producto}.*'))
    for archivo in patrones:
        try:
            os.remove(archivo)
        except Exception as e:
            logger.warning(f"No se pudo eliminar la imagen anterior {archivo}: {str(e)}")

    with default_storage.open(imagen_path, 'wb+') as destination:
        for chunk in imagen_file.chunks():
            destination.write(chunk)

    return os.path.join('productos', safe_categoria, safe_filename)


def cambiar_estatus_producto(producto_id, nuevo_estatus_id) -> dict:
    """Cambia el estatus de un producto — lógica de negocio del Modelo"""
    try:
        producto = Producto.objects.get(id_producto=producto_id)
        producto.estatus = Estatus.objects.get(id_estatus=nuevo_estatus_id)
        producto.save()
        return {
            'status': 'success',
            'message': 'Estatus actualizado correctamente',
            'nuevo_estatus': {
                'id': producto.estatus.id_estatus,
                'nombre': producto.estatus.nombre_estatus
            }
        }
    except Exception as e:
        logger.error(f"Error al cambiar estatus: {str(e)}", exc_info=True)
        return {'status': 'error', 'message': 'Error al cambiar el estatus'}


def buscar_producto_por_id(producto_id) -> dict:
    """Busca un producto por ID y retorna sus datos con información de imagen — Modelo"""
    if not str(producto_id).isdigit():
        return {'status': 'error', 'message': 'Producto no encontrado'}

    producto = Producto.objects.filter(id_producto=producto_id).first()
    if not producto:
        return {'status': 'error', 'message': 'Producto no encontrado'}

    imagen_url = None
    imagen_nombre = None
    imagen_path = None
    imagen_existe = False

    if producto.imagen_producto:
        try:
            imagen_path = str(producto.imagen_producto)
            imagen_url = settings.MEDIA_URL + imagen_path
            imagen_nombre = os.path.basename(imagen_path)
            full_image_path = os.path.join(settings.MEDIA_ROOT, imagen_path)
            imagen_existe = os.path.exists(full_image_path)
            if not imagen_existe:
                logger.warning(f"Imagen no encontrada en disco: {full_image_path}")
        except Exception as e:
            logger.error(f"Error procesando imagen del producto {producto.id_producto}: {str(e)}")
            imagen_nombre = "Error al procesar imagen"

    return {
        'status': 'success',
        'id_producto': producto.id_producto,
        'nombre_producto': producto.nombre_producto,
        'descripcion_producto': producto.descripcion_producto,
        'cantidad': producto.cantidad,
        'stock_minimo': producto.stock_minimo,
        'id_estatus': producto.estatus.id_estatus,
        'nombre_estatus': producto.estatus.nombre_estatus,
        'id_categoria': producto.categoria.id_categoria,
        'nombre_categoria': producto.categoria.nombre_categoria,
        'id_marca': producto.marca.id_marca,
        'nombre_marca': producto.marca.nombre_marca,
        'id_unidad': producto.unidad.id_unidad,
        'nombre_unidad': producto.unidad.nombre_unidad,
        'abreviatura_unidad': getattr(producto.unidad, 'abreviatura', 'N/A'),
        'observaciones': producto.observaciones or '',
        'imagen_url': imagen_url,
        'imagen_nombre': imagen_nombre,
        'imagen_path': imagen_path,
        'imagen_existe': imagen_existe,
    }


def verificar_nombre_producto(nombre) -> dict:
    """Verifica si existe un producto con el nombre dado — lógica de negocio del Modelo"""
    if not nombre:
        return {'error': 'Nombre de producto requerido'}

    producto_existente = Producto.objects.filter(
        nombre_producto__iexact=nombre
    ).first()

    if producto_existente:
        return {
            'existe': True,
            'producto': {
                'id_producto': producto_existente.id_producto,
                'nombre_producto': producto_existente.nombre_producto,
                'categoria': producto_existente.categoria.nombre_categoria,
                'cantidad': producto_existente.cantidad,
                'estatus': producto_existente.estatus.nombre_estatus
            }
        }
    return {'existe': False}


def actualizar_stock_producto(id_producto, nueva_cantidad) -> dict:
    """Actualiza el stock de un producto — lógica de negocio del Modelo"""
    if nueva_cantidad is None:
        return {'success': False, 'message': 'No se proporcionó la cantidad'}

    try:
        nueva_cantidad = int(nueva_cantidad)
    except (ValueError, TypeError):
        return {'success': False, 'message': 'Cantidad inválida'}

    if nueva_cantidad < 0:
        return {'success': False, 'message': 'La cantidad no puede ser negativa'}

    try:
        producto = Producto.objects.get(id_producto=id_producto)
        producto.cantidad = nueva_cantidad
        producto.save()
        return {'success': True, 'message': 'Stock actualizado correctamente'}
    except Producto.DoesNotExist:
        return {'success': False, 'message': 'Producto no encontrado'}
    except Exception as e:
        logger.error(f"Error al actualizar stock: {str(e)}", exc_info=True)
        return {'success': False, 'message': 'Error interno'}


# ── Patrón Command ────────────────────────────────────────────────────────────

class AgregarProductoCommand(ProductCommand):
    def __init__(self, id_producto, nombre_producto, descripcion_producto, cantidad,
                 stock_minimo, estatus_id, categoria_id, marca_id, unidad_id,
                 observaciones=None, imagen_file=None):
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
        self.imagen_file = imagen_file
        self._producto_creado = None

    def validate(self) -> bool:
        # Validación de campos requeridos
        campos_requeridos = {
            'ID Producto': self.id_producto,
            'Nombre': self.nombre_producto,
            'Cantidad': self.cantidad,
            'Stock Mínimo': self.stock_minimo,
            'Estatus': self.estatus_id,
            'Categoría': self.categoria_id,
            'Marca': self.marca_id,
            'Unidad': self.unidad_id,
        }
        for campo, valor in campos_requeridos.items():
            if valor is None or str(valor).strip() == '':
                raise ValidationError(f"El campo {campo} es requerido")

        # Conversión y validación numérica
        try:
            self.id_producto = int(self.id_producto)
            self.cantidad = int(self.cantidad)
            self.stock_minimo = int(self.stock_minimo)
            self.estatus_id = int(self.estatus_id)
            self.categoria_id = int(self.categoria_id)
            self.marca_id = int(self.marca_id)
            self.unidad_id = int(self.unidad_id)
        except (TypeError, ValueError):
            raise ValidationError("Los campos numéricos deben ser valores válidos")

        if self.cantidad < 0 or self.stock_minimo < 0:
            raise ValidationError("Las cantidades no pueden ser negativas")

        # Validar duplicado por nombre
        existente = Producto.objects.filter(
            nombre_producto__iexact=self.nombre_producto
        ).exclude(id_producto=self.id_producto).first()
        if existente:
            raise ValidationError(
                f"El producto '{self.nombre_producto}' ya ha sido registrado con ID: {existente.id_producto}"
            )
        return True

    def execute(self) -> Dict[str, Any]:
        try:
            self.validate()
            estatus = get_object_or_404(Estatus, id_estatus=self.estatus_id)
            categoria = get_object_or_404(CategoriaProducto, id_categoria=self.categoria_id)
            marca = get_object_or_404(Marca, id_marca=self.marca_id)
            unidad = get_object_or_404(UnidadMedida, id_unidad=self.unidad_id)

            # Guardar imagen si existe — responsabilidad del Modelo
            imagen_path = None
            if self.imagen_file:
                imagen_path = guardar_imagen_categoria(
                    self.imagen_file, self.id_producto, categoria.nombre_categoria
                )

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
                imagen_producto=imagen_path
            )
            self._producto_creado.save()
            return {'success': True, 'message': 'Producto agregado exitosamente'}

        except ValidationError as e:
            return {'success': False, 'message': str(e)}
        except Exception as e:
            return {'success': False, 'message': str(e)}

    def undo(self) -> bool:
        if self._producto_creado:
            try:
                if self._producto_creado.imagen_producto:
                    full_path = os.path.join(settings.MEDIA_ROOT, str(self._producto_creado.imagen_producto))
                    if os.path.isfile(full_path):
                        os.remove(full_path)
                self._producto_creado.delete()
                return True
            except Exception:
                return False
        return False


class ActualizarProductoCommand(ProductCommand):
    def __init__(self, id_producto, nombre_producto, descripcion_producto, cantidad,
                 stock_minimo, estatus_id, categoria_id, marca_id, unidad_id,
                 observaciones=None, imagen_file=None):
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
        self.imagen_file = imagen_file
        self._datos_originales = None

    def validate(self) -> bool:
        try:
            self.id_producto = int(self.id_producto)
            self.cantidad = int(self.cantidad)
            self.stock_minimo = int(self.stock_minimo)
            self.estatus_id = int(self.estatus_id)
            self.categoria_id = int(self.categoria_id)
            self.marca_id = int(self.marca_id)
            self.unidad_id = int(self.unidad_id)
        except (TypeError, ValueError):
            raise ValidationError("Los campos numéricos deben ser valores válidos")

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

            categoria = get_object_or_404(CategoriaProducto, id_categoria=self.categoria_id)

            # Guardar imagen si existe — responsabilidad del Modelo
            if self.imagen_file:
                producto.imagen_producto = guardar_imagen_categoria(
                    self.imagen_file, self.id_producto, categoria.nombre_categoria
                )

            producto.nombre_producto = self.nombre_producto
            producto.descripcion_producto = self.descripcion_producto
            producto.cantidad = self.cantidad
            producto.stock_minimo = self.stock_minimo
            producto.estatus = get_object_or_404(Estatus, id_estatus=self.estatus_id)
            producto.categoria = categoria
            producto.marca = get_object_or_404(Marca, id_marca=self.marca_id)
            producto.unidad = get_object_or_404(UnidadMedida, id_unidad=self.unidad_id)
            producto.observaciones = self.observaciones
            producto.save()
            return {'success': True, 'message': 'Producto actualizado exitosamente'}

        except ValidationError as e:
            return {'success': False, 'message': str(e)}
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
