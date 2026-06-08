# Guia de Estudio — Pipelines MongoDB RC-08 a RC-11

**Sesion:** 2026-06-08 | **Rama:** `feature/api`

---

## RC-08: Leccion de mayor abandono por curso

### Objetivo
Identificar que leccion causa mas desercion en cada curso.

### Pipeline

```javascript
db.progreso_lecciones.aggregate([
  // Paso 1: expandir el array embebido. Cada leccion se vuelve un doc independiente
  { $unwind: '$progreso_lecciones' },

  // Paso 2: agrupar por curso + leccion. Contar total y completados
  { $group: {
      _id: { curso_id: '$curso_id', leccion_id: '$progreso_lecciones.leccion_id' },
      total_estudiantes: { $sum: 1 },
      completaron: {
        $sum: { $cond: ['$progreso_lecciones.completada', 1, 0] }
      }
  }},

  // Paso 3: calcular tasa de abandono = 1 - (completaron / total)
  { $addFields: {
      tasa_abandono: {
        $round: [{ $subtract: [1, { $divide: ['$completaron', '$total_estudiantes'] }] }, 4]
      }
  }},

  // Paso 4: ordenar por curso y tasa descendente
  { $sort: { '_id.curso_id': 1, tasa_abandono: -1 } },

  // Paso 5: tomar solo la peor leccion de cada curso
  { $group: {
      _id: '$_id.curso_id',
      peor_leccion: { $first: '$_id.leccion_id' },
      tasa_abandono: { $first: '$tasa_abandono' },
      total_estudiantes: { $first: '$total_estudiantes' },
      completaron: { $first: '$completaron' }
  }},

  { $sort: { tasa_abandono: -1 } },
  { $limit: 10 }
]);
```

### Decisiones de diseno

**`$unwind` sobre array embebido:** El documento `progreso_lecciones`
contiene un array de ~22 lecciones por inscripcion. `$unwind` crea un
documento por cada elemento del array, permitiendo agrupar por leccion
individual. Sin `$unwind`, no podriamos contar completados por leccion.

**`$cond` en vez de `$match`:** No filtramos antes de agrupar porque
necesitamos contar tanto los que completaron como los que no. Si
hicieramos `$match: { completada: false }` perderiamos a los que SI
completaron y no podriamos calcular la tasa.

**`$first` en el segundo `$group`:** Despues de ordenar por
`tasa_abandono: -1`, el primer documento de cada grupo es la peor
leccion. `$first` captura ese valor. Es mas eficiente que `$max`/`$min`
porque los datos ya vienen ordenados.

### Resultado esperado
Top 10 cursos con su leccion de mayor abandono, mostrando el % de
estudiantes que NO la completaron.

---

## RC-09: Tiempo promedio para completar

### Objetivo
Medir cuanto tarda un estudiante en completar lecciones.

### Pipeline

```javascript
db.progreso_lecciones.aggregate([
  { $unwind: '$progreso_lecciones' },

  // Solo lecciones completadas (tienen fecha de finalizacion)
  { $match: {
      'progreso_lecciones.completada': true,
      'progreso_lecciones.fecha_completada': { $ne: null }
  }},

  // Calcular diferencia de tiempo en milisegundos
  { $addFields: {
      tiempo_completado_ms: {
        $subtract: [
          '$progreso_lecciones.fecha_completada',
          '$progreso_lecciones.fecha_inicio'
        ]
      }
  }},

  // Agrupar por curso + leccion: promedio de tiempo
  { $group: {
      _id: { curso_id: '$curso_id', leccion_id: '$progreso_lecciones.leccion_id' },
      tiempo_promedio_min: { $avg: { $divide: ['$tiempo_completado_ms', 60000] } },
      total_completados: { $sum: 1 }
  }},

  // Segundo grupo: por curso, promedia todas las lecciones
  { $group: {
      _id: '$_id.curso_id',
      tiempo_promedio_por_leccion: { $avg: { $round: ['$tiempo_promedio_min', 1] } },
      total_lecciones: { $sum: 1 },
      total_completados: { $sum: '$total_completados' }
  }},

  { $sort: { tiempo_promedio_por_leccion: -1 } },
  { $limit: 10 }
]);
```

### Decisiones de diseno

**`$match` antes de `$group`:** Filtramos temprano para reducir el
volumen de datos procesados en las etapas siguientes. Es mas eficiente
que filtrar dentro del `$group` con `$cond`.

**`$subtract` entre fechas:** MongoDB almacena fechas como ISODate
internamente (milisegundos desde epoch). Restar dos fechas da la
diferencia en milisegundos. Dividir por 60000 convierte a minutos.

**Dos `$group` en cascada:** El primero calcula el promedio por
leccion individual. El segundo promedia todas las lecciones dentro
de un curso. No se puede hacer en un solo `$group` porque el segundo
nivel de agregacion opera sobre resultados ya agrupados.

**Nota sobre seed data sintetico:** Los tiempos altos (~20000 min)
reflejan que las fechas del seed son aleatorias con spread de meses.
En produccion, las fechas reales daran tiempos de horas/dias.

---

## RC-10: Analisis de cuestionarios con `$facet`

### Objetivo
Analisis multidimensional de resultados de cuestionarios. **REQUISITO:
minimo 1 pipeline con `$facet`.**

### Pipeline

```javascript
db.cuestionarios_respuestas.aggregate([
  { $facet: {

      // Faceta 1: estadisticas generales de calificaciones
      calificacion_promedio: [
        { $group: {
            _id: null,
            promedio: { $avg: '$calificacion' },
            minimo: { $min: '$calificacion' },
            maximo: { $max: '$calificacion' },
            total_evaluados: { $sum: 1 }
        }}
      ],

      // Faceta 2: estudiantes con mas intentos (posible bajo rendimiento)
      intentos_por_estudiante: [
        { $group: {
            _id: '$estudiante_id',
            intentos: { $sum: 1 },
            calificacion_promedio: { $avg: '$calificacion' }
        }},
        { $sort: { intentos: -1 } },
        { $limit: 10 }
      ],

      // Faceta 3: preguntas que mas se fallan
      preguntas_mayor_error: [
        { $unwind: '$preguntas_respuestas' },
        { $match: { 'preguntas_respuestas.correcta': false } },
        { $group: {
            _id: '$preguntas_respuestas.pregunta_id',
            errores: { $sum: 1 }
        }},
        { $sort: { errores: -1 } },
        { $limit: 10 }
      ]
  }}
]);
```

### Decisiones de diseno

**`$facet` — por que y como funciona:**
`$facet` ejecuta multiples pipelines en PARALELO sobre el MISMO conjunto
de datos de entrada. Es como correr 3 consultas independientes pero sin
re-escanear la coleccion 3 veces. MongoDB lee los documentos una vez y
los enruta a cada faceta.

**Cuando usar `$facet` vs consultas separadas:**
- `$facet`: cuando las facetas comparten el mismo `$match` inicial y
  procesan los mismos documentos. Una sola lectura de disco.
- Consultas separadas: cuando cada consulta tiene filtros muy distintos
  o indices especificos que aprovechar.

**Faceta 1 — `calificacion_promedio`:**
`_id: null` agrupa TODOS los documentos en un solo grupo. Es el patron
para calcular estadisticas globales.

**Faceta 3 — `preguntas_mayor_error`:**
`$unwind` sobre `preguntas_respuestas` seguido de `$match` para filtrar
solo incorrectas. Luego `$group` por `pregunta_id` para contar errores.
El `$sort` + `$limit 10` devuelve las 10 preguntas mas falladas —
informacion accionable para el instructor (posible mejora de contenido).

### Resultado esperado
```json
{
  "calificacion_promedio": [{ "promedio": 66.3, "minimo": 0, "maximo": 100 }],
  "intentos_por_estudiante": [...10 estudiantes...],
  "preguntas_mayor_error": [...10 preguntas con mas fallos...]
}
```

---

## RC-11: Analisis del foro

### Objetivo
Medir participacion en foros por curso. Identificar cursos con comunidad
activa.

### Pipeline

```javascript
db.foros.aggregate([
  // Solo hilos raiz
  { $match: { parent_id: null } },

  // Unir con respuestas (ancestro_raiz_id referencia al hilo raiz)
  { $lookup: {
      from: 'foros',
      localField: '_id',
      foreignField: 'ancestro_raiz_id',
      as: 'respuestas'
  }},

  // Calcular metricas por hilo
  { $addFields: {
      total_respuestas: { $size: '$respuestas' },
      total_likes: {
        $add: ['$likes_count', { $sum: '$respuestas.likes_count' }]
      },
      tiene_respuesta_resuelta: {
        $gt: [{ $size: {
          $filter: { input: '$respuestas', cond: '$$this.resuelto' }
        }}, 0]
      }
  }},

  // Agrupar por curso
  { $group: {
      _id: '$curso_id',
      total_hilos: { $sum: 1 },
      total_respuestas: { $sum: '$total_respuestas' },
      total_likes: { $sum: '$total_likes' },
      hilos_resueltos: { $sum: { $cond: ['$resuelto', 1, 0] } },
      respuestas_promedio: { $avg: '$total_respuestas' }
  }},

  // Puntaje de participacion
  { $addFields: {
      participacion: { $add: ['$total_hilos', '$total_respuestas'] }
  }},

  { $sort: { participacion: -1 } },
  { $limit: 10 }
]);
```

### Decisiones de diseno

**`$lookup` entre la misma coleccion:**
Es un self-join. Los hilos raiz (`parent_id: null`) se unen con sus
respuestas via `ancestro_raiz_id`. MongoDB busca en la coleccion `foros`
documentos cuyo `ancestro_raiz_id` coincida con el `_id` del hilo raiz.
El resultado se almacena en el campo `respuestas` como array.

**`$filter` para contar respuestas resueltas:**
Filtra el array `respuestas` buscando las que tienen `resuelto: true`.
`$size` cuenta cuantas cumplen la condicion. `$gt` convierte a booleano.

**`$sum: '$respuestas.likes_count'` en `$addFields`:**
Suma los likes de todas las respuestas dentro de un hilo. `$sum` sobre
un array de numeros funciona como `reduce((a,b) => a+b, 0)`.

**Denormalizacion `ancestro_raiz_id`:**
Sin este campo, para encontrar todas las respuestas de un hilo habria
que hacer `$lookup` recursivo o multiples niveles de anidacion.
`ancestro_raiz_id` es una denormalizacion que simplifica la query a
cambio de un UPDATE extra al insertar la respuesta.

### Resultado esperado
Top 10 cursos con mas publicaciones (hilos + respuestas), likes totales
y porcentaje de hilos resueltos.

---

## Tabla resumen RC-08 a RC-11

| RC | Coleccion | Operadores clave | Tiene `$facet`? |
|----|-----------|-----------------|------------------|
| RC-08 | `progreso_lecciones` | `$unwind`, `$group` x2, `$cond` | No |
| RC-09 | `progreso_lecciones` | `$unwind`, `$match`, `$subtract`, `$group` x2 | No |
| RC-10 | `cuestionarios_respuestas` | `$facet`, `$unwind`, `$group` | **SI** |
| RC-11 | `foros` | `$lookup` (self), `$filter`, `$group` | No |

---

## Para defensa oral — preguntas frecuentes

**¿Por que `$unwind` y no una coleccion separada para progreso?**
Porque el progreso de un estudiante SIEMPRE se lee completo (todas las
lecciones del curso). Un array embebido evita el `$lookup` y reduce
latencia. Es el patron "one-to-few" de MongoDB (<100 elementos).

**¿`$facet` ralentiza si las facetas son muy diferentes?**
No. Las facetas se ejecutan en paralelo sobre el mismo stream de
documentos. El overhead es minimo comparado con 3 consultas separadas
que escanearian la coleccion 3 veces. El limite es que todas las
facetas reciben los MISMOS documentos de entrada (mismo `$match`).

**¿Por que `$lookup` en la misma coleccion y no una coleccion separada
para respuestas?**
Los foros son jerarquicos por naturaleza (hilo → respuestas →
sub-respuestas). Tener hilos y respuestas en la misma coleccion con
`parent_id` y `ancestro_raiz_id` permite profundidad arbitraria sin
multiples colecciones. El `$lookup` self-join es estandar en MongoDB
para este patron.

**¿Por que `$addFields` en vez de calcular en `$group` directamente?**
`$addFields` calcula campos intermedios que se usan en multiples
agregaciones posteriores. Es mas legible que anidar expresiones
dentro de `$group`. El optimizador de MongoDB fusiona etapas cuando
es posible, asi que no hay penalizacion de rendimiento.
