from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import render


def reporte_view(request):

    return render(request, 'reportes.html')
