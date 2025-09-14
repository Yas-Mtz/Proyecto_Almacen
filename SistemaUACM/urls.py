from django.conf.urls.static import static
from django.conf import settings
from django.contrib import admin
from django.urls import path, include
from . import views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('login/', include('Login.urls')),  # sigue igual
    path('home/', views.home, name='home'),
    path('GestiondeProductos/', include('GestiondeProductos.urls')),
    path('Reportes/', include('Reportes.urls')),
    path('Solicitudes/', include('Solicitudes.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
