from django.contrib.auth.decorators import login_required
from django.shortcuts import render, redirect
from django.contrib import messages
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from .Login_pattern import ProxyAutenticacion
from django.contrib.auth import logout as django_logout
from django.utils.html import escape
from django.views.decorators.clickjacking import xframe_options_deny
from django.views.decorators.csrf import csrf_protect
import logging
from django.conf import settings

logger = logging.getLogger(__name__)
proxy_auth = ProxyAutenticacion()

@csrf_protect
@xframe_options_deny
def login(request):
    """Vista para el inicio de sesión con restricción de sesiones múltiples."""
    # Redirigir si ya está autenticado
    if request.user.is_authenticated:
        return redirect('home')

    if request.method == "POST":
        try:
            username = escape(request.POST.get('username', '').strip())
            password = escape(request.POST.get('password', '').strip())

            # Validación básica
            if not username or not password:
                messages.error(request, 'Por favor, complete todos los campos.')
                return render(request, 'login.html')

            # Verificar sesión activa
            if proxy_auth.verificar_sesion_activa(username):
                # Bloquear múltiples sesiones
                messages.warning(request, 'Ya existe una sesión activa con este usuario.')
                logger.warning(f"Intento de sesión múltiple para {username}")
                return render(request, 'login.html')
                
            # Autenticación
            if proxy_auth.autenticar(request):
                next_url = request.POST.get('next', 'home')
                logger.info(f"Login exitoso para {username}")
                return redirect(next_url)
            
            # Credenciales inválidas
            messages.error(request, 'Usuario o contraseña incorrectos.')
            logger.warning(f"Intento fallido de login para {username}")

        except Exception as e:
            logger.error(f"Error en login: {str(e)}", exc_info=True)
            messages.error(request, 'Error en el sistema. Por favor intente más tarde.')
        
        return render(request, 'login.html')

    # GET request - mostrar formulario
    return render(request, 'login.html', {
        'next': request.GET.get('next', '')
    })

@csrf_exempt
@require_http_methods(["POST"])
def ping_session(request):
    """Endpoint para heartbeat/ping de sesiones activas"""
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
        else:
            # Sesión no encontrada en memoria (posible restart del servidor)
            logger.warning(f"Ping de sesión no encontrada para {request.user.username}")
             # Cerrar sesión de Django
            django_logout(request)

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
    """Endpoint para verificar estado de la sesión"""
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
    """Cierra la sesión del usuario y elimina su sesión activa"""
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
    # Limpieza de cookies
    for cookie in [settings.SESSION_COOKIE_NAME, getattr(settings, 'LANGUAGE_COOKIE_NAME', 'django_language')]:
        response.delete_cookie(cookie)
    return response

@login_required
def home(request):
    """Página principal después del login"""
    logger.debug("--- Procesando la vista de home ---")
    return render(request, 'home.html')