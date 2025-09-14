from django.shortcuts import render
# importación de decorador para inicio de sesión
from django.contrib.auth.decorators import login_required
# Vistade login


@login_required(login_url='login')
def home(request):
    return render(request, 'home.html', {'usuario': request.user.username})
