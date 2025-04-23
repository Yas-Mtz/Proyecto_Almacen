# test_login_pattern.py
import pytest
from django.test import RequestFactory
from django.contrib.auth.models import User
from django.contrib.sessions.middleware import SessionMiddleware
from Login.Login_pattern import ProxyAutenticacion, AutenticacionReal

# Configuración de logging para pruebas
import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Helper para agregar sesión a requests de prueba
def agregar_sesion(request):
    middleware = SessionMiddleware(lambda req: None)
    middleware.process_request(request)
    request.session.save()

# Fixtures
@pytest.fixture
def usuario_real(db):
    """Usuario real Gerente1010 para pruebas"""
    user, created = User.objects.get_or_create(
        username='Gerente1010',
        defaults={
            'is_staff': True,
            'is_active': True
        }
    )
    if created:
        user.set_password('cuautepec1010')
        user.save()
    return user

@pytest.fixture
def rf():
    """Request factory fixture"""
    return RequestFactory()

@pytest.fixture
def proxy():
    """Proxy de autenticación fixture"""
    return ProxyAutenticacion()

# Pruebas actualizadas
@pytest.mark.django_db
def test_autenticacion_real_login_exitoso(usuario_real, rf):
    request = rf.post('/', {
        'username': 'Gerente1010',
        'password': 'cuautepec1010'
    })
    agregar_sesion(request)
    
    auth = AutenticacionReal()
    resultado = auth.autenticar(request)
    
    assert resultado is True
    assert '_auth_user_id' in request.session
    assert request.session['_auth_user_id'] == str(usuario_real.id)

@pytest.mark.django_db
def test_proxy_bloquea_sesiones_multiples(usuario_real, rf, proxy):
    request1 = rf.post('/', {
        'username': 'Gerente1010',
        'password': 'cuautepec1010'
    })
    request2 = rf.post('/', {
        'username': 'Gerente1010', 
        'password': 'cuautepec1010'
    })
    agregar_sesion(request1)
    agregar_sesion(request2)
    
    # Primer login debe ser exitoso
    assert proxy.autenticar(request1) is True
    
    # Segundo login debe fallar
    assert proxy.autenticar(request2) is False

@pytest.mark.django_db
def test_proxy_cerrar_sesion(usuario_real, rf, proxy):
    request = rf.post('/', {
        'username': 'Gerente1010',
        'password': 'cuautepec1010'
    })
    agregar_sesion(request)
    
    # Autenticar primero
    assert proxy.autenticar(request) is True
    
    # Verificar cierre de sesión
    assert proxy.cerrar_sesion(request) is True
    assert '_auth_user_id' not in request.session
    assert not proxy.verificar_sesion_activa('Gerente1010')

# Pruebas de seguridad adicionales
@pytest.mark.django_db
def test_proteccion_fuerza_bruta(usuario_real, rf):
    auth = AutenticacionReal()
    
    for i in range(3):
        request = rf.post('/', {
            'username': 'Gerente1010',
            'password': 'password_incorrecta'
        })
        agregar_sesion(request)
        assert not auth.autenticar(request)
    
    # Cuarto intento debería estar bloqueado
    request = rf.post('/', {
        'username': 'Gerente1010',
        'password': 'cuautepec1010'
    })
    agregar_sesion(request)
    assert not auth.autenticar(request)

@pytest.mark.django_db
def test_limpieza_sesiones_expiradas(usuario_real, rf, proxy):
    request = rf.post('/', {
        'username': 'Gerente1010',
        'password': 'cuautepec1010'
    })
    agregar_sesion(request)
    
    assert proxy.autenticar(request) is True
    assert proxy.verificar_sesion_activa('Gerente1010')
    
    # Simular expiración
    from django.utils.timezone import timedelta
    request.session.set_expiry(-timedelta(days=1))  # Sesión expirada
    request.session.save()
    
    proxy.limpiar_sesiones_expiradas()
    assert not proxy.verificar_sesion_activa('Gerente1010')