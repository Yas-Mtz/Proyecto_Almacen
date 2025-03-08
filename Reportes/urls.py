from django.contrib import admin
from django.urls import path
from . import views
urlpatterns = [
    path('', views.mostrar_reportes, name='reportes'),
    path('generar-reporte', views.generar_reporte,
         name='generar_reporte'),  # Aquí agregamos <int:tipo_reporte>
]
