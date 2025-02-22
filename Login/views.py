from django.contrib.auth.decorators import login_required
from django.shortcuts import render, redirect
from django.contrib import messages
from .Login_system import ProxyAutenticacion
from django.contrib.auth import logout as django_logout
from django.views.decorators.csrf import csrf_exempt

# Instanciamos el ProxyAutenticacion para utilizarlo en las vistas
proxy_auth = ProxyAutenticacion()

# ----------- PATRÓN PROXY ----------- #


def login(request):
    """Vista para el inicio de sesión con restricción de sesiones múltiples."""
    if request.method == "POST":
        if proxy_auth.autenticar(request):  # Usamos el Proxy para autenticar
            return redirect('home')
        else:
            messages.error(
                request, 'Ya existe una sesión iniciada')
            return render(request, 'login.html')

    return render(request, 'login.html')
# ----------- Fin del patrón PROXY ----------- #

# ----------- PATRÓN PROXY ----------- #


def logout(request):
    """Cierra la sesión del usuario y elimina su sesión activa"""
    proxy_auth.cerrar_sesion(request)  # Usamos el Proxy para cerrar sesión

    django_logout(request)

    response = redirect('login')
    response.delete_cookie('sessionid')

    # Mensaje opcional al cerrar sesión
    messages.success(request, "Cierre de sesión realizado")

    return response
# ----------- Fin del patrón PROXY ----------- #

# ----------- PATRÓN TEMPLATE METHOD ----------- #


@login_required
def home(request):
    """Página principal después del login"""
    return render(request, 'home.html')
# ----------- Fin del patrón TEMPLATE METHOD ----------- #
