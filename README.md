# Hackatón

## Levantar PostgreSQL, pgAdmin y el backend

Requisitos: Docker Desktop con Docker Compose habilitado.

Antes de iniciar, completa `Backend/.env` con los valores requeridos. Por
ejemplo, `DATABASE_URL` debe tener este formato y usar el mismo usuario,
contraseña y base configurados arriba:

```text
postgres://USUARIO:CONTRASEÑA@postgres:5432/BASE_DE_DATOS
```

Mantén `POSTGRES_DB`, `POSTGRES_USER` y `POSTGRES_PASSWORD` en concordancia con
los datos de usuario/base de `DATABASE_URL`. Dentro de Compose, el host de la
base de datos es `postgres` (no `localhost`).

Inicia los servicios:

```powershell
docker compose up --build
```

- Backend: http://localhost:3000/health
- pgAdmin: http://localhost:5050
- PostgreSQL desde tu equipo: `localhost:5432`

En pgAdmin, agrega un servidor con host `postgres`, puerto `5432` y las
credenciales de PostgreSQL definidas en `Backend/.env`. Los datos de PostgreSQL
y pgAdmin se conservan en volúmenes de Docker.

Para detener los servicios sin borrar los datos: `docker compose down`. Para
eliminar también los datos persistidos: `docker compose down -v`.

## Estado del backend

El backend tenía sus archivos de entrada y configuración vacíos. Se agregó el
arranque mínimo de Express y `/health` para que el contenedor pueda iniciar y
verificar su estado. Aunque las dependencias de PostgreSQL y Drizzle están
instaladas y Compose pasa `DATABASE_URL`, todavía faltan la conexión desde el
código, el esquema/migraciones y las rutas de negocio para que la aplicación
consulte o guarde datos.
