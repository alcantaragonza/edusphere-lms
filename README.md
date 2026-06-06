# edusphere-lms
Plataforma LMS para gestión de cursos en línea, inscripciones, progreso estudiantil, cuestionarios, foros, certificados y reportes financieros/académicos. Diseñada para administrar contenido educativo digital con escalabilidad, auditoría, análisis de aprendizaje y seguimiento detallado del estudiante.

---

## Backend API (Express 5 + PostgreSQL)

Capa de aplicación en Node.js (CommonJS) con arquitectura **MVC**. Toda consulta SQL va
**parametrizada** (`$1, $2, ...`). Los objetos de base de datos (vistas, funciones y
stored procedures) los implementa el equipo de BD; esta capa solo los **invoca**.

### Stack
- Node.js >= 18 · Express 5 · `pg` (node-postgres) · `dotenv` · `cors`
- Gestor de paquetes: **pnpm** (`pnpm@10.33.4`)
- Solo PostgreSQL por ahora (Mongo queda fuera del alcance del backend).

### Estructura
```
index.js                 entry point: carga dotenv y levanta el server
src/
  app.js                 app express (cors, json, rutas, errorHandler)
  config/db.js           Pool de pg reutilizable (lee de .env)
  models/                SQL (acceso a datos) + factory CRUD
  controllers/           reciben req/res, llaman al modelo, devuelven JSON
  routes/                routers de express
  middlewares/           errorHandler central + validación manual
postman/                 colección de Postman
```

### 1. Levantar el backend desde cero

**Requisitos:** Node.js >= 18, pnpm y Docker (para PostgreSQL vía `infra/docker-compose.yml`).

```bash
# 1) Clonar y entrar al repo
git clone <url-del-repo>
cd edusphere-lms

# 2) Configurar variables de entorno
cp .env.example .env
#    Edita .env y completa, como mínimo:
#      POSTGRES_HOST=localhost
#      POSTGRES_USER=admin
#      POSTGRES_PASSWORD="<tu_password>"   # SIEMPRE entre comillas: protege #, espacios, $, etc.
#      POSTGRES_DB=edusphere_db
#      POSTGRES_PORT=5433          # puerto del host (mapea al 5432 del contenedor)
#      PORT=3000                   # puerto donde escucha la API
#    Nota: db.js lee las variables POSTGRES_* (compartidas con docker-compose).

# 3) Levantar PostgreSQL con Docker
#    Importante: --env-file .env porque el compose vive en infra/ y, sin esa bandera,
#    Compose buscaría el .env dentro de infra/ (no en la raíz) y las variables saldrían vacías.
docker compose --env-file .env -f infra/docker-compose.yml up -d postgres

# 4) Cargar TU esquema SQL en la base (tablas, vistas, funciones y SP).
#    Ajusta la ruta a tu archivo .sql (p. ej. el de la rama feature/db):
docker exec -i edusphere_postgres \
  psql -U admin -d edusphere_db < db/Postgres/db-edusphere.sql

# 5) Instalar dependencias (las ya declaradas; NO instala nada nuevo)
pnpm install

# 6) Levantar la API en modo desarrollo (recarga con nodemon)
pnpm run dev
#    o en modo producción:
pnpm start
```

La API queda en `http://localhost:3000/api`. Verifica con:

```bash
curl http://localhost:3000/api/health
# -> {"ok":true,"db":"up"}
```

> **Si `/api/health` devuelve `password authentication failed`:** casi siempre es la
> contraseña SIN comillas en `.env`. El `#` (y todo lo que le sigue) se interpreta como
> comentario, así que `POSTGRES_PASSWORD=Admin7816#` carga como `Admin7816`. Solución:
> ponla entre comillas → `POSTGRES_PASSWORD="Admin7816#"`. Reinicia la API y listo.
> Solo si la contraseña del volumen ya inicializado fuese realmente distinta tendrías que
> recrearlo con `docker compose --env-file .env -f infra/docker-compose.yml down -v` (**borra los datos**).

### 2. Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/health` | Healthcheck (`SELECT 1`) |
| CRUD | `/api/usuarios` `/instructores` `/estudiantes` `/categorias` `/cursos` `/modulos` `/lecciones` | POST, GET lista, GET `/:id`, PATCH `/:id`, DELETE `/:id` |
| POST | `/api/inscripciones` | OC-01 → `CALL sp_inscribir_estudiante` |
| POST | `/api/certificados` | OC-02 → `CALL sp_emitir_certificado` |
| GET | `/api/reportes/catalogo` | RC-01 → `vw_catalogo_cursos_publicados` |
| GET | `/api/estudiantes/:id/cursos` | RC-02 → `vw_cursos_estudiante` |
| GET | `/api/estudiantes/:id/cursos/:cursoId/avance` | RC-03 → `fn_avance_estudiante` |
| GET | `/api/instructores/:id/ingresos?desde=&hasta=` | RC-04 → `fn_ingresos_instructor` |
| GET | `/api/reportes/ingresos-mensuales` | RC-05 → `mv_ingresos_mensuales` |
| GET | `/api/reportes/top-cursos` | RC-06 → `mv_top_cursos_trimestre` |
| GET | `/api/reportes/tasa-finalizacion` | RC-07 → `vw_tasa_finalizacion` |

Códigos de error: **400** validación · **404** no encontrado · **409** conflicto (duplicado/FK) ·
**501** objeto de BD aún no creado · **500** interno. Respuestas siempre en JSON `{ error, detalle }`.

### 3. Importar la colección de Postman

1. Abre **Postman → Import**.
2. Selecciona `postman/EduSphere.postman_collection.json`.
3. La colección trae la variable `{{baseUrl}}` = `http://localhost:3000/api` y variables de
   id (`{{usuarioId}}`, `{{cursoId}}`, etc.). Ajusta `baseUrl` en **Variables** de la colección
   si usas otro puerto, y rellena las variables de id con los valores que devuelven los `POST`.
4. Empieza por **Salud → GET Health**, luego crea datos con los `POST` del CRUD y prueba
   operaciones/reportes.
