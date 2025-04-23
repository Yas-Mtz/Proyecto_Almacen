from django.contrib.auth.decorators import login_required
from django.shortcuts import render, redirect
from django.contrib import messages
from .Login_pattern import ProxyAutenticacion
from django.contrib.auth import logout as django_logout

# Instanciamos el ProxyAutenticacion para utilizarlo en las vistas
proxy_auth = ProxyAutenticacion()

# ----------- PATRÓN PROXY ----------- #


def login(request):
    """Vista para el inicio de sesión con restricción de sesiones múltiples."""
    if request.method == "POST":
        username = request.POST.get('username', '').strip()  # Obtener y eliminar espacios en blanco
        password = request.POST.get('password', '').strip()  # Obtener y eliminar espacios en blanco

        if not username or not password:
            messages.error(request, 'Por favor, complete todos los campos.')
            return render(request, 'login.html')

        # Verificar si ya hay una sesión activa para el usuario
        if proxy_auth.verificar_sesion_activa(username):
            messages.warning(request, 'Ya has iniciado sesión anteriormente.')
            return render(request, 'login.html')

        # Usamos el Proxy para autenticar
        if not proxy_auth.autenticar(request):
            messages.error(request, 'Las credenciales son incorrectas.')
            return render(request, 'login.html')

        # Si la autenticación es exitosa, redirigir a la página de inicio
        return redirect('home')

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
