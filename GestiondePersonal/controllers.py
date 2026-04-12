from django.http import JsonResponse
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.db.models import Q
from SistemaUACM.models import Personal, Rol, CategoriaSalarial
from Solicitudes.models import Solicitud, DetalleSolicitud, EstatusSolicitud


@login_required
def gestion_personal(request):
    return render(request, 'personal.html')


@login_required
def lista_personal(request):
    """
    API: listado de personal con búsqueda y filtro por rol.
    Query params:
      q       — texto libre (nombre, apellido, matrícula, correo)
      id_rol  — filtrar por rol
    """
    q      = request.GET.get('q', '').strip()
    id_rol = request.GET.get('id_rol', '').strip()

    qs = Personal.objects.select_related('id_rol', 'id_categoria_sal')

    if q:
        qs = qs.filter(
            Q(nombre_personal__icontains=q)
            | Q(apellido_paterno__icontains=q)
            | Q(apellido_materno__icontains=q)
            | Q(correo__icontains=q)
            | Q(id_personal__icontains=q)
        )

    if id_rol:
        qs = qs.filter(id_rol__id_rol=id_rol)

    personal = [
        {
            'id_personal':      p.id_personal,
            'nombre_completo':  _nombre_completo(p),
            'correo':           p.correo,
            'telefono':         p.telefono,
            'id_rol':           p.id_rol.id_rol,
            'cargo':            p.id_rol.nombre_rol,
            'categoria_salarial': (
                p.id_categoria_sal.categoria_salarial
                if p.id_categoria_sal else '—'
            ),
        }
        for p in qs.order_by('apellido_paterno', 'nombre_personal')
    ]

    roles = [
        {'id_rol': r.id_rol, 'nombre_rol': r.nombre_rol}
        for r in Rol.objects.all().order_by('nombre_rol')
    ]

    return JsonResponse({'personal': personal, 'roles': roles})


@login_required
def detalle_personal(request, id_personal):
    """
    API: datos de una persona + línea de tiempo de sus solicitudes.
    """
    try:
        persona = Personal.objects.select_related('id_rol', 'id_categoria_sal').get(
            id_personal=id_personal
        )
    except Personal.DoesNotExist:
        return JsonResponse({'error': 'Personal no encontrado'}, status=404)

    # Solicitudes donde esta persona es el solicitante
    solicitudes_qs = (
        Solicitud.objects
        .select_related('id_estatus', 'id_almacen', 'gestionado_por')
        .prefetch_related('detallesolicitud_set__id_producto')
        .filter(id_personal=persona)
        .order_by('fecha_solicitud')
    )

    timeline = []
    for sol in solicitudes_qs:
        productos = [
            {
                'id_producto':   d.id_producto.id_producto,
                'nombre':        d.id_producto.nombre_producto,
                'cantidad':      d.cantidad,
            }
            for d in sol.detallesolicitud_set.all()
        ]

        evento = {
            'id_solicitud':   sol.id_solicitud,
            'fecha':          sol.fecha_solicitud.strftime('%Y-%m-%d %H:%M'),
            'estatus':        sol.id_estatus.nombre_estatus if sol.id_estatus else '—',
            'almacen':        str(sol.id_almacen) if sol.id_almacen else '—',
            'observaciones':  sol.observaciones_solicitud or '',
            'productos':      productos,
            'gestionado_por': (
                _nombre_completo(sol.gestionado_por)
                if sol.gestionado_por else None
            ),
            'fecha_gestion': (
                sol.fecha_gestion.strftime('%Y-%m-%d %H:%M')
                if sol.fecha_gestion else None
            ),
        }
        timeline.append(evento)

    data = {
        'id_personal':       persona.id_personal,
        'nombre_completo':   _nombre_completo(persona),
        'correo':            persona.correo,
        'telefono':          persona.telefono,
        'cargo':             persona.id_rol.nombre_rol,
        'categoria_salarial': (
            persona.id_categoria_sal.categoria_salarial
            if persona.id_categoria_sal else '—'
        ),
        'descripcion_categoria': (
            persona.id_categoria_sal.descripcion
            if persona.id_categoria_sal else '—'
        ),
        'timeline': timeline,
    }

    return JsonResponse(data)


# ── helpers ──────────────────────────────────────────────────────────────────

def _nombre_completo(p):
    partes = [p.nombre_personal, p.apellido_paterno]
    if p.apellido_materno:
        partes.append(p.apellido_materno)
    return ' '.join(partes)
