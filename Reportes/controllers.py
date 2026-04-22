from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import render
from django.db import connection
from django.contrib.auth.decorators import login_required
from datetime import datetime
from SistemaUACM.models import Personal


@login_required
def reportes(request):
    """Renderiza la página de reportes"""
    return render(request, 'reportes.html')


@login_required
def datos_reportes(request):
    """API endpoint para React: info de usuario"""
    user_role = request.user.groups.first().name if request.user.groups.exists() else 'Usuario'
    try:
        persona = Personal.objects.get(correo=request.user.username)
        persona_nombre = f"{persona.nombre_personal} {persona.apellido_paterno}"
    except Personal.DoesNotExist:
        persona_nombre = request.user.username
    return JsonResponse({'persona_nombre': persona_nombre, 'user_role': user_role})

@login_required
@csrf_exempt
def reporte_solicitudes(request):
    if request.method == 'POST':
        try:
            fecha_inicio = request.POST.get('fecha_inicio')
            fecha_fin = request.POST.get('fecha_fin')

            if not fecha_inicio or not fecha_fin:
                return JsonResponse({'error': 'Las fechas son obligatorias'}, status=400)

            fecha_inicio = datetime.strptime(fecha_inicio, '%Y-%m-%d')
            fecha_fin = datetime.strptime(fecha_fin, '%Y-%m-%d')

            with connection.cursor() as cursor:
                cursor.callproc('GenerarReporteSolicitudes', [fecha_inicio, fecha_fin])
                results = cursor.fetchall()

            productos = []
            for result in results:
                productos.append({
                    'id_solicitud': result[0],
                    'almacen_direccion': result[1],
                    'nom_articulo': result[2],
                    'cantidad': result[3],
                    'nombre_persona': result[4],
                    'fecha_sol': result[5].strftime('%Y-%m-%d'),
                })

            return JsonResponse({'productos': productos})

        except ValueError:
            return JsonResponse({'error': 'Formato de fecha inválido. Use YYYY-MM-DD'}, status=400)
        except Exception as e:
            return JsonResponse({'error': f'Error al generar el reporte: {str(e)}'}, status=500)

@login_required
def inventario(request):
    """Obtener los datos de inventario y devolverlos en formato JSON"""
    # Llamar al procedimiento almacenado para obtener todos los artículos
    with connection.cursor() as cursor:
        cursor.callproc('GenerarInventario')
        results = cursor.fetchall()

    # Imprimir los resultados en la terminal para depurar
    print("Resultados de inventario:", results)

    # Convertir los resultados a una lista de diccionarios
    articulos = []
    for result in results:
        articulos.append({
            'nom_articulo': result[0],
            'desc_articulo': result[1],
            'cantidad': result[2],
            'nomb_estatus': result[3]
        })

    return JsonResponse({'articulos': articulos})
