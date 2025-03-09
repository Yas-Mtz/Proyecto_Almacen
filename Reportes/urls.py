# Reportes/urls.py
from django.urls import path
from . import views

urlpatterns = [

    path('', views.reporte_view, name='reportes'),
    # path('generar-reporte/', views.generar_reporte, name='generar_reporte'),
]
