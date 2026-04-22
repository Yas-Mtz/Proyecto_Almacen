from django.http import JsonResponse
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from .repository import PersonalRepository


@login_required
def gestion_personal(request):
    return render(request, 'personal.html')


@login_required
def lista_personal(request):
    q      = request.GET.get('q', '').strip()
    id_rol = request.GET.get('id_rol', '').strip()
    return JsonResponse(PersonalRepository.lista(q, id_rol))


@login_required
def detalle_personal(request, id_personal):
    data = PersonalRepository.detalle(id_personal)
    if data is None:
        return JsonResponse({'error': 'Personal no encontrado'}, status=404)
    return JsonResponse(data)
