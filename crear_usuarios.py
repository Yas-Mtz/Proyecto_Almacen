from django.contrib.auth.models import User, Group

g_gestor, _      = Group.objects.get_or_create(name='Encargado Almacen')
g_solicitante, _ = Group.objects.get_or_create(name='Solicitante')

u1 = User.objects.create_user(username='maria@encargado.uacm.edu.mx', password='Uacm2026*')      
u1.groups.add(g_gestor)

u2 = User.objects.create_user(username='ayudante1@encargado.uacm.edu.mx', password='Uacm2026*')  
u2.groups.add(g_gestor)

u3 = User.objects.create_user(username='daniela@profesor.uacm.edu.mx', password='Uacm2026*')     
u3.groups.add(g_solicitante)

for u in [u1, u2, u3]:
     print(u.username, '->', [g.name for g in u.groups.all()])