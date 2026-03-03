# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SistemaUACM is a Django-based inventory management system with a React frontend for UACM (Universidad Autónoma de la Ciudad de México). The system manages products, categories, users, requests, and generates reports for academic institution inventory control.

## Architecture

### Backend (Django 4.2)
- **Main Project**: `SistemaUACM/` - Django project configuration
- **Apps**:
  - `Login/` - User authentication and session management
  - `GestiondeProductos/` - Product catalog, categories, brands, and inventory management
  - `Solicitudes/` - Request management system for product orders
  - `Reportes/` - Report generation (Excel, PDF formats)

### Frontend (React 19 + Vite)
- Located in `frontend_uacm/`
- Built with Vite for development and bundling
- Static files served from `frontend_uacm/build/` directory
- Django serves React build files via template integration

### Database
- MySQL 8.0 (configured in docker-compose.yml)
- Models use `managed = False` indicating database-first approach
- Database connection via `django-environ` and `.env` file

## Development Commands

### Docker Development (Recommended)
```bash
# Start full stack (Django + MySQL)
docker-compose up

# Rebuild containers
docker-compose up --build

# Run migrations
docker-compose exec web python manage.py migrate

# Access Django shell
docker-compose exec web python manage.py shell
```

### Local Django Development
```bash
# Install Python dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Start Django development server
python manage.py runserver

# Create Django admin user
python manage.py createsuperuser

# Collect static files
python manage.py collectstatic
```

### Frontend Development
```bash
# Navigate to frontend directory
cd frontend_uacm

# Install dependencies
npm install

# Development server
npm run dev

# Build for production
npm run build

# Lint code
npm run lint
```

### Testing
```bash
# Run Django tests
python manage.py test

# Run pytest with coverage
pytest

# Run Playwright tests (end-to-end)
npx playwright test
```

## Key Architecture Patterns

### Database Models
- All models inherit from Django's Model but use `managed = False`
- Custom `db_column` attributes map to existing database schema
- Foreign key relationships preserve database integrity
- Models include business logic methods (e.g., `necesita_reabastecimiento` property)

### URL Structure
- Main URLs in `SistemaUACM/urls.py`
- App-specific URLs included via `include()`
- Pattern: `/{app_name}/` for each major function
- Media files served conditionally in DEBUG mode

### Static Files Integration
- React build output integrated with Django static files system
- `STATICFILES_DIRS` includes React build directory
- Templates configured to serve from `frontend_uacm/build/`

### Session Management
- Database-backed sessions with 30-minute timeout
- Custom session configuration for security
- Login redirects configured via `LOGIN_URL`

### File Uploads
- Media files stored in project root (`MEDIA_ROOT = BASE_DIR`)
- Product images stored with relative paths in database
- QR code generation capability via `qrcode[pil]`

## Environment Configuration

### Required Environment Variables (.env)
```
DATABASE_URL=mysql://user:password@host:port/database
DEBUG=True
```

### Docker Environment
- MySQL runs on port 3307 (host) → 3306 (container)
- Django runs on port 8000
- `wait-for-it.sh` ensures database readiness before Django startup

## Development Workflow

1. Database changes require external schema modifications (managed = False)
2. Frontend changes built and committed to `frontend_uacm/build/`
3. Static files collected via Django management command
4. Tests include both unit tests and Playwright functional tests
5. Development primarily via Docker Compose for consistency

## Special Considerations

- Models are not Django-managed; schema changes happen externally
- React build artifacts committed to repository
- Spanish localization enabled (`LANGUAGE_CODE = 'es'`)
- Mexico City timezone configured
- Session security configured for institutional use