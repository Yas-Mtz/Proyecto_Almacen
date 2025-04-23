from django.urls import path
from . import views

urlpatterns = [
    path('', views.solicitud, name='solicitud'),
    path('crear/', views.solicitud, name='crear_solicitud'),  # POST
    path('buscar-personal/', views.buscar_personal_por_qr, name='buscar_personal_qr'),
    path('cancelar/<int:solicitud_id>/', views.cancelar_solicitud, name='cancelar_solicitud'),
    path('exportar/pdf/<int:solicitud_id>/', views.exportar_pdf, name='exportar_pdf'),
    path('exportar/csv/<int:solicitud_id>/', views.exportar_csv, name='exportar_csv'),
    path('detalle/<int:solicitud_id>/', views.detalle_solicitud, name='detalle_solicitud'),
]