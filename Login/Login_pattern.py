import threading
import logging
from datetime import datetime, timedelta
from django.contrib.auth import authenticate, login, logout
from django.contrib.sessions.models import Session
from django.utils.timezone import now
from django.contrib.auth.models import User
from django.conf import settings

logger = logging.getLogger(__name__)

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
    def __init__(self, autenticador=None, timeout_minutes=30):
        self._lock = threading.Lock()
        self._sesiones_activas = {}  # {username: {'session_key': str, 'last_activity': datetime}}
        self._autenticacion_real = autenticador or AutenticacionReal()
        self._timeout_minutes = timeout_minutes

    def autenticar(self, request):
        username = request.POST.get('username', '').strip()
        password = request.POST.get('password', '').strip()

        if not username or not password:
            return False

        with self._lock:
            self._limpiar_sesiones_inactivas()

            if username in self._sesiones_activas:
                session_data = self._sesiones_activas[username]
                try:
                    Session.objects.get(
                        session_key=session_data['session_key'],
                        expire_date__gte=now()
                    )
                    return False  # Bloquear múltiples sesiones
                except Session.DoesNotExist:
                    del self._sesiones_activas[username]

            if not self._autenticacion_real.autenticar(request):
                return False

            if not request.session.session_key:
                request.session.save()

            self._sesiones_activas[username] = {
                'session_key': request.session.session_key,
                'last_activity': now()
            }
            return True

    def actualizar_ultima_actividad(self, username):
        with self._lock:
            if username in self._sesiones_activas:
                self._sesiones_activas[username]['last_activity'] = now()
                logger.debug(f"Actividad actualizada para {username}")
                return True
            return False

    def ping_sesion(self, request):
        if not request.user.is_authenticated:
            return False

        username = request.user.username
        updated = self.actualizar_ultima_actividad(username)

        if updated:
            logger.debug(f"Ping recibido de {username}")
            return True
        else:
            logger.warning(f"Ping de sesión no registrada: {username}")
            return False

    def _limpiar_sesiones_inactivas(self):
        cutoff_time = now() - timedelta(minutes=self._timeout_minutes)
        usernames_to_remove = []

        for username, session_data in self._sesiones_activas.items():
            last_activity = session_data.get('last_activity', now())
            if last_activity < cutoff_time:
                usernames_to_remove.append(username)
                logger.info(f"Sesión de {username} expirada por inactividad")

        for username in usernames_to_remove:
            del self._sesiones_activas[username]

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
                    logger.info(f"Sesión de {user.username} cerrada correctamente")
            return self._autenticacion_real.cerrar_sesion(request)
        except (User.DoesNotExist, ValueError):
            return False

    def verificar_sesion_activa(self, username):
        with self._lock:
            self._limpiar_sesiones_inactivas()

            if username not in self._sesiones_activas:
                return False

            session_data = self._sesiones_activas[username]
            session_key = session_data['session_key']

            try:
                session = Session.objects.get(
                    session_key=session_key,
                    expire_date__gte=now()
                )
                session_decoded = session.get_decoded()
                user = User.objects.get(username=username)
                if str(session_decoded.get('_auth_user_id')) == str(user.id):
                    return True
            except (Session.DoesNotExist, User.DoesNotExist) as e:
                del self._sesiones_activas[username]
                logger.error(f"Error al verificar la sesión activa para {username}: {str(e)}")

            return False

    def limpiar_sesiones_expiradas(self):
        try:
            if not getattr(settings, 'TESTING', False):
                with self._lock:
                    self._limpiar_sesiones_inactivas()

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
                            logger.info(f"Sesión de {username} limpiada por sincronización")
            return True
        except Exception as e:
            logger.error(f"Error limpiando sesiones: {str(e)}")
            return False

    def obtener_estadisticas_sesiones(self):
        with self._lock:
            stats = {
                'total_sesiones': len(self._sesiones_activas),
                'usuarios': list(self._sesiones_activas.keys()),
                'timeout_minutes': self._timeout_minutes
            }
            return stats