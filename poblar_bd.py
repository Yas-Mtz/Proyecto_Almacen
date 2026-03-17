from SistemaUACM.models import Estatus, TipoAlmacen, EstadoAlmacen, Rol, CategoriaSalarial, Personal, Almacen
from GestiondeProductos.models import CategoriaProducto, Marca, UnidadMedida
from Solicitudes.models import EstatusSolicitud

# ─────────────────────────────────────────────────────
# ESTATUS (para productos)
# ─────────────────────────────────────────────────────
e_activo, _   = Estatus.objects.get_or_create(id_estatus=1, defaults={'nombre_estatus': 'Activo'})
e_inactivo, _ = Estatus.objects.get_or_create(id_estatus=2, defaults={'nombre_estatus': 'Inactivo'})
e_agotado, _  = Estatus.objects.get_or_create(id_estatus=3, defaults={'nombre_estatus': 'Agotado'})
print("✔ Estatus")

# ─────────────────────────────────────────────────────
# ESTATUS SOLICITUD
# ─────────────────────────────────────────────────────
EstatusSolicitud.objects.get_or_create(id_estatus_solicitud=1, defaults={'nombre_estatus': 'Solicitada'})
EstatusSolicitud.objects.get_or_create(id_estatus_solicitud=2, defaults={'nombre_estatus': 'Aprobada'})
EstatusSolicitud.objects.get_or_create(id_estatus_solicitud=3, defaults={'nombre_estatus': 'Cancelada'})
print("✔ Estatus Solicitud")

# ─────────────────────────────────────────────────────
# TIPO ALMACÉN
# ─────────────────────────────────────────────────────
t_central, _ = TipoAlmacen.objects.get_or_create(id_talmacen=1, defaults={'tipo_almacen': 'Almacén Central'})
t_cuaute, _  = TipoAlmacen.objects.get_or_create(id_talmacen=2, defaults={'tipo_almacen': 'Almacén Cuautepec'})
print("✔ Tipo Almacén")

# ─────────────────────────────────────────────────────
# ESTADO ALMACÉN
# ─────────────────────────────────────────────────────
ea_activo, _   = EstadoAlmacen.objects.get_or_create(id_estado_almacen=1, defaults={'nombre_estado_almacen': 'Activo'})
ea_inactivo, _ = EstadoAlmacen.objects.get_or_create(id_estado_almacen=2, defaults={'nombre_estado_almacen': 'Inactivo'})
print("✔ Estado Almacén")

# ─────────────────────────────────────────────────────
# ROLES
# Encargado (id=1) y Ayudante (id=2) tienen permisos adicionales en el sistema.
# Los demás roles solo pueden solicitar artículos.
# ─────────────────────────────────────────────────────
r_encargado, _  = Rol.objects.get_or_create(id_rol=1, defaults={'nombre_rol': 'Encargado'})
r_ayudante, _   = Rol.objects.get_or_create(id_rol=2, defaults={'nombre_rol': 'Ayudante'})
r_admin, _      = Rol.objects.get_or_create(id_rol=3, defaults={'nombre_rol': 'Administrativo'})
r_limpieza, _   = Rol.objects.get_or_create(id_rol=4, defaults={'nombre_rol': 'Ayudante de Limpieza'})
r_docente, _    = Rol.objects.get_or_create(id_rol=5, defaults={'nombre_rol': 'Docente'})
print("✔ Roles")

# ─────────────────────────────────────────────────────
# CATEGORÍA SALARIAL
# ─────────────────────────────────────────────────────
cs1, _ = CategoriaSalarial.objects.get_or_create(id_cat_sal=1, defaults={'categoria_salarial': 'Nivel A', 'descripcion': 'Categoría salarial nivel A'})
cs2, _ = CategoriaSalarial.objects.get_or_create(id_cat_sal=2, defaults={'categoria_salarial': 'Nivel B', 'descripcion': 'Categoría salarial nivel B'})
cs3, _ = CategoriaSalarial.objects.get_or_create(id_cat_sal=3, defaults={'categoria_salarial': 'Nivel C', 'descripcion': 'Categoría salarial nivel C'})
print("✔ Categoría Salarial")

# ─────────────────────────────────────────────────────
# PERSONAL
# id_personal = matrícula del trabajador (número entero)
# ─────────────────────────────────────────────────────
Personal.objects.get_or_create(id_personal=190110505, defaults={
    'id_rol': r_encargado,
    'nombre_personal': 'María',
    'apellido_paterno': 'González',
    'apellido_materno': 'López',
    'telefono': '5512345678',
    'correo': 'maria@encargado.uacm.edu.mx',
    'id_categoria_sal': cs1,
})
Personal.objects.get_or_create(id_personal=190110506, defaults={
    'id_rol': r_ayudante,
    'nombre_personal': 'Carlos',
    'apellido_paterno': 'Ramírez',
    'apellido_materno': 'Torres',
    'telefono': '5587654321',
    'correo': 'ayudante1@encargado.uacm.edu.mx',
    'id_categoria_sal': cs2,
})
Personal.objects.get_or_create(id_personal=170110303, defaults={
    'id_rol': r_docente,
    'nombre_personal': 'Daniela',
    'apellido_paterno': 'Robles',
    'apellido_materno': 'Martínez',
    'telefono': '5599887766',
    'correo': 'daniela@profesor.uacm.edu.mx',
    'id_categoria_sal': cs3,
})
Personal.objects.get_or_create(id_personal=170110304, defaults={
    'id_rol': r_docente,
    'nombre_personal': 'Luis',
    'apellido_paterno': 'Hernández',
    'apellido_materno': 'Vega',
    'telefono': '5511223344',
    'correo': 'luis@profesor.uacm.edu.mx',
    'id_categoria_sal': cs3,
})
Personal.objects.get_or_create(id_personal=170110305, defaults={
    'id_rol': r_admin,
    'nombre_personal': 'Ana',
    'apellido_paterno': 'Pérez',
    'apellido_materno': None,
    'telefono': '5544332211',
    'correo': 'ana@uacm.edu.mx',
    'id_categoria_sal': cs2,
})
print("✔ Personal")

# ─────────────────────────────────────────────────────
# ALMACENES
# id_almacen=1 es el Almacén Central (solo encargados)
# ─────────────────────────────────────────────────────
p1 = Personal.objects.get(id_personal=190110505)
p2 = Personal.objects.get(id_personal=190110506)

Almacen.objects.get_or_create(id_almacen=1, defaults={
    'id_talmacen': t_central,
    'direccion': 'Dr. Garcia Diego, CDMX',
    'correo': 'almacen.central@uacm.edu.mx',
    'telefono': '5512349876',
    'capacidad_maxima': 1000,
    'id_estado_almacen': ea_activo,
    'id_responsable': p1,
})
Almacen.objects.get_or_create(id_almacen=2, defaults={
    'id_talmacen': t_cuaute,
    'direccion': 'Av. La Corona 320, Gustavo A. Madero, CDMX',
    'correo': 'almacen.cuautepec@uacm.edu.mx',
    'telefono': '5598761234',
    'capacidad_maxima': 500,
    'id_estado_almacen': ea_activo,
    'id_responsable': p2,
})
print("✔ Almacenes")

# ─────────────────────────────────────────────────────
# CATEGORÍAS DE PRODUCTO
# ─────────────────────────────────────────────────────
CategoriaProducto.objects.get_or_create(id_categoria=1, defaults={'nombre_categoria': 'Papelería',  'descripcion_categoria': 'Artículos de oficina y papelería', 'id_estatus': e_activo})
CategoriaProducto.objects.get_or_create(id_categoria=2, defaults={'nombre_categoria': 'Limpieza',   'descripcion_categoria': 'Productos de limpieza e higiene',  'id_estatus': e_activo})
CategoriaProducto.objects.get_or_create(id_categoria=3, defaults={'nombre_categoria': 'Cómputo',    'descripcion_categoria': 'Accesorios y periféricos de cómputo', 'id_estatus': e_activo})
CategoriaProducto.objects.get_or_create(id_categoria=4, defaults={'nombre_categoria': 'Mobiliario', 'descripcion_categoria': 'Muebles y equipo de oficina',       'id_estatus': e_activo})
print("✔ Categorías de Producto")

# ─────────────────────────────────────────────────────
# MARCAS
# ─────────────────────────────────────────────────────
Marca.objects.get_or_create(id_marca=1,  defaults={'nombre_marca': 'Bic'})
Marca.objects.get_or_create(id_marca=2,  defaults={'nombre_marca': 'Pilot'})
Marca.objects.get_or_create(id_marca=3,  defaults={'nombre_marca': 'Scribe'})
Marca.objects.get_or_create(id_marca=4,  defaults={'nombre_marca': 'Lysol'})
Marca.objects.get_or_create(id_marca=5,  defaults={'nombre_marca': 'Fabuloso'})
Marca.objects.get_or_create(id_marca=6,  defaults={'nombre_marca': 'Ajax'})
Marca.objects.get_or_create(id_marca=7,  defaults={'nombre_marca': 'HP'})
Marca.objects.get_or_create(id_marca=8,  defaults={'nombre_marca': 'Logitech'})
Marca.objects.get_or_create(id_marca=9,  defaults={'nombre_marca': 'Presto'})
Marca.objects.get_or_create(id_marca=10, defaults={'nombre_marca': 'Pretul'})
print("✔ Marcas")

# ─────────────────────────────────────────────────────
# UNIDADES DE MEDIDA
# ─────────────────────────────────────────────────────
UnidadMedida.objects.get_or_create(id_unidad=1, defaults={'nombre_unidad': 'Pieza',   'abreviatura': 'pza'})
UnidadMedida.objects.get_or_create(id_unidad=2, defaults={'nombre_unidad': 'Caja',    'abreviatura': 'cja'})
UnidadMedida.objects.get_or_create(id_unidad=3, defaults={'nombre_unidad': 'Litro',   'abreviatura': 'lt'})
UnidadMedida.objects.get_or_create(id_unidad=4, defaults={'nombre_unidad': 'Rollo',   'abreviatura': 'rll'})
UnidadMedida.objects.get_or_create(id_unidad=5, defaults={'nombre_unidad': 'Paquete', 'abreviatura': 'paq'})
print("✔ Unidades de Medida")

print("\n✅ Base de datos poblada correctamente.")
print("   Los productos se deben registrar manualmente desde Gestión de Productos.")
