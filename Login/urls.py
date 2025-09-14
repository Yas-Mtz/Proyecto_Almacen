from django.urls import path
from . import views

urlpatterns = [
    # Ruta principal de login (url: /login/)
    path('', views.login, name='login'),

    # Página principal después del login (url: /login/home/)
    path('home/', views.home, name='home'),

    # Logout (url: /login/logout/)
    path('logout/', views.logout, name='logout'),

    # API endpoints para manejo de sesiones
    path('ping-session/', views.ping_session, name='ping_session'),
    path('session-status/', views.session_status, name='session_status'),
]
