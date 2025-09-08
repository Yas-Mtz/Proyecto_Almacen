from django.urls import path
from . import views
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('', views.gestiondeproductos, name='gestiondeproductos'),
    # Nueva ruta para generar el QR
    path('generar_qr/', views.generar_qr_view, name='generar_qr'),
    path('actualizar_stock/', views.actualizar_stock, name='actualizar_stock'),
    # Nueva URL para validación de productos duplicados
    path('verificar-producto/', views.verificar_producto, name='verificar_producto'),
]
