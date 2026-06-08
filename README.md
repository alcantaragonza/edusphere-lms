# EduSphere LMS

Plataforma LMS para gestión de cursos en línea, inscripciones, progreso estudiantil,
cuestionarios, foros, certificados y reportes financieros/académicos.

---

## Stack

| Componente | Tecnología |
|------------|------------|
| Runtime | Node.js ≥ 18 (CommonJS, sin TypeScript) |
| Framework | Express 5 |
| Gestor de paquetes | pnpm 10 |
| BD relacional | PostgreSQL 16 (`pg`, SQL parametrizado, sin ORM) |
| BD documental | MongoDB 6 (mongoose solo para ciclo de vida de conexión; operaciones con driver nativo) |
| Auth | JWT + bcrypt |
| Infraestructura | Docker Compose (desarrollo local) |

---

## 1. Requisitos previos

- **Node.js** ≥ 18
- **pnpm** (`npm install -g pnpm`)
- **Docker** y Docker Compose
- **Postman** (opcional, colección incluida en `postman/`)

---

## 2. Setup desde cero

### 2.1 Clonar e instalar dependencias

```bash
git clone <url-del-repo>
cd edusphere-lms
pnpm install
```

### 2.2 Configurar variables de entorno

```bash
cp .env.example .env
```

Editar `.env` y completar **todas** las variables. Las contraseñas con caracteres
especiales (`#`, espacios, `$`) deben ir entre comillas.

```ini
# PostgreSQL
POSTGRES_CONTAINER_NAME=edusphere_postgres
POSTGRES_HOST=localhost
POSTGRES_USER=admin
POSTGRES_PASSWORD="Admin7816#"
POSTGRES_DB=edusphere_db
POSTGRES_PORT=5433

# API
PORT=3000

# MongoDB
MONGO_CONTAINER_NAME=edusphere_mongo
MONGO_HOST=localhost
MONGO_PORT=27017
MONGO_INITDB_ROOT_USERNAME=admin
MONGO_INITDB_ROOT_PASSWORD="Admin7816#"
MONGO_INITDB_DATABASE=edusphere
```

> **Importante:** `JWT_SECRET` y `JWT_EXPIRES` **no** están en `.env.example`, pero son
> requeridos por el middleware de autenticación (`src/middlewares/auth.js`) y el
> controller de auth. Agregarlos manualmente:
> ```ini
> JWT_SECRET="cadena-larga-aleatoria-segura"
> JWT_EXPIRES=8h
> ```

### 2.3 Levantar bases de datos con Docker

```bash
docker compose --env-file .env -f infra/docker-compose.yml up -d
```

Verificar:

```bash
docker ps --filter name=edusphere_
```

### 2.4 Crear la base de datos PostgreSQL

Ejecutar los scripts en orden. Todos son idempotentes.

```bash
# 1) Tipos ENUM, tablas, constraints, extensión pgcrypto
docker exec -i edusphere_postgres \
  psql -U admin -d edusphere_db < db/Postgres/db-edusphere.sql

# 2) Migración: columna password_hash en usuarios
docker exec -i edusphere_postgres \
  psql -U admin -d edusphere_db < docs/auth.sql

# 3) Migración: modificado_por a UUID con FK auto-referenciada
docker exec -i edusphere_postgres \
  psql -U admin -d edusphere_db < docs/migracion-modificado-por-uuid.sql
```

### 2.5 Crear objetos de base de datos (SP, funciones, vistas)

```bash
# Stored procedures, funciones y vistas (nombres que espera la API)
docker exec -i edusphere_postgres \
  psql -U admin -d edusphere_db < db/Postgres/objetos-pendientes.sql

# Versión final de SPs con pagos automáticos, comisiones y auditoría
docker exec -i edusphere_postgres \
  psql -U admin -d edusphere_db < db/objetos-finales.sql

# Cambios desplegados: trigger sync categoria/estado, SP con pago
docker exec -i edusphere_postgres \
  psql -U admin -d edusphere_db < db/cambios_railway.sql

# Vistas adicionales: catálogo, cursos del estudiante, materializadas
docker exec -i edusphere_postgres \
  psql -U admin -d edusphere_db < db/vistas.sql
```

### 2.6 Índices de rendimiento (recomendado)

```bash
docker exec -i edusphere_postgres \
  psql -U admin -d edusphere_db < db/indices.sql
```

### 2.7 Cargar datos de prueba (PostgreSQL)

```bash
docker exec -i edusphere_postgres \
  psql -U admin -d edusphere_db < db/seeds/seed_data.sql
```

El seed genera: 40 usuarios, 7 instructores, 30 estudiantes, 8 categorías,
12 cursos, módulos, lecciones, preguntas, inscripciones, pagos, certificados
y liquidaciones de instructores.

### 2.8 Configurar MongoDB

#### 2.8.1 Crear colecciones con validadores `$jsonSchema` e índices

```bash
node db/Mongo/aplicar_schema.js
```

> Lee variables MongoDB desde `.env`. Crea 5 colecciones con validación
> JSON Schema a nivel de base de datos e índices (únicos, compuestos, TTL 90 días).

#### 2.8.2 Cargar datos de prueba en MongoDB

```bash
node db/Mongo/seed_mongo.js
```

> Conecta a PostgreSQL para leer UUIDs reales (inscripciones, estudiantes, cursos,
> lecciones) y genera documentos coherentes en las 5 colecciones MongoDB. Produce
> más de 22,000 registros entre progreso, logs, reseñas, cuestionarios y foros.

### 2.9 Iniciar la API

```bash
pnpm dev        # desarrollo con recarga automática (nodemon)
# pnpm start    # producción
```

API en `http://localhost:3000/api`. Verificar:

```bash
curl http://localhost:3000/api/health
# {"ok":true,"db":"up","mongo":"up"}
```

---

## 3. Objetos de MongoDB (sección 5.3 del enunciado)

### 3.1 Colecciones

| Colección | Validación | Índices |
|-----------|-----------|---------|
| `progreso_lecciones` | `$jsonSchema` con array embebido de lecciones | `inscripcion_id` (unique), `estudiante_id`, `curso_id` |
| `logs_actividad` | `$jsonSchema` con catálogo cerrado de eventos | `usuario_id+timestamp`, `tipo_evento+timestamp`, `metadata.curso_id` (sparse), TTL 90 días |
| `resenas` | `$jsonSchema` con 5 dimensiones de calificación (1-5) | `inscripcion_id` (unique), `curso_id+fecha_resena`, `instructor_id`, `aprobada+fecha_resena` |
| `cuestionarios_respuestas` | `$jsonSchema` con array de preguntas/respuestas | `estudiante_id+leccion_id+intento`, `leccion_id+fecha_intento` |
| `foros` | `$jsonSchema` con auto-referencia `parent_id` | `curso_id+fecha_creacion`, `estudiante_id`, `ancestro_raiz_id+profundidad` |

### 3.2 Función JavaScript reutilizable

**`src/services/procesarCuestionario.js`** — `procesarRespuestas(entry)`

Normaliza y valida respuestas de cuestionarios antes de insertarlas en MongoDB:

- Valida campos requeridos (`estudiante_id`, `leccion_id`, `preguntas_respuestas`)
- Valida cada respuesta según el tipo de pregunta:
  - `opcion_multiple`: verifica que la respuesta esté entre las opciones válidas
  - `verdadero_falso`: solo acepta `"Verdadero"` o `"Falso"`
  - `respuesta_abierta`: cualquier string es válido (corrección manual)
- Calcula `calificacion` = (correctas / total) × 100
- Calcula `puntaje_total` sumando los puntos de cada respuesta correcta
- Retorna un documento normalizado listo para `insertOne()`

### 3.3 Pipelines de Aggregation (RC-08 a RC-11)

Ejecutar con: `node db/Mongo/pipelines.js`

| Reporte | Colección | Descripción | Técnicas |
|---------|-----------|-------------|----------|
| **RC-08** | `progreso_lecciones` | Lección de mayor abandono por curso | `$unwind`, `$group`, `$addFields` (tasa de abandono), `$sort` + `$group` con `$first` |
| **RC-09** | `progreso_lecciones` | Tiempo promedio para completar lecciones y cursos | `$unwind`, `$match` (solo completadas), `$addFields` (diferencia de fechas), doble `$group` |
| **RC-10** | `cuestionarios_respuestas` | Análisis multidimensional de cuestionarios | **`$facet`** con 3 facetas: (a) calificación promedio general, (b) top 10 estudiantes con más intentos, (c) top 10 preguntas con más errores |
| **RC-11** | `foros` | Análisis de participación en foros por curso | `$match` (hilos raíz), `$lookup` (auto-join con respuestas), `$addFields`, `$group` |

---

## 4. Endpoints de la API

### 4.1 Autenticación

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/auth/registro` | Público | Registro + perfil instructor/estudiante → `{ usuario, token }` |
| POST | `/api/auth/login` | Público | Login → `{ usuario, token }` |
| GET | `/api/auth/yo` | Token | Datos del usuario autenticado |

### 4.2 Recursos CRUD — PostgreSQL

| Ruta base | PK tipo | Auth lectura | Auth escritura |
|-----------|---------|-------------|----------------|
| `/api/usuarios` | UUID | Autenticado | Admin |
| `/api/instructores` | Entero | Autenticado | Admin |
| `/api/estudiantes` | UUID | Autenticado | Admin |
| `/api/categorias` | Entero | Autenticado | Admin |
| `/api/cursos` | UUID | Público | Admin o Instructor |
| `/api/modulos` | UUID | Autenticado | Admin o Instructor |
| `/api/lecciones` | UUID | Autenticado | Admin o Instructor |

Cada recurso expone: `POST /`, `GET /`, `GET /:id`, `PATCH /:id`, `DELETE /:id`.

### 4.3 Recursos CRUD — MongoDB

| Ruta base | Auth lectura | Auth escritura |
|-----------|-------------|----------------|
| `/api/progreso-lecciones` | Autenticado | Admin o Estudiante |
| `/api/resenas` | Autenticado | Admin o Estudiante |
| `/api/foros` | Autenticado | Admin o Estudiante |
| `/api/cuestionarios-respuestas` | Autenticado | Admin o Estudiante |
| `/api/logs-actividad` | Solo Admin | Autenticado (cualquier usuario puede generar eventos) |

> MongoDB usa **Mongoose** para los modelos CRUD expuestos a los controllers
> (`*.model.js`). Las agregaciones, seeds y consultas directas usan el **driver
> nativo** mediante `getDb().collection()` (`src/config/mongo.js`).

### 4.4 Operaciones especiales

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/inscripciones` | Estudiante o Admin | Inscribir → `sp_inscribir_estudiante` (crea pago automático con comisión 30%) |
| POST | `/api/certificados` | Instructor o Admin | Emitir certificado → `sp_emitir_certificado` |
| GET | `/api/cursos/:id/resenas` | Público | Reseñas aprobadas de un curso (MongoDB) |

### 4.5 Reportes

| Método | Ruta | Auth | Objeto BD |
|--------|------|------|-----------|
| GET | `/api/reportes/catalogo` | Público | `vw_catalogo_cursos_publicados` |
| GET | `/api/estudiantes/:id/cursos` | Autenticado | `vw_cursos_estudiante` |
| GET | `/api/estudiantes/:id/cursos/:cid/avance` | Autenticado | `fn_avance_estudiante` |
| GET | `/api/instructores/:id/ingresos?desde=&hasta=` | Autenticado | `fn_ingresos_instructor` |
| GET | `/api/reportes/ingresos-mensuales` | Autenticado | `mv_ingresos_mensuales` |
| GET | `/api/reportes/top-cursos` | Autenticado | `mv_top_cursos_trimestre` |
| GET | `/api/reportes/tasa-finalizacion` | Autenticado | `vw_tasa_finalizacion` |

### 4.6 Códigos de error

| HTTP | Significado |
|------|-------------|
| 400 | Validación fallida (campos requeridos, formato, UUID/Email inválido) |
| 401 | No autenticado, token inválido o expirado |
| 403 | Rol sin permiso para la acción |
| 404 | Recurso no encontrado |
| 409 | Conflicto: duplicado (unique), FK rota, CHECK violation |
| 501 | Objeto de BD no implementado (vista, función o SP pendiente) |
| 500 | Error interno del servidor |

Formato de error: `{ "error": "...", "detalle": "..." }`.

---

## 5. Postman

Importar `postman/EduSphere.postman_collection.json` en Postman.

- Variables preconfiguradas: `{{baseUrl}}`, `{{token}}`, IDs de recursos
- Scripts que guardan automáticamente el token JWT y los IDs creados

Flujo recomendado:
1. **Auth → POST registro** (crea usuario + token, se guarda solo)
2. Crear en orden de dependencias: usuarios → instructores/estudiantes → categorías → cursos → módulos → lecciones
3. Probar inscripciones, certificados y reportes

---

## 6. Arquitectura del proyecto

```
index.js                       Entry point: carga dotenv, conecta Mongo, levanta HTTP
src/
  app.js                       App Express: cors, JSON, rutas, errorHandler, 404 /*splat
  config/
    db.js                      Pool pg + helper query(text, params)
    mongo.js                   Conexión mongoose + getDb() para driver nativo
  models/
    crud.factory.js            Factory CRUD PostgreSQL (INSERT/UPDATE parametrizado)
    *.model.js                 Configuraciones PG (tabla, columnas insertable/updatable, ocultar)
    mongo/
      *.model.js               Schemas Mongoose para controllers CRUD (crearControladorMongo)
      *.js                     Modelos con driver nativo (findByCurso, create, etc.)
      index.js                 Barrel export
  controllers/
    crud.controller.js         Factory controllers PG + asyncWrap
    mongo.crud.controller.js   Factory controllers MongoDB (Mongoose, validación ObjectId)
    auth.controller.js         Registro, login, yo (bcrypt + JWT)
    operaciones.controller.js  Invoca SPs (inscribir, emitir certificado)
    reportes.controller.js     Lectura de vistas/materializadas
    *.controller.js            Controllers por recurso
  routes/
    crud.routes.js             Factory: monta 5 rutas CRUD + middlewares auth
    index.js                   Router raíz que agrupa todo bajo /api
    operaciones.routes.js      POST /inscripciones, POST /certificados
    reportes.routes.js         GET /reportes/*
    auth.routes.js             POST /auth/registro, /auth/login, GET /auth/yo
    *.routes.js                CRUD por recurso
  middlewares/
    auth.js                    autenticar (JWT verify), requiereRol(...roles)
    validar.js                 Validación manual: UUID, email, enteros, ErrorValidacion
    errorHandler.js            Central: SQLSTATE → HTTP, Mongoose → HTTP
  services/
    procesarCuestionario.js    Función JS: normaliza y valida respuestas de cuestionario
db/
  Postgres/
    db-edusphere.sql           Esquema: tipos ENUM, tablas, constraints
    objetos-pendientes.sql     SPs, funciones y vistas referenciadas por la API
  Mongo/
    aplicar_schema.js          Creación de colecciones + índices (Node.js, usa .env)
    pipelines.js               4 aggregation pipelines RC-08 a RC-11 ($facet en RC-10)
    seed_mongo.js              Seed cross-DB: lee UUIDs de PG, inserta en MongoDB
    col-edusphere.js           Script alternativo para mongosh
  seeds/
    seed_data.sql              Datos de prueba PostgreSQL
  objetos-finales.sql          SPs finales con pagos, auditoría, comisiones
  cambios_railway.sql          Cambios desplegados (trigger sync categoria/estado, SP final)
  vistas.sql                   Vistas: catálogo, cursos del estudiante, materializadas
  indices.sql                  Índices de rendimiento PostgreSQL
  queries_performance.sql      Queries con EXPLAIN ANALYZE para benchmarking
docs/
  auth.sql                     Migración: password_hash en usuarios
  migracion-modificado-por-uuid.sql  Migración: modificado_por a UUID
infra/
  docker-compose.yml           Servicios PostgreSQL 16 + MongoDB 6
postman/
  EduSphere.postman_collection.json
```

---

## 7. Notas para desarrollo

- **Express 5**: los rechazos async no se capturan solos. Usar siempre `asyncWrap(fn)` de
  `src/controllers/crud.controller.js`.
- **404 catch-all**: Express 5 requiere `'/*splat'` como comodín, no `'*'`.
- **SQL parametrizado**: toda consulta usa `query(text, params)` de `src/config/db.js`.
  Nunca llamar `pool.query()` directamente.
- **MongoDB dual**: mongoose se usa solo para el ciclo de vida de la conexión y los
  modelos CRUD de los controllers. Aggregations, seeds y el servicio de procesamiento
  usan el driver nativo (`getDb().collection()`). El módulo `mongo.js` exporta
  `{ conectarMongo, getDb, mongoose }`.
- **IDs mixtos**: `usuarios`, `estudiantes`, `cursos`, `modulos`, `lecciones` → UUID;
  `instructores`, `categorias` → entero (smallserial).
- **MongoDB UUIDs**: los UUIDs de PostgreSQL se almacenan como `binData`. Los schemas
  Mongoose usan `mongoose.Types.UUID`. El seed convierte con `uuidToBin()`.
- **`ocultar`**: la config `ocultar` en modelos PG elimina columnas sensibles
  (ej. `password_hash`) de las respuestas al cliente.
- **TTL en logs**: `logs_actividad` tiene índice TTL de 90 días (`expireAfterSeconds:
  7776000`). MongoDB elimina documentos antiguos automáticamente.
- **`JWT_SECRET`**: requerido pero ausente en `.env.example`. Sin él, `/api/auth/*`
  responde 500 con el mensaje `"JWT_SECRET no está definido en el archivo .env"`.

---

## Miembros del equipo

| Nombre | Carné |
|--------|-------|
| Luis Rolando Colop Tzoc | 202308052 |
| Brayan Alexander de Leon Pereira | 202308112 |
| Andres Fernando Gonzalez Alcantara | 202308061 |
