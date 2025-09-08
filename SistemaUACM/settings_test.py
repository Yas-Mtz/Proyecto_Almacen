from .settings import *
import os

# Base de datos SQLite en memoria para pruebas
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
    }
}

# Configuraciones para acelerar pruebas
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.MD5PasswordHasher',
]

DEBUG = False

# Desactivar migraciones en pruebas
class DisableMigrations:
    def __contains__(self, item):
        return True
    def __getitem__(self, item):
        return None

MIGRATION_MODULES = DisableMigrations()

# Configuración de sesiones para pruebas
SESSION_ENGINE = 'django.contrib.sessions.backends.cache'

# Desactivar validadores de contraseña para pruebas
AUTH_PASSWORD_VALIDATORS = []