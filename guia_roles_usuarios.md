# Guía: Sistema de Roles y Usuarios en Django

## Visión general

El sistema combina **dos mecanismos** de Django para controlar accesos:

| Mecanismo | Para qué sirve |
|-----------|---------------|
| **Django Groups** | Define qué puede hacer cada usuario en la app (permisos funcionales) |
| **PerfilUsuario** | Vincula cada cuenta Django con un registro real en la tabla `personal` de la BD legacy |

---

## 1. Django Groups (Grupos de permisos)

Django trae por defecto un sistema de grupos en sus tablas `auth_group` y `auth_user_groups`. No requiere crear nada en la BD — ya existe.

### Grupos creados en este proyecto

| Grupo | Acceso |
|-------|--------|
| `Encargado Almacen` | Ambos almacenes, aprobar solicitudes, ver todos los personales |
| `Solicitante` | Solo Almacén Cuautepec, no puede aprobar, solo solicita a su nombre |

### Cómo se verifica en el backend (Django)

```python
# En cualquier controller/view:
def _es_encargado(user):
    return user.groups.filter(name='Encargado Almacen').exists()

# Uso:
if _es_encargado(request.user):
    # lógica de encargado
else:
    # lógica de solicitante
```

### Cómo se pasa al frontend (template → JS)

**Controller** — pasa el flag como contexto:
```python
return render(request, "solicitud.html", {
    "es_encargado": _es_encargado(request.user),
})
```

**HTML** — lo escribe en un `data-attribute` del formulario:
```html
<form data-encargado="{{ es_encargado|yesno:'true,false' }}">
```

**JavaScript** — lo lee y controla la UI:
```javascript
const ES_ENCARGADO = document.getElementById("form-solicitud")
                              .dataset.encargado === "true";

// Mostrar botón Aprobar solo a encargados
btnAprobar.style.display = (accionable && ES_ENCARGADO) ? "inline-flex" : "none";
```

---

## 2. PerfilUsuario (modelo de vinculación)

Como la BD es legacy (`managed = False`), las tablas de `personal` existen pero no están relacionadas con el sistema de usuarios de Django. El modelo `PerfilUsuario` hace ese puente.

### Definición (Login/models.py)

```python
from django.db import models
from django.contrib.auth.models import User

class PerfilUsuario(models.Model):
    user        = models.OneToOneField(User, on_delete=models.CASCADE, related_name='perfil')
    id_personal = models.IntegerField(null=True, blank=True)

    class Meta:
        db_table = 'perfil_usuario'
```

- `OneToOneField` → cada cuenta Django tiene **un solo** perfil
- `id_personal` → es la matrícula/ID en la tabla `personal` de la BD legacy
- `null=True` → si aún no está asignado, el usuario ve un aviso

### Para aplicar la migración

```bash
python manage.py makemigrations Login
python manage.py migrate Login
```

### Cómo se usa en el backend

```python
from Login.models import PerfilUsuario
from SistemaUACM.models import Personal

def _get_personal_propio(user):
    try:
        perfil = PerfilUsuario.objects.get(user=user)
        if not perfil.id_personal:
            return None
        personal = Personal.objects.select_related('id_rol').get(id_personal=perfil.id_personal)
        return {
            "id_personal": personal.id_personal,
            "nombre": f"{personal.nombre_personal} {personal.apellido_paterno}",
            "id_rol": personal.id_rol.id_rol,
            "cargo": personal.id_rol.nombre_rol,
        }
    except (PerfilUsuario.DoesNotExist, Personal.DoesNotExist):
        return None
```

### Cómo se pasa al frontend

**Controller:**
```python
personal_propio = None if es_encargado else _get_personal_propio(request.user)
return render(request, "solicitud.html", {
    "personal_propio": personal_propio,
})
```

**HTML** — con `json_script` (forma segura de embeber JSON en HTML):
```html
{{ personal_propio|json_script:"personal-propio-data" }}
```

**JavaScript:**
```javascript
const _ppScript = document.getElementById("personal-propio-data");
const PERSONAL_PROPIO = _ppScript ? JSON.parse(_ppScript.textContent) : null;

if (PERSONAL_PROPIO) {
    // auto-rellenar campos y bloquearlos
    document.getElementById("matricula").value    = PERSONAL_PROPIO.id_personal;
    document.getElementById("matricula").readOnly = true;
}
```

---

## 3. Cómo crear usuarios y asignarlos a grupos

### Opción A — Script Python (recomendada para lotes)

Crear el archivo (ej. `crear_usuarios.py`) y ejecutarlo con `manage.py shell`:

```python
# crear_usuarios.py
from django.contrib.auth.models import User, Group
from Login.models import PerfilUsuario

# Grupos (se crean si no existen)
g_encargado,   _ = Group.objects.get_or_create(name='Encargado Almacen')
g_solicitante, _ = Group.objects.get_or_create(name='Solicitante')

# Crear usuario encargado
u1 = User.objects.create_user(username='juan@encargado.uacm.edu.mx', password='Contraseña123')
u1.groups.add(g_encargado)
PerfilUsuario.objects.create(user=u1, id_personal=190110505)

# Crear usuario solicitante
u2 = User.objects.create_user(username='ana@profesor.uacm.edu.mx', password='Contraseña123')
u2.groups.add(g_solicitante)
PerfilUsuario.objects.create(user=u2, id_personal=170110303)

print("Usuarios creados correctamente")
```

**Ejecutar:**
```bash
# En Docker:
docker-compose exec web python manage.py shell < crear_usuarios.py

# Local:
python manage.py shell < crear_usuarios.py
```

> **Nota:** `crear_usuarios.py` en este proyecto es solo un script temporal de carga inicial.
> No es parte de la app — se ejecuta una vez y puede borrarse después.

### Opción B — Django Admin (interfaz web)

Accede a `/admin/` con un superusuario:
1. Crea el usuario en **Authentication > Users**
2. En la sección **Groups** del usuario, asigna el grupo correspondiente
3. Para el `PerfilUsuario`, accede a **Login > Perfil usuarios** y crea la vinculación

### Opción C — Shell one-liner (para un usuario a la vez)

```bash
docker-compose exec web python manage.py shell -c "
from django.contrib.auth.models import User, Group
from Login.models import PerfilUsuario
u = User.objects.create_user(username='correo@dominio.mx', password='Pass123')
u.groups.add(Group.objects.get(name='Encargado Almacen'))
PerfilUsuario.objects.create(user=u, id_personal=190110505)
print('Listo')
"
```

---

## 4. Resumen del flujo completo

```
Usuario inicia sesión
        │
        ▼
ProxyAutenticacion.autenticar()
  └─ authenticate() de Django → verifica auth_user
  └─ verifica sesiones activas en BD
        │
        ▼
Redirige a home
        │
        ▼
Accede a /Solicitudes/
        │
        ├─ user.groups.filter(name='Encargado Almacen').exists()
        │        │
        │    SÍ (True)                    NO (False)
        │        │                             │
        │   Ve ambos almacenes           Solo Cuautepec
        │   Puede aprobar                Sin botón Aprobar
        │   Todos los personales         Solo su propio personal
        │                                (auto-rellenado y bloqueado)
        │
        ▼
crear_solicitud() — validaciones server-side
  ├─ ¿Almacén Central? → solo si es_encargado
  └─ ¿id_personal correcto? → solo su propio id si no es encargado
```

---

## 5. Aplicar en otro proyecto Django

### Pasos mínimos

1. **Crear grupos** (una sola vez, en shell o fixture):
   ```python
   Group.objects.get_or_create(name='Rol1')
   Group.objects.get_or_create(name='Rol2')
   ```

2. **Crear modelo de perfil** (si necesitas vincular con BD legacy):
   ```python
   # En algún app/models.py
   class PerfilUsuario(models.Model):
       user      = models.OneToOneField(User, on_delete=models.CASCADE)
       id_externo = models.IntegerField(null=True, blank=True)
       class Meta:
           db_table = 'perfil_usuario'
   ```
   Luego `makemigrations` y `migrate`.

3. **Helper de verificación** en el controller:
   ```python
   def _tiene_rol(user, nombre_grupo):
       return user.groups.filter(name=nombre_grupo).exists()
   ```

4. **Pasar flags al template:**
   ```python
   return render(request, "template.html", {
       "es_admin": _tiene_rol(request.user, 'Rol1'),
   })
   ```

5. **Leer en JS vía data-attribute:**
   ```html
   <div data-es-admin="{{ es_admin|yesno:'true,false' }}"></div>
   ```
   ```javascript
   const ES_ADMIN = document.querySelector("[data-es-admin]").dataset.esAdmin === "true";
   ```

6. **Validar siempre en el backend** — nunca confiar solo en el frontend:
   ```python
   if not _tiene_rol(request.user, 'Rol1'):
       return JsonResponse({"error": "Sin permisos"}, status=403)
   ```
