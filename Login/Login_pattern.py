# login_pattern.py
from django.contrib.auth import authenticate, login, logout
from django.contrib.sessions.models import Session
from django.utils.timezone import now
from django.contrib.auth.models import User
from abc import ABC, abstractmethod
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

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

# ----------- PATRÓN PROXY ----------- #
class AutenticacionReal(Autenticacion):
    """
    Implementación real de la autenticación de usuario con protección básica.
    """
    MAX_INTENTOS = 3
    BLOQUEO_MINUTOS = 5

    def __init__(self):
        self.intentos_fallidos = {}

    def autenticar(self, request):
        username = request.POST.get('username', '').strip()
        password = request.POST.get('password', '').strip()

        # Validación básica de entrada
        if not username or not password:
            logger.warning("Intento de login con campos vacíos")
            return False

        # Protección contra fuerza bruta
        if self._usuario_bloqueado(username):
            logger.warning(f"Usuario {username} temporalmente bloqueado")
            return False

        user = authenticate(request, username=username, password=password)

        if user is not None:
            login(request, user)
            logger.info(f"Login exitoso para {username}")
            self._reset_intentos(username)
            return True
        else:
            self._registrar_intento_fallido(username)
            logger.warning(f"Login fallido para {username}")
            return False

    def cerrar_sesion(self, request):
        if request.user.is_authenticated:
            username = request.user.username
            logout(request)
            logger.info(f"Sesión cerrada para {username}")
            return True
        return False

    def _registrar_intento_fallido(self, username):
        self.intentos_fallidos[username] = self.intentos_fallidos.get(username, 0) + 1

    def _reset_intentos(self, username):
        if username in self.intentos_fallidos:
            del self.intentos_fallidos[username]

    def _usuario_bloqueado(self, username):
        if username in self.intentos_fallidos:
            return self.intentos_fallidos[username] >= self.MAX_INTENTOS
        return False


class ProxyAutenticacion(Autenticacion):
    """
    Proxy para controlar el acceso a la autenticación real con:
    - Prevención de múltiples sesiones
    - Registro de actividad
    - Protección adicional
    """
    _instancia = None
    _sesiones_activas = {}  # {user_id: (username, session_key)}

    def __new__(cls, *args, **kwargs):
        if not cls._instancia:
            cls._instancia = super().__new__(cls, *args, **kwargs)
            cls._instancia.autenticacion_real = AutenticacionReal()
            cls._instancia._sesiones_activas = {}
        return cls._instancia

    def autenticar(self, request):
        username = request.POST.get('username', '').strip()
        password = request.POST.get('password', '').strip()

        # Validación de entrada
        if not username or not password:
            logger.warning("Intento de login con campos vacíos desde Proxy")
            return False

        try:
            user = User.objects.get(username=username)
            
            # Verificar múltiples sesiones
            if self.verificar_sesion_activa(username):
                logger.warning(f"Usuario {username} intentó iniciar sesión múltiple")
                return False

            # Autenticación real
            if not self.autenticacion_real.autenticar(request):
                return False

            # Registrar sesión activa
            self._sesiones_activas[user.id] = (username, request.session.session_key)
            logger.info(f"Sesión registrada para {username}")
            return True

        except User.DoesNotExist:
            logger.warning(f"Intento de login con usuario inexistente: {username}")
            return False
        except Exception as e:
            logger.error(f"Error inesperado en autenticación: {str(e)}")
            return False

    def cerrar_sesion(self, request):
        if not hasattr(request, 'session') or '_auth_user_id' not in request.session:
            return False

        user_id = request.session['_auth_user_id']
        
        # Eliminar de sesiones activas
        if user_id in self._sesiones_activas:
            username, _ = self._sesiones_activas.pop(user_id)
            logger.info(f"Sesión removida para {username}")

        # Cerrar sesión en autenticación real
        return self.autenticacion_real.cerrar_sesion(request)

    def verificar_sesion_activa(self, username):
        """Versión mejorada con protección contra inyección"""
        try:
            user = User.objects.get(username=username)
            return user.id in self._sesiones_activas
        except User.DoesNotExist:
            return False
        except Exception as e:
            logger.error(f"Error al verificar sesión: {str(e)}")
            return False

    def limpiar_sesiones_expiradas(self):
        """Limpia sesiones que ya no están activas en la base de datos"""
        try:
            sesiones_validas = set(
                session.get_decoded().get('_auth_user_id') 
                for session in Session.objects.filter(expire_date__gte=now())
            )

            for user_id in list(self._sesiones_activas.keys()):
                if str(user_id) not in sesiones_validas:
                    username, _ = self._sesiones_activas.pop(user_id)
                    logger.info(f"Limpieza de sesión expirada para {username}")
        except Exception as e:
            logger.error(f"Error al limpiar sesiones: {str(e)}")