from django.contrib.auth.decorators import login_required
from django.shortcuts import render, redirect
from django.contrib import messages
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt, csrf_protect
from django.contrib.auth import logout as django_logout
from django.views.decorators.clickjacking import xframe_options_deny
from django.conf import settings
import logging

from .Login_pattern import ProxyAutenticacion

logger = logging.getLogger(__name__)
proxy_auth = ProxyAutenticacion()


@csrf_protect
@xframe_options_deny
def login(request):
    """Controlador de inicio de sesión."""
    if request.user.is_authenticated:
        return redirect('home')

    if request.method == "POST":
        try:
            success, error_msg = proxy_auth.autenticar(request)
            if success:
                return redirect(request.POST.get('next', 'home'))
            messages.error(request, error_msg or 'Usuario o contraseña incorrectos.')
        except Exception as e:
            logger.error(f"Error en login: {str(e)}", exc_info=True)
            messages.error(request, 'Error en el sistema. Por favor intente más tarde.')
        return render(request, 'login.html')

    return render(request, 'login.html', {'next': request.GET.get('next', '')})


@csrf_exempt
@require_http_methods(["POST"])
def ping_session(request):
    """Controlador para heartbeat de sesiones activas."""
    if not request.user.is_authenticated:
        return JsonResponse({
            'status': 'error',
            'message': 'Usuario no autenticado',
            'redirect': '/login/'
        }, status=401)

    try:
        success = proxy_auth.ping_sesion(request)
        if success:
            return JsonResponse({
                'status': 'success',
                'message': 'Sesión actualizada',
                'timestamp': request.user.last_login.isoformat() if request.user.last_login else None
            })

        django_logout(request)
        logger.warning(f"Ping de sesión no encontrada para {request.user.username}")
        return JsonResponse({
            'status': 'warning',
            'message': 'Sesión no encontrada, redirigiendo...',
            'redirect': '/login/'
        }, status=200)

    except Exception as e:
        logger.error(f"Error en ping_session: {str(e)}", exc_info=True)
        return JsonResponse({
            'status': 'error',
            'message': 'Error del servidor',
            'redirect': '/login/'
        }, status=500)


@login_required
@require_http_methods(["GET"])
def session_status(request):
    """Controlador para verificar estado de la sesión."""
    try:
        username = request.user.username
        is_active = proxy_auth.verificar_sesion_activa(username)
        return JsonResponse({
            'status': 'success',
            'session_active': is_active,
            'username': username,
            'stats': proxy_auth.obtener_estadisticas_sesiones()
        })
    except Exception as e:
        logger.error(f"Error en session_status: {str(e)}", exc_info=True)
        return JsonResponse({
            'status': 'error',
            'message': 'Error al verificar sesión'
        }, status=500)


def logout(request):
    """Controlador de cierre de sesión."""
    if request.user.is_authenticated:
        username = request.user.username
        try:
            proxy_auth.cerrar_sesion(request)
            django_logout(request)
            messages.success(request, 'Has cerrado sesión correctamente.')
            logger.info(f"Logout exitoso para {username}")
        except Exception as e:
            logger.error(f"Error en logout: {str(e)}", exc_info=True)
            messages.error(request, 'Ocurrió un error al cerrar sesión.')

    response = redirect('login')
    for cookie in [settings.SESSION_COOKIE_NAME, getattr(settings, 'LANGUAGE_COOKIE_NAME', 'django_language')]:
        response.delete_cookie(cookie)
    return response


@login_required
def home(request):
    """Controlador de la página principal."""
    logger.debug("--- Procesando la vista de home ---")
    return render(request, 'home.html')
