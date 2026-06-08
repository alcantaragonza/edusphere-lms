# Plan de Trabajo Gradual — EduSphere LMS

> Basado en el enunciado del Proyecto Final de Bases de Datos.
> Principio rector: cada fase debe permitir medir el impacto de los cambios (antes/despues) para el reporte de performance (seccion 5.5).

---

## Requisitos minimos del enunciado

### Objetos PostgreSQL (seccion 5.2)

| Tipo | Minimo | Estado actual |
|------|--------|---------------|
| Vistas normales | 2 | 0 de 2 |
| Vistas materializadas | 2 (con estrategia de refresh) | 0 de 2 |
| Funciones (escalar + TABLE) | 3 (min 1 escalar, min 1 TABLE) | 0 de 3 |
| Stored Procedures | 2 (con BEGIN/EXCEPTION/ROLLBACK) | 0 de 2 |
| Indices justificados con EXPLAIN ANALYZE | Todos | 27 creados pero sin justificar |

### Objetos MongoDB (seccion 5.3)

| Tipo | Minimo | Estado actual |
|------|--------|---------------|
| Funcion JS de procesamiento | 1 | 0 de 1 |
| Pipelines de aggregation | 4 (min 1 con `$facet`) | 0 de 4 |

### Datos de prueba (seccion 6)

| Entidad | Minimo |
|---------|--------|
| Categorias | 8 |
| Instructores | 15 |
| Estudiantes | 200 |
| Cursos publicados | 25 |
| Modulos por curso | 8-12 (promedio) |
| Lecciones totales | 1000+ |
| Inscripciones | 600 (12 meses) |
| Progreso lecciones (MongoDB) | 15000+ |
| Intentos cuestionarios (MongoDB) | 800+ |
| Publicaciones foro | 300 |
| Resenas (MongoDB) | 200 |
| Certificados | 150 |

### Reportes requeridos (RC-01 a RC-11)

| RC | Descripcion | Motor sugerido | Mecanismo |
|----|-------------|----------------|-----------|
| RC-01 | Catalogo de cursos publicados | PostgreSQL | Vista normal |
| RC-02 | Cursos del estudiante con avance | PostgreSQL | Vista normal |
| RC-03 | Calculo de avance (%) | PostgreSQL | Funcion TABLE |
| RC-04 | Ingresos por instructor | PostgreSQL | Funcion TABLE o consulta |
| RC-05 | Reporte mensual de ingresos | PostgreSQL | Vista materializada |
| RC-06 | Top 10 cursos mas vendidos | PostgreSQL | Vista materializada |
| RC-07 | Tasa de finalizacion por curso | Ambos | Combinado |
| RC-08 | Leccion de mayor abandono | MongoDB | Pipeline aggregation |
| RC-09 | Tiempo promedio para completar | MongoDB | Pipeline aggregation |
| RC-10 | Analisis de cuestionarios | MongoDB | Pipeline con `$facet` |
| RC-11 | Analisis del foro | MongoDB | Pipeline aggregation |

### Operaciones criticas (OC-01, OC-02)

| OC | Descripcion | Implementacion |
|----|-------------|----------------|
| OC-01 | Inscripcion de estudiante | Stored Procedure con transaccion |
| OC-02 | Emision de certificado | Stored Procedure con transaccion |

### API minima (seccion 5.4)

- 1 endpoint POST por cada operacion critica
- 1 endpoint GET por cada reporte gerencial
- 1 endpoint para insercion en MongoDB usando la funcion JS

### Documentacion (seccion 5.7)

- README tecnico
- Documento de decisiones de diseno (2-3 pp)
- Reporte de performance (3-5 pp) con EXPLAIN ANALYZE antes/despues
- Estrategia de respaldo (pg_dump + WAL + politica de retencion)
- Bitacora de uso de IA

---

## Fases de trabajo propuestas

Cada fase esta disenada para producir resultados medibles que alimenten el reporte de performance.

---

### Fase 1: Separar DDL de indices + primera medicion

**Objetivo**: Tener una linea base de rendimiento sin indices para el reporte.

**Tareas**:
1. Crear `db/estructura_db_sin_indices.sql` a partir de `estructura_db.sql`, quitando los 27 `CREATE INDEX`.
2. Aplicar la version sin indices en PostgreSQL limpio.
3. Cargar seed data.
4. Ejecutar 2-3 queries representativos con `EXPLAIN ANALYZE` y guardar los planes de ejecucion + tiempos.
5. Aplicar los 27 indices.
6. Re-ejecutar los mismos queries con `EXPLAIN ANALYZE` y comparar.

**Entregable para el reporte**: comparacion visual antes/despues de indices (seccion 5.5).

---

### Fase 2: Seed data PostgreSQL (`seed_data.sql`)

**Objetivo**: Cargar los volumenes minimos para que reportes y consultas tengan sentido.

**Volumenes**:

| Entidad | Cantidad |
|---------|----------|
| `categorias` | 8 |
| `usuarios` (instructores + estudiantes + admin) | ~216 |
| `instructores` | 15 |
| `estudiantes` | 200 |
| `cursos` | 50 (25 publicados, resto en borrador/archivado) |
| `modulos` | 8-12 por curso → ~500 |
| `lecciones` | variedad de tipos (video, lectura, cuestionario) → 1000+ |
| `inscripciones` | 600 en 12 meses |
| `pagos` | 1 por inscripcion → 600 |
| `certificados` | 150 |
| `liquidaciones_instructor` | 12 (1 por mes) con detalles |
| `carrito_compras` | ~50 activos |
| `tipos_operacion_auditoria` | catalogo base |
| `log_auditoria` | registros de operaciones criticas |

**Tooling**: `@faker-js/faker` para generacion de datos coherentes, ejecutado como script Node.js que genera inserts SQL o directamente via `pg`.

---

### Fase 3: Vistas normales

**Objetivo**: Implementar RC-01 y RC-02, medir rendimiento sin y con indices.

**Tareas**:
1. Crear `v_catalogo_cursos` → RC-01 (JOIN cursos + instructores + categorias + resenas agregadas desde MongoDB via funcion).
2. Crear `v_cursos_estudiante` → RC-02 (JOIN inscripciones + cursos + progreso_lecciones desde MongoDB).
3. Medir `EXPLAIN ANALYZE` de las vistas con y sin los indices de la Fase 1.

**Nota**: Las vistas normales se ejecutan cada vez que se consultan. Si una vista es lenta y se consulta frecuentemente, se justifica una vista materializada — esto es material para el documento de decisiones.

---

### Fase 4: Vistas materializadas

**Objetivo**: Implementar RC-05 y RC-06 con estrategia de refresh documentada.

**Tareas**:
1. Crear `vm_ingresos_mensuales` → RC-05 (agrupa por mes y categoria).
2. Crear `vm_top_cursos_vendidos` → RC-06 (top 10 trimestral).
3. Medir `EXPLAIN ANALYZE` comparando vista normal equivalente vs vista materializada.
4. Documentar estrategia de refresh: frecuencia sugerida (diaria/semanal), horario de baja carga, costo estimado del `REFRESH MATERIALIZED VIEW`.

**Entregable para el reporte**: comparacion vista normal vs materializada, justificacion de refresh.

---

### Fase 5: Funciones PostgreSQL

**Objetivo**: Implementar 3 funciones (min 1 escalar, min 1 TABLE).

**Tareas**:
1. `calcular_comision(monto NUMERIC, tasa NUMERIC) RETURNS NUMERIC` — funcion escalar reutilizable en SPs.
2. `fn_avance_estudiante(p_estudiante_id UUID, p_curso_id UUID) RETURNS TABLE(...)` — consulta `progreso_lecciones` en MongoDB + `lecciones` en PostgreSQL → RC-03.
3. Tercera funcion: `fn_ingresos_instructor(p_instructor_id UUID, p_desde DATE, p_hasta DATE) RETURNS TABLE(...)` → RC-04.

Cada funcion debe medirse con `EXPLAIN ANALYZE`.

---

### Fase 6: Stored Procedures (operaciones criticas)

**Objetivo**: Implementar OC-01 y OC-02 con transacciones atomicas.

**Tareas**:
1. `sp_inscribir_estudiante(...)` — OC-01:
   - Validar estudiante existe y curso esta 'publicado' (RN-02)
   - Validar no duplicado (RN-01)
   - Registrar pago (monto snapshot del precio vigente, RN-03)
   - Calcular comision (usa `calcular_comision`, RN-04)
   - Crear inscripcion
   - Registrar en `log_auditoria`
   - `BEGIN/EXCEPTION/ROLLBACK`

2. `sp_emitir_certificado(...)` — OC-02:
   - Validar inscripcion existe
   - Verificar 100% avance (RN-06, consulta MongoDB)
   - Verificar no duplicado
   - Generar codigo unico (`gen_random_uuid()` o hash)
   - Insertar certificado
   - Registrar en `log_auditoria`
   - `BEGIN/EXCEPTION/ROLLBACK`

---

### Fase 7: MongoDB — seed data + pipelines

**Objetivo**: Cargar volumenes minimos en MongoDB e implementar los 4 pipelines.

**Colecciones existentes** (ya creadas en `mongodb_estructura.js`):

| Coleccion | Datos minimos |
|-----------|---------------|
| `progreso_lecciones` | 15000+ registros de progreso individual |
| `logs_actividad` | Miles de eventos (TTL 90 dias) |
| `resenas` | 200 resenas |

**Colecciones adicionales necesarias** (no existen aun):

| Coleccion | Proposito | RF |
|-----------|-----------|-----|
| `cuestionarios_respuestas` | Intentos y respuestas de cuestionarios | RF-08 |
| `foros` | Publicaciones y respuestas anidadas | RF-09 |

**Pipelines requeridos**:

1. **RC-08 — Leccion de mayor abandono por curso**:
   ```javascript
   db.progreso_lecciones.aggregate([
     { $match: { curso_id: UUID("...") } },
     { $unwind: "$progreso_lecciones" },
     { $group: {
         _id: "$progreso_lecciones.leccion_id",
         total_estudiantes: { $sum: 1 },
         completaron: { $sum: { $cond: ["$progreso_lecciones.completada", 1, 0] } }
     }},
     { $addFields: {
         tasa_abandono: { $subtract: [1, { $divide: ["$completaron", "$total_estudiantes"] }] }
     }},
     { $sort: { tasa_abandono: -1 } },
     { $limit: 1 }
   ])
   ```

2. **RC-10 — Analisis de cuestionarios (usa `$facet`)**:
   ```javascript
   db.cuestionarios_respuestas.aggregate([
     { $match: { cuestionario_id: UUID("...") } },
     { $facet: {
         calificacion_promedio: [
           { $group: { _id: null, promedio: { $avg: "$calificacion" } } }
         ],
         intentos_por_estudiante: [
           { $group: { _id: "$estudiante_id", intentos: { $sum: 1 } } }
         ],
         preguntas_mayor_error: [
           { $unwind: "$respuestas" },
           { $match: { "respuestas.correcta": false } },
           { $group: { _id: "$respuestas.pregunta", errores: { $sum: 1 } } },
           { $sort: { errores: -1 } },
           { $limit: 5 }
         ]
     }}
   ])
   ```

3. **RC-09 — Tiempo promedio para completar curso**.
4. **RC-11 — Analisis del foro**.

**Funcion JS de procesamiento**: para normalizar respuestas de cuestionarios antes de insertar (validar estructura variable segun tipo de pregunta).

---

### Fase 8: API REST (Node.js + Express)

**Objetivo**: Exponer endpoints que demuestren el funcionamiento de los objetos de BD.

**Endpoints minimos**:

| Metodo | Ruta | Invoca | Proposito |
|--------|------|--------|-----------|
| `POST` | `/api/inscripciones` | `sp_inscribir_estudiante` | OC-01 |
| `POST` | `/api/certificados` | `sp_emitir_certificado` | OC-02 |
| `GET` | `/api/reportes/ingresos-mensuales` | `vm_ingresos_mensuales` | RC-05 |
| `GET` | `/api/reportes/top-cursos` | `vm_top_cursos_vendidos` | RC-06 |
| `POST` | `/api/cuestionarios/respuestas` | Funcion JS MongoDB | Insercion con procesamiento |
| `GET` | `/api/cursos/catalogo` | `v_catalogo_cursos` | RC-01 |
| `GET` | `/api/estudiantes/:id/cursos` | `v_cursos_estudiante` | RC-02 |
| `GET` | `/api/estudiantes/:id/avance/:cursoId` | `fn_avance_estudiante` | RC-03 |

**Stack**: `express`, `pg` (NO ORM), `mongoose`, `cors`, `dotenv`.

---

### Fase 9: Estrategia de respaldo

**Objetivo**: Scripts de backup + politica de retencion + demostracion de restore.

**Tareas**:
1. Script `pg_dump` para backup full.
2. Configurar WAL archiving para backups incrementales.
3. Documentar retencion (ej: full semanal + WAL diario, retener 4 semanas).
4. Script de restore + validacion de integridad (row counts, checksums).

---

### Fase 10: Documentacion final

**Entregables**:
1. Diagrama ER (PostgreSQL).
2. Diagrama de colecciones MongoDB (estructura de documentos, embebidos, referencias).
3. Documento de decisiones de diseno (2-3 pp):
   - Que va a PostgreSQL vs MongoDB y por que.
   - Reglas de negocio implementadas a nivel schema vs procedure.
   - Justificacion de denormalizaciones.
4. Reporte de performance (3-5 pp):
   - EXPLAIN ANALYZE antes/despues de indices (2 queries).
   - EXPLAIN ANALYZE vista normal vs materializada.
   - Justificacion de cada indice.
   - Estrategia de refresh de vistas materializadas.
5. README tecnico.
6. Bitacora de uso de IA.

---

## Orden recomendado de ejecucion

```
Fase 1 (DDL sin indices + medicion)
  └─> Fase 2 (seed data PostgreSQL)
        ├─> Fase 3 (vistas normales + medicion)
        ├─> Fase 4 (vistas materializadas + medicion)
        ├─> Fase 5 (funciones)
        ├─> Fase 6 (stored procedures)
        └─> Fase 7 (MongoDB: nuevas colecciones + seed + pipelines)
              └─> Fase 8 (API)
                    └─> Fase 9 (backup)
                          └─> Fase 10 (documentacion final)
```

Las Fases 3 a 7 pueden solaparse parcialmente una vez que los seed data esten listos.

---

## Notas importantes del enunciado

- **Prohibido ORMs**: Solo `pg` (node-postgres) para PostgreSQL. Nada de Prisma, Sequelize, TypeORM. Mongoose si esta permitido para MongoDB.
- **Defensa oral individual y aleatoria**: Ambos integrantes deben dominar todo el sistema.
- **IA permitida para capa de aplicacion, NO para objetos de BD**: Vistas, funciones, SPs y pipelines deben ser escritos por el equipo.
- **La capacidad de modelar datos es lo mas importante que se evalua**.
