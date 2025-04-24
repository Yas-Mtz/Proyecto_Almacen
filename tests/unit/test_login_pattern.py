import pytest
from django.test import RequestFactory
from django.contrib.auth.models import User
from django.contrib.sessions.middleware import SessionMiddleware
from django.contrib.auth.middleware import AuthenticationMiddleware
from django.contrib.sessions.models import Session
from django.utils.timezone import now, timedelta
from django.contrib.auth import get_user
from Login.Login_pattern import ProxyAutenticacion

def agregar_sesion(request):
    """Añade los middlewares de sesión y autenticación al request."""
    middleware = SessionMiddleware(lambda req: None)
    middleware.process_request(request)
    request.session.save()
    
    # Añadir middleware de autenticación
    auth_middleware = AuthenticationMiddleware(lambda req: None)
    auth_middleware.process_request(request)
    
    return request

# Fixture para usuario de prueba genérico
@pytest.fixture
def usuario_prueba(db):
    return User.objects.create_user(
        username='testuser', 
        password='testpass123',
        is_active=True
    )

# Fixture para el usuario real Gerente1010
@pytest.fixture
def usuario_real(db):
    user, created = User.objects.get_or_create(
        username='Gerente1010',
        defaults={'is_active': True}
    )
    if created:
        user.set_password('cuautepec1010')
        user.save()
    return user

@pytest.fixture
def rf():
    return RequestFactory()

@pytest.fixture
def proxy():
    return ProxyAutenticacion()

# Prueba con usuario real
def test_autenticacion_usuario_real(usuario_real, rf, proxy):
    request = rf.post('/', {
        'username': 'Gerente1010',
        'password': 'cuautepec1010'
    })
    request = agregar_sesion(request)
    
    assert proxy.autenticar(request) is True
    assert '_auth_user_id' in request.session
    assert get_user(request).is_authenticated
    assert get_user(request).username == 'Gerente1010'
    
    assert proxy.cerrar_sesion(request) is True
    assert '_auth_user_id' not in request.session

def test_proxy_cerrar_sesion(usuario_prueba, rf, proxy):
    request = rf.post('/', {
        'username': 'testuser',
        'password': 'testpass123'
    })
    request = agregar_sesion(request)
    
    assert proxy.autenticar(request) is True
    assert '_auth_user_id' in request.session
    assert get_user(request).is_authenticated
    
    assert proxy.cerrar_sesion(request) is True
    assert '_auth_user_id' not in request.session

def test_limpieza_sesiones_expiradas(usuario_prueba, rf, proxy):
    request = rf.post('/', {'username': 'testuser', 'password': 'testpass123'})
    request = agregar_sesion(request)
    
    # Autenticar usuario
    assert proxy.autenticar(request) is True
    
    # Forzar expiración manualmente
    session = Session.objects.get(session_key=request.session.session_key)
    session.expire_date = now() - timedelta(days=1)  # Fecha en el pasado
    session.save()
    
    # Ejecutar limpieza
    assert proxy.limpiar_sesiones_expiradas() is True
    
    # Verificar que la sesión se marcó como inactiva
    assert not proxy.verificar_sesion_activa('testuser')

def test_sesiones_multiples(usuario_real, rf, proxy):
    # Primer login
    request1 = rf.post('/', {
        'username': 'Gerente1010',
        'password': 'cuautepec1010'
    })
    request1 = agregar_sesion(request1)
    
    # Verificar autenticación exitosa
    assert proxy.autenticar(request1) is True
    assert '_auth_user_id' in request1.session
    
    # Verificar que la sesión está activa
    assert proxy.verificar_sesion_activa('Gerente1010') is True, \
        "La sesión debería estar activa después del primer login"
    
    # Segundo login - debe fallar
    request2 = rf.post('/', {
        'username': 'Gerente1010',
        'password': 'cuautepec1010'
    })
    request2 = agregar_sesion(request2)
    
    assert proxy.autenticar(request2) is False, \
        "Debería bloquear el segundo inicio de sesión para el mismo usuario"
    
    # Verificar que la primera sesión sigue activa
    assert proxy.verificar_sesion_activa('Gerente1010') is True, \
        "La primera sesión debería mantenerse activa"
    assert '_auth_user_id' in request1.session, \
        "La primera sesión debería contener el ID de usuario"

def test_cerrar_sesion_no_autenticado(rf, proxy):
    request = rf.post('/')
    request = agregar_sesion(request)
    assert proxy.cerrar_sesion(request) is False
