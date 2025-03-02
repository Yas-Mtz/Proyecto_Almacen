from django.contrib import admin
from django.urls import path
from . import views
urlpatterns = [
    path('', views.gestiondeproductos, name='gestiondeproductos'),
    # Nueva ruta para generar el QR
    path('generar_qr/', views.generar_qr_view, name='generar_qr'),
]
