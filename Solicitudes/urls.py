from django.urls import path
from . import controllers

urlpatterns = [
    path('', controllers.solicitud, name='solicitud'),
    path('datos/', controllers.datos_solicitud, name='datos_solicitud'),
    path('crear/', controllers.crear_solicitud, name='crear_solicitud'),  # POST
    path('buscar-personal/', controllers.buscar_personal_qr, name='buscar_personal_qr'),
    path('buscar/<int:solicitud_id>/', controllers.buscar_solicitud, name='buscar_solicitud'),
    path('aprobar/<int:solicitud_id>/', controllers.aprobar_solicitud, name='aprobar_solicitud'),
    path('cancelar/<int:solicitud_id>/', controllers.cancelar_solicitud, name='cancelar_solicitud'),
   # path('exportar/pdf/<int:solicitud_id>/', views.exportar_pdf, name='exportar_pdf'),
    #path('exportar/csv/<int:solicitud_id>/', views.exportar_csv, name='exportar_csv'),
]