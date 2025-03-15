# Reportes/urls.py
from django.urls import path
from . import views
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('', views.reportes, name='reportes'),
    path('generar-reporte/', views.generar_reporte,
         name='generar_reporte'),  # Ruta añadida

] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
