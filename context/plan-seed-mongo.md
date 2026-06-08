# Plan — Seed Data MongoDB

**Sesion:** 2026-06-08 | **Rama:** `feature/api`
**Objetivo:** Poblar las 5 colecciones MongoDB con datos coherentes
vinculados a los UUIDs reales de PostgreSQL en Railway.

---

## Estrategia general

El script `db/Mongo/seed_mongo.js` se conecta a:
- **PostgreSQL** (Railway): lee UUIDs reales de inscripciones, estudiantes,
  cursos, modulos, lecciones y preguntas.
- **MongoDB** (Railway): inserta documentos con esos UUIDs para que las
  consultas combinadas PostgreSQL + MongoDB sean coherentes.

**Por que usar UUIDs reales:** Si inventaramos UUIDs, las queries de
agregacion (RC-08 a RC-11) no matcherian con ningun dato real. Con
UUIDs reales, un `$match: { curso_id: UUID("...") }` encuentra los
mismos cursos que existen en PostgreSQL.

## Colecciones y volumenes

| Coleccion | Minimo enunciado | Realista con datos de Railway | Accion |
|-----------|-----------------|-------------------------------|--------|
| `progreso_lecciones` | 15000+ entries | ~15300 (696 insc × ~22 lecc) | OK |
| `resenas` | 200 | 130 completadas actualmente | Subir 70+ inscripciones a 'completado' |
| `logs_actividad` | miles | ~5000+ eventos | OK |
| `cuestionarios_respuestas` | 800+ | 800 intentos | OK |
| `foros` | 300 | 100 hilos + 200 respuestas | OK |

---

## 1. `progreso_lecciones` — 696 documentos

**Fuente PostgreSQL:** `inscripciones`, `lecciones`, `modulos`, `cursos`

**Logica por cada inscripcion:**
1. Obtener todas las lecciones del curso:
   ```
   SELECT l.id, l.titulo, l.tipo, l.duracion_minutos
   FROM lecciones l
   JOIN modulos m ON m.id = l.modulo_id
   WHERE m.curso_id = $curso_id
   ORDER BY m.orden, l.orden
   ```
2. Generar una entrada de progreso por cada leccion:
   - `completada`: 60% true, 40% false (random)
   - `porcentaje_visto`: si completada = 100, sino random(10, 90)
   - `tiempo_dedicado_seg`: random(60, 1800)
   - `fecha_inicio`: entre `fecha_inscripcion` y hoy
   - `fecha_completada`: fecha_inicio + random(1h, 72h) si completada
   - Si `tipo = 'cuestionario'`, agregar `quiz_respuestas` (3-5 preguntas)
3. Calcular `porcentaje_total` = (completadas / total) * 100
4. `ultima_leccion_vista`: la de mayor fecha_inicio
5. `fecha_ultima_actividad`: max(fecha_completada)

**Documento resultante:**
```json
{
  "inscripcion_id": UUID("..."),
  "curso_id": UUID("..."),
  "estudiante_id": UUID("..."),
  "progreso_lecciones": [
    {
      "leccion_id": UUID("..."),
      "completada": true,
      "porcentaje_visto": 100,
      "tiempo_dedicado_seg": 720,
      "fecha_inicio": ISODate("2025-11-01T14:30:00Z"),
      "fecha_completada": ISODate("2025-11-01T14:42:00Z")
    }
  ],
  "ultima_leccion_vista": UUID("..."),
  "porcentaje_total": 66.67,
  "fecha_ultima_actividad": ISODate("2025-12-15T09:00:00Z"),
  "fecha_inscripcion": ISODate("2025-10-15T08:00:00Z")
}
```

---

## 2. `resenas` — 200 documentos

**Fuente PostgreSQL:** `inscripciones` con `estado = 'completado'`

**Preparacion necesaria:** Actualizar 70+ inscripciones adicionales
a estado 'completado' (se seleccionan aleatoriamente entre las 'activo'
con fecha > 30 dias).

**Logica por cada inscripcion completada:**
1. Usar `inscripcion_id`, `curso_id`, `estudiante_id` reales
2. Buscar `instructor_id` desde `cursos.instructor_id`
3. Generar 5 calificaciones independientes (random 1-5)
4. `calificacion_promedio` = (suma califs) / 5, redondeado a 1 decimal
5. `comentario`: seleccion aleatoria de una lista de 30 frases predefinidas
6. `fecha_resena`: fecha_inscripcion + random(30, 90) dias
7. `aprobada`: 90% true (moderacion simulada)
8. `util_count`: random(0, 25)
9. `reportada`: 5% true

**Lista de comentarios predefinidos (30):**
- "Excelente curso. El instructor explica con mucha claridad."
- "Muy completo. Los ejercicios practicos ayudan mucho."
- "Buen contenido pero podria tener mas ejemplos."
- ... (completar con frases realistas en español)

---

## 3. `cuestionarios_respuestas` — 800 documentos

**Fuente PostgreSQL:** `lecciones` tipo 'cuestionario', `preguntas`

**Logica por cada intento:**
1. Elegir un `estudiante_id` aleatorio de estudiantes
2. Elegir una leccion tipo 'cuestionario' aleatoria
3. Obtener las preguntas reales de esa leccion:
   ```
   SELECT id, texto, respuesta_correcta, opciones, tipo, puntos
   FROM preguntas WHERE leccion_id = $leccion_id ORDER BY orden
   ```
4. Generar `preguntas_respuestas`:
   - ~65% correctas (random)
   - Para opcion_multiple: elegir opcion aleatoria si incorrecta
   - Para verdadero_falso: responder aleatoriamente si incorrecta
5. `calificacion` = (correctas / total) * 100 → redondeado a entero
6. `puntaje_total` = suma de puntos de las correctas
7. `tiempo_total_seg` = random(60, 1200)
8. `fecha_intento`: random entre fecha_inscripcion y hoy
9. `intento_numero`: 1 (solo primer intento)

---

## 4. `logs_actividad` — ~5000+ documentos

**Fuente PostgreSQL:** `inscripciones`, `lecciones`, `estudiantes`

**Logica — por cada inscripcion:**
- 1 evento `inscripcion_realizada` (fecha = fecha_inscripcion)
- Por cada leccion: 1 evento `leccion_iniciada`
- Si completada: 1 evento `leccion_completada`
- 2-3 eventos `login` adicionales (fechas aleatorias)

**Logica — eventos globales adicionales:**
- 500 eventos `login` aleatorios para todos los estudiantes
- 200 eventos `logout` aleatorios

**Documento resultante:**
```json
{
  "usuario_id": UUID("..."),
  "tipo_evento": "leccion_iniciada",
  "timestamp": ISODate("2025-12-01T10:00:00Z"),
  "metadata": {
    "curso_id": UUID("..."),
    "leccion_id": UUID("..."),
    "inscripcion_id": UUID("..."),
    "ip_origen": "192.168.x.x",
    "user_agent": "Mozilla/5.0..."
  }
}
```

---

## 5. `foros` — 300 documentos (100 hilos + 200 respuestas)

**Fuente PostgreSQL:** `cursos` publicados, `estudiantes`

**Hilos raiz (100):**
1. Elegir `curso_id` aleatorio entre publicados
2. Elegir `estudiante_id` aleatorio
3. `parent_id`: null
4. `ancestro_raiz_id`: null
5. `profundidad`: 0
6. `titulo`: frase aleatoria de lista predefinida
7. `contenido`: texto aleatorio (2-5 oraciones)
8. `fecha_creacion`: random ultimos 6 meses
9. `likes_count`: random(0, 15)
10. `resuelto`: 15% true (aleatorio)

**Respuestas (200):**
1. Elegir hilo raiz aleatorio
2. Elegir `estudiante_id` aleatorio (distinto del autor del hilo)
3. `parent_id`: ObjectId del hilo raiz
4. `ancestro_raiz_id`: ObjectId del hilo raiz
5. `profundidad`: 1
6. `contenido`: texto aleatorio (1-3 oraciones)
7. `fecha_creacion`: fecha_creacion_del_hilo + random(1h, 7d)
8. `likes_count`: random(0, 5)
9. `resuelto`: 10% true

---

## 6. Preparacion previa en Railway PostgreSQL

Antes de ejecutar el seed, se necesita actualizar inscripciones
adicionales a 'completado' para alcanzar 200 resenas:

```sql
UPDATE inscripciones
SET estado = 'completado'
WHERE id IN (
  SELECT id FROM inscripciones
  WHERE estado = 'activo'
    AND fecha_inscripcion < now() - interval '30 days'
  ORDER BY random()
  LIMIT 70
);
```

---

## 7. Script de ejecucion

**Archivo:** `db/Mongo/seed_mongo.js`

**Dependencias:** `pg` (para PostgreSQL), `mongoose` (solo para conectar a MongoDB)

**Flujo:**
```
1. Conectar PostgreSQL (Railway)
2. Conectar MongoDB (Railway)
3. Leer datos maestros de PG (inscripciones, lecciones, estudiantes, etc.)
4. Generar progreso_lecciones (696 docs)
5. Actualizar inscripciones a completado (para 200 resenas)
6. Generar resenas (200 docs)
7. Generar cuestionarios_respuestas (800 docs)
8. Generar logs_actividad (~5000 docs)
9. Generar foros (300 docs)
10. Mostrar resumen de conteos
```

---

## 8. Verificacion post-seed

```javascript
// Conteos esperados
db.progreso_lecciones.countDocuments()         // ~696
db.progreso_lecciones.aggregate([
  { $unwind: "$progreso_lecciones" },
  { $count: "total" }
])                                              // ~15300

db.resenas.countDocuments()                     // ~200
db.cuestionarios_respuestas.countDocuments()    // ~800
db.logs_actividad.countDocuments()              // ~5000
db.foros.countDocuments()                       // ~300
db.foros.countDocuments({ parent_id: null })    // ~100
db.foros.countDocuments({ parent_id: { $ne: null } })  // ~200
```
