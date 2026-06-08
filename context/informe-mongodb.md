# Informe — Capa MongoDB en EduSphere LMS

**Sesion:** 2026-06-08 | **Rama:** `feature/api` | **Destino:** Railway MongoDB

---

## 1. Diagnostico inicial

El backend (`feature/api`) tenia mongoose como dependencia fantasma:
- `mongoose@9.6.2` en `package.json` ✅
- Contenedor MongoDB 6 en `infra/docker-compose.yml` ✅
- Variables de entorno MongoDB en `.env.example` ✅
- **Conexion MongoDB en `src/config/db.js`:** ❌ Inexistente (solo PostgreSQL)
- **Modelos Mongoose:** ❌ 0 de 5
- **Rutas/controladores MongoDB:** ❌ 0

El 100% de la API consumia exclusivamente PostgreSQL.

## 2. Colecciones verificadas en Railway

Las 5 colecciones YA existian en Railway MongoDB (aplicadas previamente
desde `db/Mongo/col-edusphere.js`). Solo se verifico su existencia y
se crearon los indices que faltaban.

| # | Coleccion | Indices |
|---|-----------|---------|
| 1 | `progreso_lecciones` | `inscripcion_id` (unique), `estudiante_id`, `curso_id` |
| 2 | `logs_actividad` | `usuario_id+timestamp`, `tipo_evento+timestamp`, `metadata.curso_id` (sparse), TTL 90 dias |
| 3 | `resenas` | `inscripcion_id` (unique), `curso_id+fecha_resena`, `instructor_id`, `aprobada+fecha_resena` |
| 4 | `cuestionarios_respuestas` | `estudiante_id+leccion_id+intento_numero`, `leccion_id+fecha_intento` |
| 5 | `foros` | `curso_id+fecha_creacion`, `estudiante_id`, `ancestro_raiz_id+profundidad` |

## 3. Archivos creados

### 3.1 `src/config/mongo.js` — Modulo de conexion

**Decisiones:**
- **mongoose vs driver nativo:** Mongoose proporciona schemas tipados con
  validacion integrada, middleware (pre/post hooks) y `populate()`. El
  enunciado PROHIBE ORMs para PostgreSQL pero PERMITE explicitamente
  mongoose para MongoDB (seccion 5.4, plan_trabajo.md:339).
- **`authSource=admin`:** Railway MongoDB configura la autenticacion en
  la BD `admin`. Sin este parametro, mongoose intenta autenticar contra
  la BD de aplicacion (`edusphere`) y falla con "Authentication failed".
  Este fue el error inicial al probar la conexion.
- **Variable `MONGO_URI`:** Se usa `process.env.MONGO_URI` (o `MONGO_URL`)
  para no hardcodear la connection string. Si no esta definida, el modulo
  emite un warning pero no detiene la aplicacion (MongoDB es opcional
  para el arranque, PostgreSQL es obligatorio).
- **`serverSelectionTimeoutMS: 10000`:** 10 segundos de timeout para
  detectar fallos de conexion sin bloquear el startup indefinidamente.

### 3.2 `src/models/mongo/` — 5 modelos Mongoose

**Por que un modelo por archivo (mismo patron que PostgreSQL):**
Mantiene la consistencia con `src/models/*.model.js`. Cada archivo
exporta un modelo mongoose con su schema y el nombre exacto de la
coleccion en MongoDB.

| Archivo | Coleccion | Schema destaca por... |
|---------|-----------|-----------------------|
| `ProgresoLeccion.js` | `progreso_lecciones` | Array embebido `progreso_lecciones` (patron one-to-few, max 100 lecciones) |
| `LogActividad.js` | `logs_actividad` | `tipo_evento` con enum cerrado (13 eventos), metadata opcional |
| `Resena.js` | `resenas` | 5 calificaciones independientes (contenido, claridad, dificultad, valor, instructor) |
| `CuestionarioRespuesta.js` | `cuestionarios_respuestas` | Array de `preguntas_respuestas` con flag `correcta` por pregunta |
| `Foro.js` | `foros` | Estructura jerarquica: `parent_id` (null=raiz), `ancestro_raiz_id`, `profundidad` |

**Decision sobre `Buffer` para UUIDs:**
MongoDB no tiene tipo UUID nativo (antes de MongoDB 4.0+). El validador
JSON Schema en `col-edusphere.js` usa `bsonType: "binData"` (Binary data).
En mongoose, `mongoose.Schema.Types.Buffer` mapea a `BinData`. Esto
permite almacenar UUIDs de PostgreSQL como bytes (16 bytes) en vez de
strings (36 caracteres), ahorrando espacio y manteniendo compatibilidad
con el helper `UUID()` de `mongosh`.

**Decision sobre `_id`:**
No se define `_id` en ningun schema. MongoDB genera automaticamente un
ObjectId. Las referencias a PostgreSQL usan campos explicitos con
`Buffer` (ej. `inscripcion_id`, `curso_id`). Esto mantiene la
independencia entre los IDs de MongoDB y los UUIDs de PostgreSQL.

### 3.3 `index.js` — Conexion en startup

Se agrego `conectarMongo()` en el arranque del servidor, inmediatamente
despues de cargar dotenv y antes de `app.listen()`. La conexion es
asincrona y no bloquea el inicio del servidor HTTP. Si MongoDB no esta
disponible, la API de PostgreSQL sigue funcionando.

### 3.4 `db/Mongo/aplicar_schema.js` — Script de verificacion

Script Node.js que:
1. Se conecta a Railway MongoDB
2. Verifica que las 5 colecciones existan
3. Crea las que falten (con validadores JSON Schema)
4. Crea los indices necesarios
5. Lista las colecciones resultantes

**Por que un script Node.js y no `mongosh`:**
`mongosh` no esta disponible en el entorno de Railway. Un script Node.js
con mongoose puede ejecutarse desde cualquier maquina con Node.

## 4. Lo que NO se hizo (pendiente para siguiente fase)

- **Seed data MongoDB:** 15000+ progreso_lecciones, 200 resenas,
  800+ cuestionarios, 300 foros, miles de logs_actividad
- **Pipelines aggregation RC-08 a RC-11**
- **Funcion JS de procesamiento de cuestionarios**
- **Endpoints API:** `POST /cuestionarios/respuestas`, `GET /resenas`, etc.
- **`.env` en Railway:** Agregar `MONGO_URI` al archivo `.env` del
  despliegue de Railway para que el backend se conecte a MongoDB

## 5. Para defensa oral — preguntas frecuentes

**¿Por que mongoose si el enunciado prohibe ORMs?**
El enunciado dice: "Prohibido ORMs: Solo pg (node-postgres) para
PostgreSQL. Nada de Prisma, Sequelize, TypeORM. Mongoose si esta
permitido para MongoDB." (plan_trabajo.md:339). Mongoose es un ODM
(Object Document Mapper), no un ORM. Esta disenado especificamente
para MongoDB y su modelo de documentos.

**¿Por que Buffer y no String para los UUIDs?**
Los UUIDs de PostgreSQL se generan con `gen_random_uuid()` y se
almacenan como 16 bytes. MongoDB puede almacenarlos como `BinData`
(tambien 16 bytes) en vez de strings de 36 caracteres. Esto ahorra
~20 bytes por referencia. Multiplicado por 15000+ documentos de
progreso con 3 UUIDs cada uno, el ahorro es significativo.

**¿Por que el array embebido en progreso_lecciones?**
Un curso tiene maximo ~100 lecciones. Acceder al progreso de un
estudiante SIEMPRE requiere leer todas las lecciones del curso.
El patron "one-to-few" con array embebido evita JOINs (lookups)
y reduce la latencia. Si un curso tuviera >1000 lecciones, se
usaria una coleccion separada (patron "one-to-many").

**¿Por que denormalizar curso_id y estudiante_id en progreso?**
Para consultas como "todos los estudiantes de este curso" o
"todos los cursos de este estudiante" sin necesidad de hacer
lookup a PostgreSQL. Los UUIDs son inmutables: una vez creada
la inscripcion, `curso_id` y `estudiante_id` nunca cambian.
Denormalizar datos inmutables no tiene riesgo de inconsistencia.
