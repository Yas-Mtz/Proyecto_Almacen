from django.urls import path
from . import controllers

urlpatterns = [
    path('', controllers.gestiondeproductos, name='gestiondeproductos'),
    path('generar_qr/', controllers.generar_qr_view, name='generar_qr'),
    path('actualizar_stock/', controllers.actualizar_stock, name='actualizar_stock'),
    path('verificar-producto/', controllers.verificar_producto, name='verificar_producto'),
]
