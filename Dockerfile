# Usa una imagen base de Python 3.11 slim
FROM python:3.13-slim

# dependencias necesarias para compilar mysqlclient
RUN apt-get update && apt-get install -y gcc g++ libmariadb-dev pkg-config && rm -rf /var/lib/apt/lists/*

# directorio de trabajo
WORKDIR /app

# Copia el contenido del proyecto al contenedor
COPY . /app/

RUN chmod +x /app/wait-for-it.sh

# Actualiza pip
RUN pip install --upgrade pip

# dependencias de Python
RUN pip install -r requirements.txt

# Expone el puerto 8000 para acceder a la aplicación Django
EXPOSE 8000

# Comando por defecto para ejecutar la aplicación Django (espera primero la base de datos)
CMD ["/app/wait-for-it.sh", "db:3306", "--", "python", "manage.py", "runserver", "0.0.0.0:8000"]
