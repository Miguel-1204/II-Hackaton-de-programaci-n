# Hackatón

## Ejecutar frontend conectado al backend

El frontend consume la API Express del backend; no usa Supabase ni modo demo
para autenticación o inventario. Configura `Frontend/.env` a partir de
`Frontend/.env.example` (`VITE_API_URL` y `VITE_AUTH_DOMAIN`) y configura
`FRONTEND_ORIGIN` en `Backend/.env` con el origen donde se sirve Vite. Para
desarrollo local los valores son `http://localhost:3000/api`, `cacao.local` y
`http://localhost:5173`.

Con PostgreSQL, migraciones y seeds del backend preparados según esta guía:

```powershell
Set-Location .\Backend
npm ci
npm start
```

En otra terminal:

```powershell
Set-Location .\Frontend
npm ci
npm start
```

Vite muestra la URL del frontend en la terminal (normalmente
`http://localhost:5173`). `http://localhost:3000` corresponde al backend.

El inicio de sesión acepta el correo registrado o el nombre de usuario; si se
usa nombre, se añade el dominio de `VITE_AUTH_DOMAIN`. El backend firma una
sesión JWT que el cliente valida en `/api/auth/me` al recargar. Para desplegar,
usa HTTPS y establece `VITE_API_URL` y `FRONTEND_ORIGIN` con los dominios reales.

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

Los roles se recargan desde la base de datos al validar cada petición; no se
aceptan roles declarados por el cliente. La gestión de productores y el
bloqueo/liberación de lotes, catálogo de productos, costos, estadísticas,
reportes y NLP requieren `ADMINISTRADOR`; las recepciones, consultas
operativas, trazabilidad y transformaciones admiten `ADMINISTRADOR` y
`OPERADOR`.

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

## Modelo analítico: mermas, costos e inventario

La migración incremental `Backend/drizzle/0001_jazzy_sentinel.sql` agrega
restricciones de integridad, índices para filtros temporales/administrativos y
vistas de consulta; no borra ni recrea tablas o datos. La migración inicial
`0000` permanece intacta.

La estructura ya vincula productor→lote y transformación→lote participante, y
guarda fecha de transformación, cantidad/unidad por participación, movimientos
de inventario, costos por transformación, incidencias e historial de estados.
La nueva migración formaliza `ENTRADA`/`SALIDA`, exige cantidades positivas y
evita duplicar el mismo lote/rol dentro de una transformación. El seed oficial
sigue creando entradas iniciales de inventario; una transformación y sus
movimientos operativos deben registrarse en una transacción del servicio de
negocio.

Vistas listas para consultas analíticas controladas:

- `analitica_transformacion_merma`: entradas/salidas y merma total por
  transformación.
- `analitica_merma_productor`: detalle por productor y transformación,
  municipio, evaluación, lotes y cantidades de entrada/salida.
- `analitica_costos_transformacion`: líneas de costo; y
  `analitica_costos_por_transformacion`: total por transformación y moneda.
  Los costos permanecen separados de las participaciones para evitar
  multiplicarlos mediante `JOIN`.
- `analitica_inventario_lotes`: saldo calculado con `ENTRADA` menos `SALIDA`.
- `analitica_estado_lotes`: estado actual, último motivo coincidente e
  incidencias agrupadas por estado.
- `analitica_incidencias`: dimensiones de incidencias sin descripción ni
  datos del usuario reportante.

La función SQL `cantidad_a_kg` convierte `kg`, `g` y toneladas en kg; unidades
desconocidas dan `NULL`. La fórmula es
`(entrada_kg - salida_kg) / entrada_kg * 100`; el umbral es estrictamente
mayor que 15 %. No se calcula merma si falta entrada/salida o hay unidades no
comparables. Para una atribución por productor, cada productor de entrada debe
tener también salida registrada en lotes vinculados al mismo productor. Si no
coincide ese conjunto, la vista marca
`PRODUCTORES_ENTRADA_SALIDA_NO_COINCIDEN` y devuelve métricas nulas; no reparte
por proporción ni imputa toda la pérdida a un productor. Esta atribución exige
que el servicio registre correctamente la procedencia de cada lote de salida.

## Productores, recepción e inventario operativo

No hizo falta una migración: `productores`, `lotes` y
`movimientos_inventario` ya contienen las relaciones, fechas, cantidades,
unidades, usuario responsable y clave única de idempotencia necesarias. El
saldo disponible no se duplica en una columna mutable: se calcula desde los
movimientos con `analitica_inventario_lotes`. Toda recepción crea el lote, su
movimiento `ENTRADA` y el evento de auditoría en una sola transacción. Un
reintento con la misma clave devuelve la recepción previa; reutilizar la clave
con datos distintos devuelve `409`.

- `GET /api/productores`: lista productores activos; admite `search`,
  `municipio`, `page` y `limit`.
- `GET /api/productores/:id`: consulta un productor.
- `POST /api/productores`: crea productor; solo administrador.
- `PATCH /api/productores/:id`: actualiza nombre, identificación o municipio;
  solo administrador.
- `DELETE /api/productores/:id`: desactivación lógica, sin borrar lotes
  históricos; solo administrador.
- `POST /api/recepciones`: crea lote y movimiento inicial; requiere
  `Idempotency-Key` y rol administrador u operador. El cuerpo acepta
  `productorId`, `codigo`, `cantidad`, `unidad` (`kg`, `g` o `t`), y
  opcionalmente `fechaRecepcion`, `productoId` y `tipoMaterial`.
- `GET /api/inventario/lotes`: consulta paginada, filtrable por `productorId`,
  `municipio`, `estado` y `search`; incluye saldo en kg, total de salidas y
  estado de bloqueo.
- `GET /api/inventario/lotes/:id`: consulta lote y saldo disponible.
- `GET /api/inventario/lotes/:id/movimientos`: historial paginado del libro de
  movimientos, incluyendo responsable y transformación, sin claves de
  idempotencia.

Las lecturas requieren autenticación y rol `ADMINISTRADOR` u `OPERADOR`.
Identificaciones de productores solo se devuelven a administradores. Las
recepciones exigen productores activos. Antes de registrar una transformación,
el backend bloquea los lotes en orden de ID y vuelve a comprobar estado y saldo
dentro de la misma transacción que escribe sus movimientos; así se evita el
doble consumo concurrente y se conserva la atomicidad entre transformación,
inventario, costos e incidencias.

Las validaciones de recepción y transformación solo admiten unidades de masa
comparables y cantidades que caben en `numeric(14,3)`. Los motivos de bloqueo
permanecen en el historial de estados; este módulo no acepta ni inventa
observaciones de recepción porque el esquema actual no tiene un campo para
almacenarlas.

Los lotes usan los estados `PENDIENTE`, `LIBERADO` y `BLOQUEADO`. Una recepción
nueva inicia en `PENDIENTE`; las migraciones convierten los valores históricos
`RECIBIDO` a `PENDIENTE` y `DISPONIBLE` a `LIBERADO`.
El estado comercial público se deriva de los lotes asociados al producto:
cualquier lote bloqueado bloquea la ficha; solo lotes liberados/disponibles
permiten ofrecerlo; en los demás casos aparece como pendiente. No se añadió un
estado redundante a la tabla `productos`.

## Ficha pública, costos y exportación

- `GET /api/public/productos/:codigo`: ficha sin JWT, limitada a nombre,
  código, descripción, unidad comercial, municipio de origen, lotes,
  transformaciones y estado comercial. No devuelve identificación ni nombre
  privado del productor, precio, costos, usuario, contraseñas ni credenciales.
  Un producto bloqueado siempre responde `disponible: false`.
- `GET /api/reportes/inventario.csv`: solo administrador. Acepta filtros
  opcionales `municipio` y `estado`, consulta PostgreSQL y devuelve CSV UTF-8
  con BOM, encabezados y campos citados; los costos se agrupan por moneda sin
  multiplicarse por joins de lotes/transformaciones.
- `GET /api/auditoria`: lista eventos persistidos de auditoría (máximo 500),
  solo administrador.
- `GET /api/auditoria/movimientos-recientes`: últimos movimientos de inventario
  con lote, responsable y referencia a transformación o venta, solo administrador.
- `GET /api/ventas` y `POST /api/ventas`: consulta y registra ventas reales,
  solo administrador. Una venta registra el movimiento `SALIDA` y su evento de
  auditoría en la misma transacción; requiere `Idempotency-Key`.
- `GET /api/productos/:id/margenes`: solo administrador. Calcula el costo por
  kg de salida y el margen únicamente con costos COP y precio de referencia
  configurado por kg; sin cantidad comparable, precio positivo o costo COP,
  deja el margen en `null` en vez de inventar un valor.

Las estadísticas y el PDF ahora son solo administrativos. Los eventos de
auditoría registran la recepción, creación de transformaciones, los costos
añadidos y los cambios de estado; los eventos iniciales de transformación
incluyen responsable, participaciones y costos de esa operación. La lectura de
trazabilidad agrupa las participaciones relacionadas en consultas por lote,
no ejecuta una consulta adicional por transformación.
Los cambios de estado, ventas, altas de producto y recepciones quedan en la
bitácora persistente. El panel ya no usa `localStorage` ni movimientos de
demostración para mostrar auditoría e historial reciente.

Ejemplos de filtros (aplicados como parámetros de consultas del backend):

```sql
SELECT *
FROM analitica_merma_productor
WHERE fecha_procesamiento >= $1
  AND fecha_procesamiento < $2
  AND municipio = $3
  AND estado_evaluacion = 'EVALUABLE'
  AND supera_umbral = true;

SELECT municipio, avg(merma_porcentaje) AS merma_promedio
FROM analitica_merma_productor
WHERE estado_evaluacion = 'EVALUABLE'
  AND fecha_procesamiento >= $1
  AND fecha_procesamiento < $2
GROUP BY municipio;

SELECT moneda, sum(costo_total) AS total
FROM analitica_costos_por_transformacion
WHERE fecha_procesamiento >= $1
  AND fecha_procesamiento < $2
GROUP BY moneda;
```

No se persisten PDFs ni preguntas/respuestas. El PDF presenta los lotes y su
participación, la evaluación y umbral aplicados, y los costos agregados por
moneda para las transformaciones incluidas. El resumen se calcula sobre las
filas filtradas. Se puede filtrar por período, municipio, productor,
`superaUmbral` y `estadoEvaluacion` (`EVALUABLE`,
`SIN_ENTRADAS_O_SALIDAS`, `UNIDADES_NO_COMPARABLES` o
`PRODUCTORES_ENTRADA_SALIDA_NO_COINCIDEN`).

El intérprete NLP usa reglas deterministas e intenciones permitidas sobre
consultas parametrizadas; no ejecuta SQL arbitrario ni usa una respuesta de un
modelo para formar SQL. Reconoce, entre otras, mermas superiores al 15 %,
promedios por municipio, transformaciones con mayor merma, cantidades
procesadas, costos totales y costo promedio COP/kg, lotes bloqueados e
incidencias abiertas y ventas registradas. Extrae “este mes” y “última semana” (últimos siete días, incluido hoy) usando
los límites del día en hora de Colombia. Una pregunta que no reconoce recibe `CONSULTA_NO_SOPORTADA`, no
un resumen distinto. La cantidad procesada es la suma de entradas de
transformaciones —flujo acumulado por etapas, no cacao único—. El costo
promedio COP/kg usa únicamente transformaciones evaluables que tienen costo
COP y cantidad de salida comparable; no asigna costos a municipios o
productores porque el esquema no registra esa distribución. Las mezclas sin
atribución sustentada siguen siendo no evaluables.

El endpoint NLP requiere JWT y `requireRoles('ADMINISTRADOR')`; la pregunta
está limitada a 500 caracteres. Las vistas no exponen hashes, tokens, correos
de usuarios ni descripciones de incidencias; la autorización se impone en el
backend.
Las consultas reconocidas pueden exportarse desde el panel a PDF; el informe
específico de mermas también está disponible directamente desde Consultas.
`POST /api/reportes/consulta/pdf` recibe la misma pregunta validada que el
intérprete y exporta la respuesta tabular reconocida; no exporta consultas que
no produzcan datos.

Ejemplos de uso:

```http
GET /api/reportes/merma-productor/pdf?fechaDesde=2026-10-01&fechaHasta=2026-10-31&productorId=7&municipio=Rivera&estadoEvaluacion=EVALUABLE
Authorization: Bearer <token>

POST /api/nlp/consultar
Authorization: Bearer <token>
Content-Type: application/json

{"pregunta":"¿Qué productores tuvieron mermas superiores al 15 % este mes?"}
```

Para probar las vistas contra PostgreSQL, con Docker y los seeds oficiales
disponibles, ejecuta:

```powershell
docker compose exec backend npm run test:analytics
```

El test realiza verificaciones en una transacción que siempre revierte sus
datos de prueba. La vista considera incidencias abiertas con estado `ABIERTA`,
`ABIERTO` o `EN_PROCESO`; las operaciones que cambien el estado de un lote
deben registrar también el motivo en `historial_estados`.

## Respaldo y restauración de PostgreSQL

Con Docker Desktop activo y los servicios de Compose iniciados, crea un
respaldo PostgreSQL en formato custom (guardado por defecto en
`Backend/backups/`, excluido de Git):

```powershell
.\Backend\scripts\db\backup.ps1
```

También puedes indicar la ruta del archivo:

```powershell
.\Backend\scripts\db\backup.ps1 -Destination C:\Backups\kaotrace.dump
```

La restauración **reemplaza los objetos y datos actuales** de la base
configurada en Compose. Asegúrate de seleccionar el respaldo correcto y
mantener una copia del estado actual antes de continuar; el script solicita
confirmación y se puede cancelar con `Ctrl+C`:

```powershell
.\Backend\scripts\db\restore.ps1 -BackupFile C:\Backups\kaotrace.dump
```

`-Force` omite el aviso de confirmación y solo debe usarse en automatizaciones
controladas. PostgreSQL aplica la restauración en una transacción y revierte
los cambios si el archivo no se puede restaurar. Estos comandos no programan
respaldos automáticos; establece una frecuencia externa según los requisitos
de operación y prueba periódicamente la recuperación en un entorno separado.

## Estrategia para los datos oficiales iniciales

Los registros de demostración se mantienen separados del esquema y de la
migración. Se interpretan CAC001, CAC002 y CAC003 como identificación del
productor y código del lote; como no se dieron nombres, cada código también se
usa como nombre del productor. Se conservan los municipios y cantidades
indicados: Rivera, 100 kg; Campoalegre, 150 kg; Algeciras, 80 kg.

Los lotes se crean con fecha de recepción del día de la carga y estado
`PENDIENTE`; el producto queda sin asignar porque no se proporcionó un catálogo
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
- `npm run test:analytics`: probar vistas analíticas contra la base activa, con
  fixtures transaccionales revertidos.
- `npm run test:inventory`: prueba de integración de recepción idempotente y
  concurrencia contra PostgreSQL. Usa productor/lote de prueba únicos y elimina
  únicamente esos registros y movimientos propios al finalizar; requiere seeds
  de roles y administrador.
- `npm run test:traceability`: crea y elimina 100 transformaciones sintéticas
  relacionadas, mide la consulta de trazabilidad y verifica ficha pública,
  privacidad, estado bloqueado y CSV real en PostgreSQL. Falla si la consulta
  supera 3 segundos en el entorno donde se ejecuta.
- `npm test`: ejecutar las pruebas automatizadas del backend.
