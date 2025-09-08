from django.contrib.auth.decorators import login_required
from django.shortcuts import render, redirect
from django.contrib import messages
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
    for cookie in [settings.SESSION_COOKIE_NAME, settings.LANGUAGE_COOKIE_NAME]:
        response.delete_cookie(cookie)
    return response

@login_required
def home(request):
    """Página principal después del login"""
    print("--- Procesando la vista de home ---")
    return render(request, 'home.html')
