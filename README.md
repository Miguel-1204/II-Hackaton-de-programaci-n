# Hackatón

## Docker

Requisitos: Docker Desktop con Docker Compose habilitado. Configura las
variables en `Backend/.env`; `DATABASE_URL` dentro de Compose debe usar
`postgres` como host. Inicia los servicios con:

```powershell
docker compose up --build -d
```

- Backend: http://localhost:3000/health
- pgAdmin: http://localhost:5050
- PostgreSQL desde el equipo: `localhost:5432`

En pgAdmin, registra el servidor usando `postgres` como host, puerto `5432` y
las credenciales de PostgreSQL de `Backend/.env`.

Los datos viven en volúmenes. `docker compose down` conserva los datos;
`docker compose down -v` los elimina, así que no uses este último como parte de
la actualización habitual.

## Migraciones versionadas con Drizzle

Las migraciones se generan y aplican por separado. El backend **no** migra ni
ejecuta seeds al arrancar. No uses `drizzle-kit push` para actualizar la base.

Desde `Backend`, instala las dependencias de desarrollo y genera una migración
cuando cambie `src/db/schema.js`:

```powershell
npm ci
npm run db:generate
npm run db:check
```

Revisa el SQL nuevo en `Backend/drizzle/` y conserva esos archivos versionados.
Luego reconstruye el servicio para incluir la migración y aplícala
explícitamente:

```powershell
Set-Location ..
docker compose up --build -d
docker compose exec backend npm run db:migrate
```

`db:migrate` registra el historial en PostgreSQL y aplica únicamente las
migraciones pendientes. Para inspeccionar la base con Drizzle Studio, ejecuta
lo siguiente desde `Backend`. Para conectar desde el equipo, esa sesión apunta
a `localhost:5432`; el host `postgres` solo se resuelve dentro de Docker:

```powershell
$env:DATABASE_URL = "postgres://USER:PASSWORD@localhost:5432/DATABASE"
npm run db:studio
Remove-Item Env:DATABASE_URL
```

La migración `0000` crea el esquema inicial. Si la base ya tiene tablas de esta
aplicación, no la apliques a ciegas: primero hay que comparar el esquema actual
y preparar una línea base que preserve tanto los datos como el historial.

## Orden de inicialización en una base nueva

1. Completa `Backend/.env`, incluyendo `ADMIN_NAME`, `ADMIN_EMAIL` y
   `ADMIN_PASSWORD`. La contraseña del administrador es necesaria solo para el
   seed y se guarda como hash scrypt, no en texto plano.
2. Inicia PostgreSQL y los servicios:

   ```powershell
   docker compose up --build -d
   ```

3. Genera/revisa la migración si aún no está creada y aplícala:

   ```powershell
   Set-Location .\Backend
   npm ci
   npm run db:generate
   npm run db:check
   Set-Location ..
   docker compose up --build -d
   docker compose exec backend npm run db:migrate
   ```

4. Ejecuta los seeds manualmente y en este orden:

   ```powershell
   docker compose exec backend npm run seed:roles
   docker compose exec backend npm run seed:admin
   docker compose exec backend npm run seed:demo
   ```

Los seeds son independientes y transaccionales. `seed:admin` requiere el rol
`ADMINISTRADOR`; `seed:demo` requiere el administrador para registrar el usuario
que recibe cada movimiento inicial. Puedes ejecutar `seed:roles` de nuevo sin
duplicar roles. El seed de administrador no reemplaza nombre, correo ni
contraseña de una cuenta existente.

## Autenticación y permisos

Configura `JWT_SECRET` en `Backend/.env` como una clave aleatoria de al menos
32 bytes; no reutilices la contraseña de la base de datos ni la incluyas en
Git. En PowerShell puedes generar una así:

```powershell
[Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
```

Copia el resultado como valor de `JWT_SECRET` en `Backend/.env`. `JWT_EXPIRES_IN`
es opcional y usa `15m` por defecto; los valores admitidos son segundos,
minutos, horas o días, hasta 30 días. Reconstruye/recrea el backend para que
Docker cargue la nueva configuración:

```powershell
docker compose up --build -d backend
```

- `POST /api/auth/login`: JSON `{ "email": "...", "password": "..." }`;
  responde con un JWT Bearer, expiración y datos públicos del usuario.
- `GET /api/auth/me`: requiere `Authorization: Bearer <token>` y devuelve el
  usuario público y los roles consultados en PostgreSQL.

El middleware `requireRoles('ADMINISTRADOR')` permite exigir permisos
administrativos en las rutas de gestión cuando se implementen. Los roles se
recargan desde la base de datos al validar cada petición; no se aceptan roles
declarados por el cliente. Actualmente no existen endpoints de gestión de
usuarios ni de bloqueo/liberación de lotes, por lo que todavía no hay rutas de
negocio a las cuales aplicar esos permisos.

Prueba desde Postman:

1. Envía `POST http://localhost:3000/api/auth/login` con `Content-Type:
   application/json` y cuerpo JSON con el correo y contraseña del administrador
   creado por el seed.
2. Copia `token` de la respuesta.
3. Envía `GET http://localhost:3000/api/auth/me` con
   `Authorization: Bearer <token>`.

Las credenciales incorrectas responden `401`; entrada mal formada, `400`;
token ausente, inválido o expirado, `401`; y usuario autenticado sin rol
requerido, `403`.

## Estrategia para los datos oficiales iniciales

Los registros de demostración se mantienen separados del esquema y de la
migración. Se interpretan CAC001, CAC002 y CAC003 como identificación del
productor y código del lote; como no se dieron nombres, cada código también se
usa como nombre del productor. Se conservan los municipios y cantidades
indicados: Rivera, 100 kg; Campoalegre, 150 kg; Algeciras, 80 kg.

Los lotes se crean con fecha de recepción del día de la carga y estado
`RECIBIDO`; el producto queda sin asignar porque no se proporcionó un catálogo
de productos. Por cada lote creado se registra en la misma transacción un
movimiento `ENTRADA` por la cantidad recibida, atribuido al administrador. Si
ya existe un productor o lote con esos identificadores, el seed no lo modifica
ni lo duplica.

## Comandos disponibles (Backend)

- `npm run db:generate`: generar migración SQL desde el esquema Drizzle.
- `npm run db:migrate`: aplicar migraciones pendientes.
- `npm run db:check`: comprobar consistencia del historial de migraciones.
- `npm run db:studio`: abrir Drizzle Studio.
- `npm run seed:roles`: insertar los roles iniciales.
- `npm run seed:admin`: crear el administrador inicial y asignarle el rol.
- `npm run seed:demo`: cargar productores, lotes y movimientos oficiales.
- `npm test`: ejecutar las pruebas automatizadas del backend.
