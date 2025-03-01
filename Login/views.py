from django.contrib.auth.decorators import login_required
from django.shortcuts import render, redirect
from django.contrib import messages
from .Login_system import ProxyAutenticacion
from django.contrib.auth import logout as django_logout

# Instanciamos el ProxyAutenticacion para utilizarlo en las vistas
proxy_auth = ProxyAutenticacion()

# ----------- PATRÓN PROXY ----------- #


def login(request):
    """Vista para el inicio de sesión con restricción de sesiones múltiples."""
    if request.method == "POST":
        # Usamos el Proxy para autenticar
        if proxy_auth.autenticar(request):
            messages.success(request, "Inicio de sesión exitoso.")
            return redirect('home')
        else:
            messages.error(
                request, 'Ya existe una sesión iniciada o las credenciales son incorrectas.')
            return render(request, 'login.html')

    return render(request, 'login.html')

# ----------- Fin del patrón PROXY ----------- #

# ----------- PATRÓN PROXY ----------- #


def logout(request):
    """Cierra la sesión del usuario y elimina su sesión activa"""
    # Usamos el Proxy para cerrar sesión
    proxy_auth.cerrar_sesion(request)

    # Llamada a Django logout
    django_logout(request)

    # Redirigimos al login y eliminamos la cookie de sesión
    response = redirect('login')
    response.delete_cookie('sessionid')

    # Mensaje de éxito al cerrar sesión
    messages.success(request, "Cierre de sesión realizado exitosamente.")

    return response

# ----------- Fin del patrón PROXY ----------- #

# ----------- PATRÓN TEMPLATE METHOD ----------- #


@login_required
def home(request):
    """Página principal después del login"""
    return render(request, 'home.html')

# ----------- Fin del patrón TEMPLATE METHOD ----------- #
