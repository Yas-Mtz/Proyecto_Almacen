# Arquitectura de Patrones y Procedimientos Almacenados — SistemaUACM

## Descripción general

SistemaUACM aplica una arquitectura **MVC pura** donde el Controller se limita exclusivamente
al manejo HTTP (request / response). La lógica de datos y negocio se delega a la capa Model
mediante patrones de diseño o procedimientos almacenados, según la naturaleza de cada módulo.

---

## Mapa por módulo

### Login

| Elemento | Tipo | Archivo | Responsabilidad |
|---|---|---|---|
| `ProxyAutenticacion` | Patrón Proxy *(estructural)* | `Login/Login_pattern.py` | Intercepta el login real para prevenir sesiones múltiples, aplicar timeout de 30 min y registrar actividad |
| `AutenticacionReal` | Sujeto real del Proxy | `Login/Login_pattern.py` | Ejecuta `authenticate()` y `login()` de Django |
| `controllers.py` | Controller MVC | `Login/controllers.py` | HTTP únicamente: recibe credenciales, delega a `ProxyAutenticacion`, responde |

**Flujo:**
```
Request POST /login/
  → controllers.login()
    → ProxyAutenticacion.autenticar()   ← verifica sesiones activas
      → AutenticacionReal.autenticar()  ← valida credenciales en Django
    ← True / False + mensaje
  ← JsonResponse / redirect
```

---

### GestiondeProductos

| Elemento | Tipo | Archivo | Responsabilidad |
|---|---|---|---|
| `Command` / `ProductCommand` | Interfaz abstracta (ABC) | `pattern_interface.py` | Define contrato `execute()`, `undo()`, `validate()` para todos los comandos |
| `AgregarProductoCommand` | Patrón Command *(comportamiento)* | `command.py` | Encapsula la creación de un producto con validaciones y soporte de deshacer |
| `ActualizarProductoCommand` | Patrón Command *(comportamiento)* | `command.py` | Encapsula la actualización de un producto con snapshot para deshacer |
| `ProductoRepository` | Patrón Repository *(estructural)* | `repository.py` | Centraliza las lecturas: catálogos, siguiente ID, búsqueda de estatus, marca por defecto |
| Funciones helpers | Funciones de modelo | `command.py` | `buscar_producto_por_id`, `verificar_nombre_producto`, `cambiar_estatus_producto`, `actualizar_stock_producto` |
| `controllers.py` | Controller MVC | `controllers.py` | HTTP únicamente: extrae datos del request, instancia el Command o llama al Repository, responde |

**Flujo — escritura (POST):**
```
Request POST /GestiondeProductos/
  → controllers.gestiondeproductos()
    → AgregarProductoCommand(**args).execute()   ← valida + persiste + maneja imagen
    ← {'success': True/False, 'message': ...}
  ← JsonResponse
```

**Flujo — lectura (GET catálogos):**
```
Request GET /GestiondeProductos/datos/
  → controllers.datos_gestion()
    → ProductoRepository.datos_gestion(correo)  ← estatus, categorías, marcas, unidades, next_id
    ← dict con catálogos
  ← JsonResponse
```

---

### Solicitudes

| Elemento | Tipo | Archivo / BD | Responsabilidad |
|---|---|---|---|
| `sp_crear_solicitud` | Stored Procedure | MySQL | Crea cabecera + detalles de solicitud en una transacción |
| `sp_aprobar_solicitud` | Stored Procedure | MySQL | Cambia estatus a APROBADA y descuenta stock |
| `sp_cancelar_solicitud` | Stored Procedure | MySQL | Cambia estatus a CANCELADA |
| `sp_registrar_recepcion` | Stored Procedure | MySQL | Registra productos recibidos; si hay faltante genera solicitud de seguimiento con estatus ENTREGA_PARCIAL |
| `sp_registrar_gestion` | Stored Procedure | MySQL | Registra quién gestionó la solicitud y cuándo |
| `sp_cabecera_solicitud` | Stored Procedure | MySQL | Lectura de datos principales de una solicitud |
| `sp_productos_solicitud` | Stored Procedure | MySQL | Lectura del detalle de productos de una solicitud |
| `sp_datos_gestion` | Stored Procedure | MySQL | Lectura del gestor y fecha de gestión de una solicitud |
| `controllers.py` | Controller MVC | `Solicitudes/controllers.py` | HTTP únicamente: llama SPs vía `cursor.callproc()`, serializa resultados, envía correos |

**Flujo — crear solicitud:**
```
Request POST /Solicitudes/crear/
  → controllers.crear_solicitud()
    → sp_crear_solicitud(id_almacen, id_personal, observaciones, productos_json)
    → sp_cabecera_solicitud(id_solicitud)   ← para armar la respuesta
    → sp_productos_solicitud(id_solicitud)
    → [opcional] enviar_correo_solicitud()
  ← JsonResponse con datos de la solicitud creada
```

**Flujo — entrega parcial:**
```
Request POST /Solicitudes/<id>/recibir/
  → controllers.registrar_recepcion()
    → sp_registrar_recepcion(id_solicitud, productos_json)
      ← id_solicitud_nueva (> 0 si hubo faltante)
    → [si faltante] enviar_correo_entrega_parcial()
  ← JsonResponse
```

---

### Reportes

| Elemento | Tipo | Archivo / BD | Responsabilidad |
|---|---|---|---|
| `GenerarReporteSolicitudes` | Stored Procedure | MySQL | Agrega solicitudes por rango de fechas |
| `GenerarInventario` | Stored Procedure | MySQL | Devuelve inventario completo con estatus |
| `controllers.py` | Controller MVC | `Reportes/controllers.py` | HTTP únicamente: recibe parámetros, llama SPs, serializa y responde |

**Flujo:**
```
Request POST /Reportes/solicitudes/
  → controllers.reporte_solicitudes()
    → GenerarReporteSolicitudes(fecha_inicio, fecha_fin)
    ← filas con id_solicitud, almacen, artículo, cantidad, persona, fecha
  ← JsonResponse
```

---

### GestiondePersonal

| Elemento | Tipo | Archivo | Responsabilidad |
|---|---|---|---|
| `PersonalRepository` | Patrón Repository *(estructural)* | `GestiondePersonal/repository.py` | Centraliza lecturas: lista con filtros dinámicos, detalle con timeline cronológico de solicitudes |
| `controllers.py` | Controller MVC | `GestiondePersonal/controllers.py` | HTTP únicamente: extrae query params, llama al Repository, responde |

**Flujo — listado:**
```
Request GET /GestiondePersonal/lista/?q=...&id_rol=...
  → controllers.lista_personal()
    → PersonalRepository.lista(q, id_rol)  ← Q filters, serialización de personal y roles
    ← {'personal': [...], 'roles': [...]}
  ← JsonResponse
```

**Flujo — detalle:**
```
Request GET /GestiondePersonal/<id>/
  → controllers.detalle_personal()
    → PersonalRepository.detalle(id_personal)  ← datos + timeline de solicitudes
    ← dict con perfil y timeline, o None si no existe
  ← JsonResponse (200 o 404)
```

---

## Resumen comparativo

| Módulo | Patrón/SP en Model layer | Tipo | Aplica a |
|---|---|---|---|
| Login | Proxy | Estructural | Control de sesiones múltiples |
| GestiondeProductos | Command + Repository | Comportamiento + Estructural | Mutations (Command) / Lecturas (Repository) |
| Solicitudes | Stored Procedures | — | Todas las operaciones (lectura y escritura) |
| Reportes | Stored Procedures | — | Consultas de agregación |
| GestiondePersonal | Repository | Estructural | Lecturas con filtros y timeline |

---

## Criterio de elección

```
¿La operación es transaccional o requiere lógica compleja en BD?
  → Stored Procedure  (Solicitudes, Reportes)

¿Es una mutación con validaciones, pasos múltiples o necesidad de deshacer?
  → Command  (GestiondeProductos)

¿Es una lectura con filtros dinámicos, joins o serialización?
  → Repository  (GestiondePersonal, GestiondeProductos)

¿Es control de acceso o intermediación de un servicio externo?
  → Proxy  (Login)
```

---

## Estado de los Controllers

Todos los controllers del proyecto siguen el mismo contrato:

- Reciben el `request` de Django
- Extraen parámetros (`GET`, `POST`, `body`)
- Delegan a la capa Model (Repository / Command / SP)
- Devuelven `JsonResponse` o `render()`
- **No contienen queries ORM directas**
