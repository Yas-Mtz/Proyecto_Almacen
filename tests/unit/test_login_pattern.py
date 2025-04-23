import pytest
from django.test import RequestFactory
from django.contrib.auth.models import User
from django.contrib.sessions.middleware import SessionMiddleware
from Login.Login_pattern import ProxyAutenticacion, AutenticacionReal, Autenticacion


def agregar_sesion(request):
    """Aplica middleware de sesión a una request falsa."""
    middleware = SessionMiddleware(lambda req: None)
    middleware.process_request(request)
    request.session.save()


@pytest.mark.django_db
def test_autenticacion_real_login_exitoso():
    factory = RequestFactory()
    User.objects.create_user(username='daniela', password='1234')
    request = factory.post('/', {'username': 'daniela', 'password': '1234'})
    agregar_sesion(request)

    auth_real = AutenticacionReal()
    result = auth_real.autenticar(request)

    assert result is True
    assert 'user_id' in request.session


@pytest.mark.django_db
def test_autenticacion_real_login_fallido():
    factory = RequestFactory()
    request = factory.post('/', {'username': 'fake', 'password': 'badpass'})
    agregar_sesion(request)

    auth_real = AutenticacionReal()
    result = auth_real.autenticar(request)

    assert result is False


@pytest.mark.django_db
def test_proxy_autenticacion_bloquea_sesion_activa(mocker):
    factory = RequestFactory()
    request = factory.post('/', {'username': 'daniela', 'password': '1234'})
    agregar_sesion(request)

    proxy = ProxyAutenticacion()
    mocker.patch.object(proxy, 'verificar_sesion_activa', return_value=True)

    result = proxy.autenticar(request)
    assert result is False


@pytest.mark.django_db
def test_proxy_autenticacion_permite_login(mocker):
    factory = RequestFactory()
    User.objects.create_user(username='daniela', password='1234')
    request = factory.post('/', {'username': 'daniela', 'password': '1234'})
    agregar_sesion(request)

    proxy = ProxyAutenticacion()
    mocker.patch.object(proxy, 'verificar_sesion_activa', return_value=False)

    result = proxy.autenticar(request)
    assert result is True
    assert 'user_id' in request.session


@pytest.mark.django_db
def test_proxy_cerrar_sesion_resetea_sesion():
    factory = RequestFactory()
    request = factory.get('/')
    agregar_sesion(request)

    request.session['user_id'] = 99
    proxy = ProxyAutenticacion()
    proxy.cerrar_sesion(request)

    assert request.session.get('user_id') is None


def test_template_method_implementado():
    """
    Asegura que las subclases de Autenticacion implementen los métodos esperados
    """
    assert hasattr(AutenticacionReal(), 'autenticar')
    assert hasattr(AutenticacionReal(), 'cerrar_sesion')
    assert hasattr(ProxyAutenticacion(), 'autenticar')
    assert hasattr(ProxyAutenticacion(), 'cerrar_sesion')

    # Además, que sean instancias válidas de la clase base abstracta
    assert isinstance(AutenticacionReal(), Autenticacion)
    assert isinstance(ProxyAutenticacion(), Autenticacion)
