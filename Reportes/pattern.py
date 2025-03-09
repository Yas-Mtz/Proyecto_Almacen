import xlwt
from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
# Asegurar que el modelo está importado correctamente
from .models import Solicitudes
