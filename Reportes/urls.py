# Reportes/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('', views.reportes, name='reportes'),
    path('generar-reporte/', views.generar_reporte,
         name='generar_reporte'),  # Ruta añadida
]
