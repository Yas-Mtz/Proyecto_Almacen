from SistemaUACM.models import Personal
from .models import Producto, Estatus, CategoriaProducto, Marca, UnidadMedida


class ProductoRepository:

    @staticmethod
    def datos_gestion(correo: str) -> dict:
        """
        Retorna todos los catálogos necesarios para la página de gestión de productos,
        junto con el nombre del usuario activo y el siguiente ID disponible.
        """
        ultimo = Producto.objects.order_by('-id_producto').first()
        next_id = (ultimo.id_producto + 1) if ultimo else 1

        try:
            persona = Personal.objects.get(correo=correo)
            persona_nombre = f"{persona.nombre_personal} {persona.apellido_paterno}"
        except Personal.DoesNotExist:
            persona_nombre = correo

        try:
            estatus_activo = Estatus.objects.get(
                nombre_estatus__icontains='activo'
            ).id_estatus
        except Exception:
            estatus_activo = None

        return {
            'next_id':        next_id,
            'persona_nombre': persona_nombre,
            'estatus_activo': estatus_activo,
            'estatus_list': [
                {'id': e.id_estatus, 'nombre': e.nombre_estatus}
                for e in Estatus.objects.all()
            ],
            'categorias_list': [
                {'id': c.id_categoria, 'nombre': c.nombre_categoria}
                for c in CategoriaProducto.objects.all()
            ],
            'marcas_list': [
                {'id': m.id_marca, 'nombre': m.nombre_marca}
                for m in Marca.objects.all()
            ],
            'unidades_list': [
                {'id': u.id_unidad, 'nombre': u.nombre_unidad, 'abreviatura': u.abreviatura}
                for u in UnidadMedida.objects.all()
            ],
        }

    @staticmethod
    def siguiente_id() -> int:
        """Retorna el siguiente ID disponible para un nuevo producto."""
        ultimo = Producto.objects.order_by('-id_producto').first()
        return (ultimo.id_producto + 1) if ultimo else 1

    @staticmethod
    def estatus_por_nombre(nombre: str):
        """Retorna el objeto Estatus cuyo nombre contiene el texto dado, o None."""
        return Estatus.objects.filter(nombre_estatus__icontains=nombre).first()

    @staticmethod
    def marca_sin_marca():
        """Retorna (o crea) la marca 'Sin marca'."""
        marca, _ = Marca.objects.get_or_create(nombre_marca='Sin marca')
        return marca
