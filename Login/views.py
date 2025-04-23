from django.contrib.auth.decorators import login_required
from django.shortcuts import render, redirect
from django.contrib import messages
from .Login_pattern import ProxyAutenticacion
from django.contrib.auth import logout as django_logout
from django.utils.html import escape
from django.views.decorators.clickjacking import xframe_options_deny
from django.views.decorators.csrf import csrf_protect
# Instanciamos el ProxyAutenticacion para utilizarlo en las vistas
proxy_auth = ProxyAutenticacion()

# ----------- PATRÓN PROXY ----------- #


def login(request):
    """Vista para el inicio de sesión con restricción de sesiones múltiples."""
    print("--- Procesando la vista de login ---")
    if request.method == "POST":
        username = escape(request.POST.get('username', '').strip())
        password = escape(request.POST.get('password', '').strip())
        # Obtener y eliminar espacios en blanco

        print(f"Username recibido (escapado): '{username}'")
        print(f"Password recibido (escapado): '{password}'")

        if not username or not password:
            messages.error(request, 'Por favor, complete todos los campos.')
            print(f"Mensajes después de error de campos vacíos: {list(messages.get_messages(request))}")
            return render(request, 'login.html')

        # Verificar si ya hay una sesión activa para el usuario
        if proxy_auth.verificar_sesion_activa(username):
            messages.warning(request, 'Ya has iniciado sesión anteriormente.')
            print(f"Mensajes después de sesión activa previa: {list(messages.get_messages(request))}")
            return render(request, 'login.html')

        # Usamos el Proxy para autenticar
        if not proxy_auth.autenticar(request):
            messages.error(request, 'Las credenciales son incorrectas.')
            print(f"Mensajes después de error de autenticación: {list(messages.get_messages(request))}")
            return render(request, 'login.html')

        # Si la autenticación es exitosa, redirigir a la página de inicio
        print("Autenticación exitosa, redirigiendo a home")
        return redirect('home')

    print(f"Renderizando login.html sin POST. Mensajes: {list(messages.get_messages(request))}")
    return render(request, 'login.html')
# ----------- Fin del patrón PROXY ----------- #

# ----------- PATRÓN PROXY ----------- #


def logout(request):
    """Cierra la sesión del usuario y elimina su sesión activa"""
    print("--- Procesando la vista de logout ---")
    # Usamos el Proxy para cerrar sesión
    proxy_auth.cerrar_sesion(request)
    print("ProxyAutenticacion.cerrar_sesion() llamado")

    # Llamada a Django logout
    django_logout(request)
    print("django_logout(request) llamado")

    # Redirigimos al login y eliminamos la cookie de sesión
    response = redirect('login')
    response.delete_cookie('sessionid')
    print("Cookie de sesión eliminada")

    # Mensaje de éxito al cerrar sesión
    messages.success(request, "Cierre de sesión realizado exitosamente.")
    print(f"Mensajes después de logout exitoso: {list(messages.get_messages(request))}")

    print("Redirigiendo a la página de login")
    return response

# ----------- Fin del patrón PROXY ----------- #

# ----------- PATRÓN TEMPLATE METHOD ----------- #


@login_required
def home(request):
    """Página principal después del login"""
    print("--- Procesando la vista de home ---")
    return render(request, 'home.html')

# ----------- Fin del patrón TEMPLATE METHOD ----------- #