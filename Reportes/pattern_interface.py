from abc import ABC, abstractmethod
import pandas as pd
from django.http import JsonResponse
from Reportes.models import Solicitudes, Articulos
from io import BytesIO
from django.http import FileResponse
from reportlab.pdfgen import canvas
