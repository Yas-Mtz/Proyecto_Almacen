from django.contrib.auth import authenticate, login, logout
from django.contrib.sessions.models import Session
from django.utils.timezone import now
from django.contrib.auth.models import User
from abc import ABC, abstractmethod

# ----------- PATRÓN TEMPLATE METHOD ----------- #


class Autenticacion(ABC):
    """
    Define el esqueleto de un algoritmo para autenticar y cerrar sesión.
    """
    @abstractmethod
    def autenticar(self, request):
        pass

    @abstractmethod
    def cerrar_sesion(self, request):
        pass

# ----------- Fin del patrón TEMPLATE METHOD ----------- #

# ----------- PATRÓN PROXY ----------- #


class AutenticacionReal(Autenticacion):
    """
    Implementación real de la autenticación de usuario.
    """

    def autenticar(self, request):
        username = request.POST.get('username')
        password = request.POST.get('password')

        user = authenticate(request, username=username, password=password)

        if user is not None:
            login(request, user)
            request.session['user_id'] = user.id
            return True
        return False

    def cerrar_sesion(self, request):
        logout(request)
        request.session.flush()


class ProxyAutenticacion(Autenticacion):
    """
    Proxy para controlar el acceso a la autenticación real.
    Bloquea múltiples sesiones y delega la autenticación a AutenticacionReal.
    """
    _instancia = None  # Singleton

    def __new__(cls, *args, **kwargs):
        if not cls._instancia:
            cls._instancia = super().__new__(cls, *args, **kwargs)
        return cls._instancia

    def __init__(self):
        if not hasattr(self, 'autenticacion_real'):
            self.autenticacion_real = AutenticacionReal()

    def autenticar(self, request):
        username = request.POST.get('username')

        if self.verificar_sesion_activa(username):
            print(
                f"Usuario {username} ya tiene una sesión activa. No se permite otro inicio de sesión.")
            return False  # Bloquea el inicio de sesión

        print(f"ProxyAutenticacion: Intentando autenticar a {username}")
        resultado = self.autenticacion_real.autenticar(request)

        if resultado:
            print(f"ProxyAutenticacion: Autenticación exitosa para {username}")

        return resultado

    def cerrar_sesion(self, request):
        print(f"ProxyAutenticacion: Cerrando sesión del usuario")
        self.autenticacion_real.cerrar_sesion(request)

    def verificar_sesion_activa(self, username):
        """
        Verifica si el usuario ya tiene una sesión activa en el sistema.
        """
        try:
            user = User.objects.get(username=username)
            user_id = user.id
            sesiones = Session.objects.filter(
                expire_date__gte=now())  # Solo sesiones activas

            for session in sesiones:
                session_data = session.get_decoded()
                if session_data.get('user_id') == user_id:
                    return True  # Sesión activa encontrada

            return False
        except User.DoesNotExist:
            return False  # Usuario no encontrado

# ----------- Fin del patrón PROXY ----------- #
