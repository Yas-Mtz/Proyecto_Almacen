# views.py
from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
from django.db import transaction
import json
import csv
from io import BytesIO
from reportlab.pdfgen import canvas
from datetime import datetime
from .models import Solicitud, DetalleSolicitud, Producto
from SistemaUACM.models import Almacen, Personal, Rol 


# ----------------------------
# 1. Observer Pattern (Para notificaciones)
# ----------------------------
class SolicitudObserver:
    def __init__(self):
        self.observers = []
    
    def subscribe(self, callback):
        self.observers.append(callback)
    
    def notify(self, event, data=None):
        for observer in self.observers:
            observer(event, data)

# Observadores concretos
def logger(event, data):
    print(f"[LOG] {event}: {data}")

def email_notifier(event, data):
    if event == "solicitud_creada":
        print(f"Enviando email sobre nueva solicitud {data['id_solicitud']}")
    elif event == "solicitud_cancelada":
        print(f"Notificando cancelación de solicitud {data['id_solicitud']}")

# ----------------------------
# 2. Command Pattern (Para acciones)
# ----------------------------
class CrearSolicitudCommand:
    def __init__(self, observer):
        self.observer = observer
    
    @transaction.atomic
    def execute(self, personal, data):
        try:
            # Crear la solicitud
            solicitud = Solicitud.objects.create(
                id_almacen_id=data['id_almacen'],
                id_personal=personal,
                observaciones_solicitud=data.get('observaciones_solicitud', '')
            )
            
            # Crear detalles de solicitud
            detalles = []
            for producto_data in data.get('productos', []):
                detalle = DetalleSolicitud.objects.create(
                    id_solicitud=solicitud,
                    id_producto_id=producto_data['id_producto'],
                    cantidad=producto_data['cantidad']
                )
                detalles.append({
                    'nombre_producto': detalle.id_producto.nombre_producto,
                    'cantidad': detalle.cantidad
                })
            
            resultado = {
                'id_solicitud': solicitud.id_solicitud,
                'nombre_personal': f"{personal.nombre_personal} {personal.apellido_paterno}",
                'almacen': solicitud.id_almacen.talmacen,
                'fecha_solicitud': solicitud.fecha_solicitud.strftime('%Y-%m-%d %H:%M'),
                'productos': detalles
            }
            
            self.observer.notify("solicitud_creada", resultado)
            return resultado
            
        except Exception as e:
            self.observer.notify("error", str(e))
            raise

class CancelarSolicitudCommand:
    def __init__(self, observer):
        self.observer = observer
    
    def execute(self, solicitud_id):
        try:
            solicitud = Solicitud.objects.get(id_solicitud=solicitud_id)
            # En tu modelo actual no hay campo estado, podrías agregarlo o eliminarla
            # Esta es una implementación básica que notifica la "cancelación"
            self.observer.notify("solicitud_cancelada", {'id_solicitud': solicitud_id})
            return True
        except Exception as e:
            self.observer.notify("error", str(e))
            raise

# ----------------------------
# 3. Strategy Pattern (Para exportación)
# ----------------------------
class ExportadorPDF:
    def exportar(self, solicitud_data):
        buffer = BytesIO()
        p = canvas.Canvas(buffer)
        
        p.drawString(100, 800, f"Solicitud #{solicitud_data['id_solicitud']}")
        p.drawString(100, 780, f"Solicitante: {solicitud_data['nombre_personal']}")
        p.drawString(100, 760, f"Almacén: {solicitud_data['almacen']}")
        p.drawString(100, 740, f"Fecha: {solicitud_data['fecha_solicitud']}")
        
        p.drawString(100, 700, "Productos solicitados:")
        y = 680
        for producto in solicitud_data['productos']:
            p.drawString(120, y, f"- {producto['nombre_producto']}: {producto['cantidad']}")
            y -= 20
        
        p.showPage()
        p.save()
        buffer.seek(0)
        return HttpResponse(buffer, content_type='application/pdf')

class ExportadorCSV:
    def exportar(self, solicitud_data):
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="solicitud_{solicitud_data["id_solicitud"]}.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['ID Solicitud', solicitud_data['id_solicitud']])
        writer.writerow(['Solicitante', solicitud_data['nombre_personal']])
        writer.writerow(['Almacén', solicitud_data['almacen']])
        writer.writerow(['Fecha', solicitud_data['fecha_solicitud']])
        writer.writerow([])
        writer.writerow(['Productos solicitados'])
        writer.writerow(['Producto', 'Cantidad'])
        
        for producto in solicitud_data['productos']:
            writer.writerow([producto['nombre_producto'], producto['cantidad']])
        
        return response

# ----------------------------
# Vistas principales
# ----------------------------
@login_required
@login_required
def solicitud(request):
    """Vista principal para mostrar el formulario y procesar solicitudes"""
    observer = SolicitudObserver()
    observer.subscribe(logger)
    observer.subscribe(email_notifier)
    
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            personal = get_object_or_404(Personal, id_personal=request.user.id)
            
            command = CrearSolicitudCommand(observer)
            solicitud_creada = command.execute(personal, data)
            
            if data.get('exportar') == 'pdf':
                exportador = ExportadorPDF()
                return exportador.exportar(solicitud_creada)
            elif data.get('exportar') == 'csv':
                exportador = ExportadorCSV()
                return exportador.exportar(solicitud_creada)
            
            return JsonResponse({'status': 'success', 'solicitud': solicitud_creada})
        
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)
    
    # GET request - Mostrar template con datos iniciales
    almacenes = Almacen.objects.all().select_related('id_talmacen')
    productos = Producto.objects.all()
    roles = Rol.objects.all()  # Obtener todos los roles/cargos
    
    return render(request, 'solicitud.html', {
        'almacenes': almacenes,
        'productos': productos,
        'roles': roles  # Pasar los roles al template
    })
@csrf_exempt
@login_required
def cancelar_solicitud(request, solicitud_id):
    """Vista para cancelar solicitudes usando Command Pattern"""
    observer = SolicitudObserver()
    observer.subscribe(logger)
    observer.subscribe(email_notifier)
    
    try:
        command = CancelarSolicitudCommand(observer)
        command.execute(solicitud_id)
        return JsonResponse({'status': 'success', 'message': 'Solicitud cancelada'})
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=400)

@login_required
def exportar_pdf(request, solicitud_id):
    """Vista para exportar a PDF usando Strategy Pattern"""
    solicitud = get_object_or_404(Solicitud, id_solicitud=solicitud_id)
    detalles = DetalleSolicitud.objects.filter(id_solicitud=solicitud).select_related('id_producto')
    
    datos_solicitud = {
        'id_solicitud': solicitud.id_solicitud,
        'nombre_personal': f"{solicitud.id_personal.nombre_personal} {solicitud.id_personal.apellido_paterno}",
        'almacen': solicitud.id_almacen.id_talmacen.tipo_almacen,
        'fecha_solicitud': solicitud.fecha_solicitud.strftime('%Y-%m-%d %H:%M'),
        'productos': [{
            'nombre_producto': detalle.id_producto.nombre_producto,
            'cantidad': detalle.cantidad
        } for detalle in detalles]
    }
    
    exportador = ExportadorPDF()
    return exportador.exportar(datos_solicitud)

@login_required
def exportar_csv(request, solicitud_id):
    """Vista para exportar a CSV usando Strategy Pattern"""
    solicitud = get_object_or_404(Solicitud, id_solicitud=solicitud_id)
    detalles = DetalleSolicitud.objects.filter(id_solicitud=solicitud).select_related('id_producto')
    
    datos_solicitud = {
        'id_solicitud': solicitud.id_solicitud,
        'nombre_personal': f"{solicitud.id_personal.nombre_personal} {solicitud.id_personal.apellido_paterno}",
        'almacen': solicitud.id_almacen.id_talmacen.tipo_almacen,
        'fecha_solicitud': solicitud.fecha_solicitud.strftime('%Y-%m-%d %H:%M'),
        'productos': [{
            'nombre_producto': detalle.id_producto.nombre_producto,
            'cantidad': detalle.cantidad
        } for detalle in detalles]
    }
    
    exportador = ExportadorCSV()
    return exportador.exportar(datos_solicitud)

@login_required
def detalle_solicitud(request, solicitud_id):
    """Vista para mostrar el detalle de una solicitud"""
    solicitud = get_object_or_404(Solicitud, id_solicitud=solicitud_id)
    detalles = DetalleSolicitud.objects.filter(id_solicitud=solicitud).select_related('id_producto')
    
    return render(request, 'detalle_solicitud.html', {
        'solicitud': solicitud,
        'detalles': detalles
    })


@csrf_exempt
def buscar_personal_por_qr(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            qr_data = data.get('qr_data')
            
            # Asumiendo que el QR contiene la matrícula/id_personal
            personal = Personal.objects.get(id_personal=qr_data)
            
            return JsonResponse({
                'success': True,
                'data': {
                    'matricula': personal.id_personal,
                    'nombre': f"{personal.nombre_personal} {personal.apellido_paterno}",
                    'cargo': personal.id_rol.nombre_rol if personal.id_rol else ''
                }
            })
        except Personal.DoesNotExist:
            return JsonResponse({'success': False, 'error': 'Personal no encontrado'})
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)})