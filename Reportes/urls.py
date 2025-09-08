# Reportes/urls.py
from django.urls import path
from . import views
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('', views.reportes, name='reportes'),  # Ruta por defecto para acceder a la página de reportes
    path('reporte_solicitudes/', views.reporte_solicitudes, name='reporte_solicitudes'),
    path('inventario/', views.inventario, name='inventario'),
]

