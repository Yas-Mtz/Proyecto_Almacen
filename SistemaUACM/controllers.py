from django.shortcuts import render
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from GestiondeProductos.models import Producto
from Solicitudes.models import Solicitud, EstatusSolicitud
from SistemaUACM.models import Personal


@login_required(login_url='login')
def home(request):
    return render(request, 'index.html')


@login_required(login_url='login')
def home_stats(request):
    """Endpoint JSON para que React obtenga los datos del dashboard."""
    try:
        id_estatus_pendiente = EstatusSolicitud.objects.get(nombre_estatus='Solicitada').pk
        solicitudes_pendientes = Solicitud.objects.filter(id_estatus=id_estatus_pendiente).count()
    except Exception:
        solicitudes_pendientes = 0

    try:
        total_productos = Producto.objects.count()
    except Exception:
        total_productos = 0

    try:
        total_personal = Personal.objects.count()
    except Exception:
        total_personal = 0

    try:
        productos_bajo_stock = sum(
            1 for p in Producto.objects.all() if p.necesita_reabastecimiento
        )
    except Exception:
        productos_bajo_stock = 0

    try:
        total_solicitudes = Solicitud.objects.count()
    except Exception:
        total_solicitudes = 0

    user_role = request.user.groups.first().name if request.user.groups.exists() else 'Usuario'

    try:
        persona = Personal.objects.get(correo=request.user.username)
        persona_nombre = f"{persona.nombre_personal} {persona.apellido_paterno}"
    except Personal.DoesNotExist:
        persona_nombre = request.user.username

    return JsonResponse({
        'total_productos': total_productos,
        'solicitudes_pendientes': solicitudes_pendientes,
        'total_solicitudes': total_solicitudes,
        'total_personal': total_personal,
        'productos_bajo_stock': productos_bajo_stock,
        'user_role': user_role,
        'persona_nombre': persona_nombre,
    })
