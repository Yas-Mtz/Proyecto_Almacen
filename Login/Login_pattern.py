import threading
import logging
from django.contrib.auth import authenticate, login, logout
from django.contrib.sessions.models import Session
from django.utils.timezone import now
from django.contrib.auth.models import User
from django.conf import settings  # Importar settings para verificar entorno de pruebas

logger = logging.getLogger(__name__)
#patroness usados proxy y singleton
# proxy Añade una capa de lógica adicional (como evitar múltiples sesiones) antes de delegar la autenticación real.
class AutenticacionReal:
    def autenticar(self, request):
        user = authenticate(
            username=request.POST.get('username'),
            password=request.POST.get('password')
        )
        if user is not None:
            login(request, user)
            return True
        return False

    def cerrar_sesion(self, request):
        if hasattr(request, 'user') and request.user.is_authenticated:
            logout(request)
            return True
        return False

class ProxyAutenticacion:
    _instancia = None
    _lock = threading.Lock()

    def __new__(cls):
        if cls._instancia is None:
            cls._instancia = super().__new__(cls)
            cls._instancia._sesiones_activas = {}  # {username: session_key}
            cls._instancia._autenticacion_real = AutenticacionReal()
        return cls._instancia

    def autenticar(self, request):
        username = request.POST.get('username', '').strip()
        password = request.POST.get('password', '').strip()

        if not username or not password:
            return False

        with self._lock:
            # Verificar sesión existente
            if username in self._sesiones_activas:
                try:
                    Session.objects.get(
                        session_key=self._sesiones_activas[username],
                        expire_date__gte=now()
                    )
                    return False  # Bloquear múltiples sesiones
                except Session.DoesNotExist:
                    del self._sesiones_activas[username]

            # Autenticación real
            if not self._autenticacion_real.autenticar(request):
                return False

            # Asegurar que la sesión esté guardada
            if not request.session.session_key:
                request.session.save()

            self._sesiones_activas[username] = request.session.session_key
            return True

    def cerrar_sesion(self, request):
        if not hasattr(request, 'session'):
            return False

        user_id = request.session.get('_auth_user_id')
        if not user_id:
            return False

        try:
            user = User.objects.get(id=int(user_id))
            with self._lock:
                if user.username in self._sesiones_activas:
                    del self._sesiones_activas[user.username]
            return self._autenticacion_real.cerrar_sesion(request)
        except (User.DoesNotExist, ValueError):
            return False

    def verificar_sesion_activa(self, username):
        with self._lock:
            # Verificar primero en memoria
            if username not in self._sesiones_activas:
                return False

            session_key = self._sesiones_activas[username]

            # Verificar en la base de datos de sesiones
            try:
                session = Session.objects.get(
                    session_key=session_key,
                    expire_date__gte=now()
                )
                # Verificar adicionalmente que la sesión pertenece al usuario
                session_data = session.get_decoded()
                user = User.objects.get(username=username)
                if str(session_data.get('_auth_user_id')) == str(user.id):
                    return True
            except (Session.DoesNotExist, User.DoesNotExist) as e:
                # Si no existe o no coincide, limpiar
                del self._sesiones_activas[username]
                logger.error(f"Error al verificar la sesión activa para {username}: {str(e)}")

            return False

    def limpiar_sesiones_expiradas(self):
        try:
            # Solo limpiar sesiones si no estamos en un entorno de pruebas
            if not settings.TESTING:
                with self._lock:
                    active_sessions = Session.objects.filter(expire_date__gte=now())
                    active_usernames = set()

                    for session in active_sessions:
                        session_data = session.get_decoded()
                        user_id = session_data.get('_auth_user_id')
                        if user_id:
                            try:
                                user = User.objects.get(id=int(user_id))
                                active_usernames.add(user.username)
                            except (User.DoesNotExist, ValueError):
                                continue

                    for username in list(self._sesiones_activas.keys()):
                        if username not in active_usernames:
                            del self._sesiones_activas[username]
            return True
        except Exception as e:
            logger.error(f"Error limpiando sesiones: {str(e)}")
            return False
