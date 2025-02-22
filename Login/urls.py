from django.urls import path
from . import views  # Asegúrate de que la importación es correcta

urlpatterns = [
    path('', views.login, name='login'),
    # Cambio logout a logout_view
    path('logout/', views.logout, name='logout'),

]
