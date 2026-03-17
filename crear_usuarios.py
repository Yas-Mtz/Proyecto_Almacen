from django.contrib.auth.models import User, Group

g_encargado, _   = Group.objects.get_or_create(name='Encargado Almacen')
g_solicitante, _ = Group.objects.get_or_create(name='Solicitante')

usuarios = [
    # (username,                           password,    grupo,         es_staff)
    ('maria@encargado.uacm.edu.mx',    'Uacm2026*', g_encargado,   True),   # Encargado
    ('ayudante1@encargado.uacm.edu.mx','Uacm2026*', g_encargado,   False),  # Ayudante
    ('daniela@profesor.uacm.edu.mx',   'Uacm2026*', g_solicitante, False),  # Docente
    ('luis@profesor.uacm.edu.mx',      'Uacm2026*', g_solicitante, False),  # Docente
    ('ana@uacm.edu.mx',                'Uacm2026*', g_solicitante, False),  # Administrativo
]

for username, password, grupo, es_staff in usuarios:
    u, created = User.objects.get_or_create(username=username)
    if created:
        u.set_password(password)
        u.is_staff = es_staff
        u.save()
    u.groups.set([grupo])
    estado = 'creado' if created else 'ya existía'
    print(f"  {estado}: {username} → {grupo.name}")

print("\n✅ Usuarios listos.")
print("   Contraseña por defecto: Uacm2026*")
