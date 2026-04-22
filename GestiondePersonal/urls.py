from django.urls import path
from . import controllers

urlpatterns = [
    path('', controllers.gestion_personal, name='gestion_personal'),
    path('lista/', controllers.lista_personal, name='lista_personal'),
    path('<int:id_personal>/', controllers.detalle_personal, name='detalle_personal'),
]
