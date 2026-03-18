# Reportes/urls.py
from django.urls import path
from . import controllers as views
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('', views.reportes, name='reportes'),
    path('datos/', views.datos_reportes, name='datos_reportes'),
    path('reporte_solicitudes/', views.reporte_solicitudes, name='reporte_solicitudes'),
    path('inventario/', views.inventario, name='inventario'),
]

