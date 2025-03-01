from django.contrib.auth import authenticate, login, logout
from django.contrib.sessions.models import Session
from django.utils.timezone import now
from django.contrib.auth.models import User  # Asegúrate de importar User
from abc import ABC, abstractmethod

# ----------- PATRÓN TEMPLATE METHOD ----------- #
# clase base abstracta ABC (clase base para otras clases)


class Autenticacion(ABC):
    """
    El patrón Template Method define el esqueleto de un algoritmo, delegando algunos pasos a las subclases.
    La estructura del algoritmo está definida en el método `autenticar` y `cerrar_sesion`.
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
    La clase `AutenticacionReal` es responsable de autenticar al usuario.
    Este es el comportamiento "real" que se delega al Proxy.
    """

    def autenticar(self, request):
        # obtener valores
        username = request.POST.get('username')
        password = request.POST.get('password')
        # aitenticación de usuario/ verificación de credenciales
        user = authenticate(request, username=username, password=password)

        if user is not None:
            login(request, user)
            # Guarda el ID del usuario en la sesión

            request.session['user_id'] = user.id
            return True
        return False

    def cerrar_sesion(self, request):
        logout(request)
        request.session.flush()  # elimina la sesión actual

# ----------- Fin del patrón PROXY ----------- #

# ----------- PATRÓN PROXY ----------- #


class ProxyAutenticacion(Autenticacion):
    """
    El patrón Proxy actúa como intermediario entre el cliente (login) y la implementación real de autenticación.
    Controla el acceso a la autenticación real, como impedir múltiples sesiones.
    """

    # ----------- PATRÓN SINGLETON ----------- #
    _instancia = None  # Atributo estático para almacenar la instancia única

    def __new__(cls, *args, **kwargs):
        """
        Controla la creación de una única instancia de ProxyAutenticacion.
        Si la instancia no existe, la crea, de lo contrario, retorna la instancia existente.
        """
        if not cls._instancia:
            cls._instancia = super().__new__(cls, *args, **kwargs)
        return cls._instancia
    # ----------- Fin del patrón SINGLETON ----------- #

    def __init__(self):
        if not hasattr(self, 'autenticacion_real'):  # Evita re-inicialización si ya existe
            # Inicia la instancia de AutenticacionReal
            self.autenticacion_real = AutenticacionReal()

    def autenticar(self, request):
        """#+
        Autentica al usuario y verifica si ya tiene una sesión activa.#+
#+
        Parameters:#+
        request (HttpRequest): La solicitud HTTP que contiene los datos de inicio de sesión.#+
#+
        Returns:#+
        bool: True si la autenticación es exitosa y no hay sesión activa para el usuario.#+
              False si la autenticación falla o si el usuario ya tiene una sesión activa.#+
        """  # +
        username = request.POST.get('username')

        # Buscar sesiones activas del usuario
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
        Busca si el usuario ya tiene una sesión activa en la base de datos.
        """
        try:
            # Obtiene el ID del usuario basado en el username
            user = User.objects.get(username=username)
            user_id = user.id  # Obtén el ID de usuario

            # Busca sesiones activas
            sesiones = Session.objects.filter(
                expire_date__gte=now())  # Solo sesiones activas

            for session in sesiones:
                session_data = session.get_decoded()
                stored_user_id = session_data.get('user_id')

                # Compara el ID del usuario de la sesión con el ID de usuario actual
                if stored_user_id == user_id:
                    return True  # Se encontró una sesión activa
            return False
        except User.DoesNotExist:
            # Si no existe el usuario con ese nombre
            return False
# ----------- Fin del patrón PROXY ----------- #
