# EduSphere LMS

Plataforma LMS para gestión de cursos en línea, inscripciones, progreso estudiantil,
cuestionarios, foros, certificados y reportes financieros/académicos.

## Stack

| Componente | Tecnología |
|------------|------------|
| Runtime | Node.js ≥ 18 (CommonJS, sin TypeScript) |
| Framework | Express 5 |
| Gestor de paquetes | pnpm 10 |
| BD relacional | PostgreSQL 16 (`pg`, SQL parametrizado, sin ORM) |
| BD documental | MongoDB 6 (`mongoose`) |
| Auth | JWT + bcrypt |
| Infraestructura | Docker Compose (desarrollo local) |

---

## 1. Requisitos previos

- **Node.js** ≥ 18
- **pnpm** (instalar con `npm install -g pnpm`)
- **Docker** y Docker Compose
- **Postman** (opcional, para probar la colección incluida)

---

## 2. Setup desde cero

### 2.1 Clonar el repositorio

```bash
git clone <url-del-repo>
cd edusphere-lms
```

### 2.2 Configurar variables de entorno

```bash
cp .env.example .env
```

Editar `.env` y completar **todas** las variables. Las contraseñas deben ir entre comillas:

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

# JWT (cadena larga y aleatoria)
JWT_SECRET="cambiar-por-cadena-segura-aleatoria"
JWT_EXPIRES=8h

# MongoDB
MONGO_CONTAINER_NAME=edusphere_mongo
MONGO_HOST=localhost
MONGO_INITDB_ROOT_USERNAME=admin
MONGO_INITDB_ROOT_PASSWORD="Admin7816#"
MONGO_INITDB_DATABASE=edusphere
MONGO_PORT=27017
```

> Las contraseñas con `#` u otros caracteres especiales **deben** ir entre comillas. Si no,
> el `#` se interpreta como comentario y la contraseña se trunca.

### 2.3 Levantar bases de datos con Docker

```bash
docker compose --env-file .env -f infra/docker-compose.yml up -d
```

Verificar que ambos contenedores estén corriendo:

```bash
docker ps --filter name=edusphere_
```

### 2.4 Crear la base de datos PostgreSQL (esquema)

Ejecutar los scripts en orden. Cada script es idempotente.

```bash
# Crea tipos ENUM, tablas, constraints y la extensión pgcrypto
docker exec -i edusphere_postgres \
  psql -U admin -d edusphere_db < db/Postgres/db-edusphere.sql

# Migración: agrega password_hash a usuarios (soporte de autenticación)
docker exec -i edusphere_postgres \
  psql -U admin -d edusphere_db < docs/auth.sql

# Migración: convierte modificado_por a UUID (FK auto-referenciada)
docker exec -i edusphere_postgres \
  psql -U admin -d edusphere_db < docs/migracion-modificado-por-uuid.sql
```

### 2.5 Crear objetos de base de datos (SP, funciones, vistas)

```bash
# Stored procedures, funciones y vistas (nombres que espera la API)
docker exec -i edusphere_postgres \
  psql -U admin -d edusphere_db < db/Postgres/objetos-pendientes.sql

# Objetos adicionales y versión final de SPs con auditoría y pagos
docker exec -i edusphere_postgres \
  psql -U admin -d edusphere_db < db/objetos-finales.sql

# Cambios desplegados (trigger sync, SP con pago, comisiones)
docker exec -i edusphere_postgres \
  psql -U admin -d edusphere_db < db/cambios_railway.sql
```

### 2.6 Crear índices de rendimiento (opcional pero recomendado)

```bash
docker exec -i edusphere_postgres \
  psql -U admin -d edusphere_db < db/indices.sql
```

### 2.7 Cargar datos de prueba

```bash
docker exec -i edusphere_postgres \
  psql -U admin -d edusphere_db < db/seeds/seed_data.sql
```

El seed genera:
- **40 usuarios** con roles variados (admin, instructores, estudiantes)
- **7 instructores** con biografía y años de experiencia
- **30 estudiantes** con ocupación, nivel educativo e intereses
- **8 categorías** (Desarrollo Web, Ciencia de Datos, Diseño UX/UI, Marketing, Negocios, Idiomas, Desarrollo Personal, Música)
- **12 cursos** publicados y en borrador con precios y descuentos
- **Módulos y lecciones** por curso (video, lectura, cuestionario, descarga)
- **Inscripciones, pagos y certificados**
- **Liquidaciones de instructores**

### 2.8 Crear colecciones MongoDB

Conectarse a `mongosh` y ejecutar el script de creación de colecciones con validadores `$jsonSchema`:

```bash
docker exec -i edusphere_mongo \
  mongosh -u admin -p "Admin7816#" --authenticationDatabase admin edusphere < db/Mongo/col-edusphere.js
```

Esto crea 5 colecciones con validación de esquema:

| Colección | Descripción |
|-----------|-------------|
| `progreso_lecciones` | Progreso del estudiante por curso: lecciones completadas, porcentaje visto, quiz responses |
| `logs_actividad` | Bitácora de eventos: lección iniciada, video pausado, login, certificado emitido, etc. |
| `resenas` | Reseñas de cursos con 5 dimensiones de calificación (contenido, claridad, dificultad, valor, instructor) |
| `cuestionarios_respuestas` | Respuestas de cuestionarios por intento, con calificación y tiempo |
| `foros` | Hilos y respuestas anidadas (auto-referencia `parent_id`), likes, reportes |

### 2.9 Objetos de MongoDB: funciones y aggregation pipelines

Sobre estas colecciones se implementaron los siguientes objetos de procesamiento:

**Función JavaScript reutilizable** — `normalizarProgreso(doc)`:
- Corre antes de insertar/actualizar documentos en `progreso_lecciones`.
- Calcula `porcentaje_total` a partir de `progreso_lecciones` embebidas.
- Actualiza `fecha_ultima_actividad` y determina `ultima_leccion_vista`.

**4 Pipelines de Aggregation** que responden a consultas del escenario:

| Pipeline | Colección base | Descripción |
|----------|---------------|-------------|
| `resumenCurso` | `progreso_lecciones` | Por `curso_id`: total de inscritos, porcentaje promedio de avance, lección más vista. |
| `panelInstructor` | `resenas` + `progreso_lecciones` | Usa **`$facet`** para devolver en una sola ejecución: (a) distribución de calificaciones, (b) reseñas recientes con comentario, (c) progreso promedio por curso. |
| `rankingEstudiantes` | `cuestionarios_respuestas` | Por `leccion_id`: top 10 estudiantes con mejor calificación, intentos promedio, calificación mediana. |
| `actividadForos` | `foros` | Hilos por curso con conteo de respuestas, likes totales, y porcentaje de hilos resueltos. |

### 2.10 Instalar dependencias e iniciar la API

```bash
pnpm install
pnpm dev        # modo desarrollo con recarga automática (nodemon)
# pnpm start    # modo producción
```

La API queda en `http://localhost:3000/api`.

Verificar el estado:

```bash
curl http://localhost:3000/api/health
# {"ok":true,"db":"up","mongo":"up"}
```

---

## 3. Endpoints

### 3.1 Autenticación

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/auth/registro` | Público | Registro de usuario + perfil instructor/estudiante → `{ usuario, token }` |
| POST | `/api/auth/login` | Público | Login → `{ usuario, token }` |
| GET | `/api/auth/yo` | Token | Datos del usuario autenticado |

### 3.2 Recursos CRUD (PostgreSQL)

| Ruta base | Auth lectura | Auth escritura |
|-----------|-------------|----------------|
| `/api/usuarios` | Autenticado | Admin |
| `/api/instructores` | Autenticado | Admin |
| `/api/estudiantes` | Autenticado | Admin |
| `/api/categorias` | Autenticado | Admin |
| `/api/cursos` | Público | Admin o Instructor |
| `/api/modulos` | Autenticado | Admin o Instructor |
| `/api/lecciones` | Autenticado | Admin o Instructor |

Cada uno expone: `POST /`, `GET /`, `GET /:id`, `PATCH /:id`, `DELETE /:id`.

### 3.3 Recursos CRUD (MongoDB)

| Ruta base | Auth lectura | Auth escritura |
|-----------|-------------|----------------|
| `/api/progreso-lecciones` | Autenticado | Admin o Estudiante |
| `/api/resenas` | Autenticado | Admin o Estudiante |
| `/api/foros` | Autenticado | Admin o Estudiante |
| `/api/cuestionarios-respuestas` | Autenticado | Admin o Estudiante |
| `/api/logs-actividad` | Admin | Autenticado |

### 3.4 Operaciones especiales

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/inscripciones` | Estudiante o Admin | Inscribir estudiante a curso via `sp_inscribir_estudiante` |
| POST | `/api/certificados` | Instructor o Admin | Emitir certificado via `sp_emitir_certificado` |
| GET | `/api/cursos/:id/resenas` | Público | Reseñas aprobadas de un curso (MongoDB) |

### 3.5 Reportes

| Método | Ruta | Auth | Descripción | Objeto BD |
|--------|------|------|-------------|-----------|
| GET | `/api/reportes/catalogo` | Público | Catálogo de cursos publicados | `vw_catalogo_cursos_publicados` |
| GET | `/api/estudiantes/:id/cursos` | Autenticado | Cursos del estudiante | `vw_cursos_estudiante` |
| GET | `/api/estudiantes/:id/cursos/:cid/avance` | Autenticado | Avance del estudiante en un curso | `fn_avance_estudiante` |
| GET | `/api/instructores/:id/ingresos?desde=&hasta=` | Autenticado | Ingresos del instructor | `fn_ingresos_instructor` |
| GET | `/api/reportes/ingresos-mensuales` | Autenticado | Ingresos mensuales por categoría | `mv_ingresos_mensuales` |
| GET | `/api/reportes/top-cursos` | Autenticado | Top cursos del trimestre | `mv_top_cursos_trimestre` |
| GET | `/api/reportes/tasa-finalizacion` | Autenticado | Tasa de finalización por curso | `vw_tasa_finalizacion` |

### 3.6 Códigos de error

| HTTP | Significado |
|------|-------------|
| 400 | Validación fallida (campos requeridos, formato inválido) |
| 401 | No autenticado / token inválido o expirado |
| 403 | Rol sin permiso para la acción |
| 404 | Recurso no encontrado |
| 409 | Conflicto: duplicado, FK rota, restricción CHECK |
| 501 | Objeto de BD aún no implementado |
| 500 | Error interno del servidor |

Todas las respuestas de error siguen el formato: `{ "error": "...", "detalle": "..." }`.

---

## 4. Postman

Importar `postman/EduSphere.postman_collection.json` en Postman.

La colección incluye:
- Variables preconfiguradas (`{{baseUrl}}`, `{{token}}`)
- Scripts de test que guardan automáticamente el token JWT y los IDs creados
- Requests organizados por recurso

Flujo recomendado:
1. Ejecutar **Auth → POST registro** (crea usuario + token)
2. Crear datos en orden (FKs): usuarios → instructores/estudiantes → categorías → cursos → módulos → lecciones
3. Probar inscripciones, certificados y reportes

---

## 5. Arquitectura del proyecto

```
index.js                 Entry point: carga dotenv, conecta Mongo, levanta servidor HTTP
src/
  app.js                 App Express (cors, JSON, rutas, errorHandler)
  config/
    db.js                Pool de pg + helper query(text, params)
    mongo.js             Conexión mongoose
  models/
    crud.factory.js      Factory CRUD para PostgreSQL
    *.model.js           Configuraciones de cada tabla
    mongo/               Schemas mongoose de las 5 colecciones
  controllers/
    crud.controller.js   Factory de controllers PG (+ asyncWrap)
    mongo.crud.controller.js  Factory de controllers MongoDB
    *.controller.js      Controllers por recurso (usan la factory que corresponde)
  routes/
    crud.routes.js       Factory que monta 5 rutas CRUD + middlewares de auth
    index.js             Router raíz que agrupa todo bajo /api
    *.routes.js          Definiciones de rutas por recurso
  middlewares/
    auth.js              autenticar (JWT) y requiereRol
    validar.js           Validación manual: UUID, email, enteros, ErrorValidacion
    errorHandler.js      Central de errores: SQLSTATE → HTTP, Mongoose → HTTP
db/
  Postgres/              Esquema SQL y objetos pendientes
  Mongo/                 Creación de colecciones con validadores $jsonSchema
  seeds/                 Datos de prueba
docs/                    Migraciones idempotentes
infra/                   Docker Compose
postman/                 Colección Postman
```

---

## 6. Notas para desarrollo

- **Express 5**: las excepciones en handlers async no se capturan solas. Usar siempre `asyncWrap(fn)` de `src/controllers/crud.controller.js`.
- **404 catch-all**: Express 5 requiere `'/*splat'` como comodín, no `'*'`.
- **SQL siempre parametrizado**: toda consulta usa `query(text, params)` de `src/config/db.js`. Nunca llamar `pool.query()` directamente.
- **IDs mixtos**: `usuarios`, `estudiantes`, `cursos`, `modulos`, `lecciones` usan UUID; `instructores`, `categorias` usan entero (smallserial).
- **MongoDB**: los UUIDs de PostgreSQL se almacenan como `binData` en MongoDB. Los schemas usan `mongoose.Types.UUID`.
- **ocultar**: la config `ocultar` en los modelos PG elimina columnas sensibles (ej. `password_hash`) de las respuestas.

---

## Miembros del equipo

| Nombre | Carné |
|--------|-------|
| Luis Rolando Colop Tzoc | 202308052 |
| Brayan Alexander de Leon Pereira | 202308112 |
| Andres Fernando Gonzalez Alcantara | 202308061 |
