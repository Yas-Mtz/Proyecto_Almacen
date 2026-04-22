from django.urls import path
from . import controllers

urlpatterns = [
    # Ruta principal de login (url: /login/)
    path('', controllers.login, name='login'),

    # Logout (url: /login/logout/)
    path('logout/', controllers.logout, name='logout'),

    # API endpoints para manejo de sesiones
    path('ping-session/', controllers.ping_session, name='ping_session'),
    path('session-status/', controllers.session_status, name='session_status'),
]
