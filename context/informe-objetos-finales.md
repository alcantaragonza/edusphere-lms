# Informe — Objetos Finales PostgreSQL

**Sesion:** 2026-06-08 | **Rama:** `feature/ui` | **Destino:** Railway

---

## Resumen ejecutivo

Se crearon 7 objetos en PostgreSQL sobre Railway para completar los requisitos
minimos del enunciado (secciones 5.2 y 5.5). Con esto se alcanzan:

- **3 de 3 funciones** (1 escalar + 2 TABLE)
- **2 de 2 vistas materializadas** en Railway (ya estaban en local)
- **2 de 2 SPs actualizados** con `log_auditoria` y `calcular_comision`
- **4 de 11 reportes** completados adicionalmente (RC-03, RC-05, RC-06, RC-07)

---

## 1. `calcular_comision` — Funcion escalar

### Proposito
Centralizar el calculo de la comision de plataforma. El enunciado exige
**minimo 1 funcion escalar** (seccion 5.2).

### Por que se hizo asi
- **`IMMUTABLE`**: para los mismos argumentos siempre retorna lo mismo.
  PostgreSQL puede reutilizar el resultado en cache sin recalcular.
- **`LANGUAGE sql`**: es una operacion aritmetica simple, no necesita
  PL/pgSQL. SQL puro es mas rapido para funciones inline.
- **`ROUND(..., 2)`**: los montos son `numeric(10,2)`, la comision debe
  mantener 2 decimales para consistencia financiera.
- **Separada del SP**: si la formula cambia (ej. 30% → 25%), se modifica
  en un solo lugar. Principio DRY.

### Uso
```sql
-- SP la invoca:
v_comision := calcular_comision(v_precio, v_tasa);

-- Consulta directa:
SELECT calcular_comision(100.00, 30.00);  -- → 30.00
```

---

## 2. `fn_avance_estudiante` — Funcion TABLE (RC-03)

### Proposito
Calcular el avance de un estudiante en un curso. El enunciado pide una
**funcion TABLE** para RC-03.

### Por que se hizo asi
- **Sin MongoDB**: el progreso leccion-por-leccion vive en MongoDB
  (`progreso_lecciones`). Esta funcion entrega la estructura del curso
  desde PostgreSQL (total modulos, total lecciones, estado de la
  inscripcion). El frontend combina ambas fuentes.
- **`LATERAL`**: las subconsultas `mc` y `lc` usan LATERAL para
  correlacionar con el curso sin generar producto cartesiano.
- **`LEFT JOIN` desde `dummy`**: garantiza que SIEMPRE se retorna una
  fila, incluso si el estudiante no esta inscrito. Evita NULLs
  inesperados en la API.
- **`STABLE`**: el resultado depende del estado de las tablas, no de
  parametros volatiles. Permite optimizacion en consultas repetidas.

### Columnas retornadas
| Columna | Tipo | Descripcion |
|---------|------|-------------|
| `total_modulos` | bigint | Modulos del curso |
| `total_lecciones` | bigint | Lecciones totales del curso |
| `estado_inscripcion` | text | activo / completado / cancelado |
| `certificado` | boolean | Si ya obtuvo certificado |
| `calificacion` | numeric | Calificacion final (si existe) |

---

## 3. `vm_ingresos_mensuales` — Vista materializada (RC-05)

### Proposito
Reporte gerencial de ingresos agrupados por mes y categoria. El enunciado
exige **2 vistas materializadas** (seccion 5.2).

### Por que materializada
- **85x mas rapida** que la consulta equivalente (0.034 ms vs 2.908 ms
  segun EXPLAIN ANALYZE local).
- Los ingresos no cambian intra-dia. Un refresh semanal mantiene los
  datos actualizados sin carga.
- El dashboard del instructor y los reportes administrativos consultan
  esta vista frecuentemente.

### Estrategia de refresh
```
Frecuencia:   semanal (lunes 03:00 AM)
Comando:      REFRESH MATERIALIZED VIEW vm_ingresos_mensuales;
Duracion est: ~3 ms con 696 pagos (crecera linealmente)
Justificacion: los pagos son inmutables una vez completados.
              Un refresh semanal es suficiente para reportes
              mensuales.
```

### Columnas
| Columna | Tipo | Descripcion |
|---------|------|-------------|
| `mes` | timestamptz | Mes truncado |
| `categoria` | varchar | Categoria del curso |
| `total_inscripciones` | bigint | Inscripciones en el mes |
| `ingresos_totales` | numeric | Suma de pagos |
| `ticket_promedio` | numeric | Gasto promedio por inscripcion |

---

## 4. `vm_top_cursos_vendidos` — Vista materializada (RC-06)

### Proposito
Ranking de los 10 cursos con mas inscripciones pagadas.

### Por que materializada
- **85x mas rapida** que la consulta equivalente (0.013 ms vs 1.115 ms).
- Los cursos mas vendidos no cambian minuto a minuto. Refresh semanal
  es adecuado.
- Se consulta desde el landing page y dashboard administrativo.

### Estrategia de refresh
```
Frecuencia:   semanal (junto con vm_ingresos_mensuales)
Comando:      REFRESH MATERIALIZED VIEW vm_top_cursos_vendidos;
```

### Columnas
| Columna | Tipo | Descripcion |
|---------|------|-------------|
| `id` | uuid | ID del curso |
| `titulo` | varchar | Nombre del curso |
| `nivel` | enum | principiante / intermedio / avanzado |
| `categoria` | varchar | Categoria del curso |
| `instructor` | text | Nombre completo del instructor |
| `total_inscritos` | bigint | Cantidad de inscripciones |
| `ingresos_generados` | numeric | Suma total pagada |

---

## 5. `vw_tasa_finalizacion` — Vista normal (RC-07)

### Proposito
Indicador de calidad: que porcentaje de estudiantes inscritos completan
cada curso. El enunciado lo clasifica como "Combinado" (PostgreSQL +
MongoDB), pero el calculo base de inscripciones vs completados es
puramente PostgreSQL.

### Por que vista normal
- Los datos cambian con cada inscripcion completada. Una vista
  materializada se desactualizaria rapidamente.
- El costo de la consulta es bajo: JOIN simple con agregacion.
- Se puede materializar a futuro si el volumen crece.

### Formula
```
tasa_finalizacion = (completados / total_inscritos) * 100
```
Solo se consideran cursos con al menos 1 inscrito (`HAVING COUNT > 0`).

### Columnas
| Columna | Tipo | Descripcion |
|---------|------|-------------|
| `curso_id` | uuid | ID del curso |
| `titulo` | varchar | Nombre del curso |
| `nivel` | enum | Nivel del curso |
| `completados` | bigint | Inscripciones en estado completado |
| `total_inscritos` | bigint | Total de inscripciones |
| `tasa_finalizacion` | numeric | Porcentaje con 2 decimales |

---

## 6. `sp_inscribir_estudiante` — Actualizacion

### Que cambio
| Aspecto | Antes | Ahora |
|---------|-------|-------|
| Comision | Hardcodeada `v_tasa := 30.00` | `calcular_comision(v_precio, v_tasa)` |
| Auditoria | No registraba | `INSERT INTO log_auditoria` |
| Trazabilidad | Inexistente | Cada inscripcion deja registro inmutable |

### Por que
- **`calcular_comision`**: si la tasa cambia, se modifica la funcion,
  no el SP. Separacion de responsabilidades.
- **`log_auditoria`**: el enunciado pide registro de operaciones
  criticas (Fase 6). La tabla es append-only (nunca se modifica ni
  elimina). Cumple con el requisito de auditoria.
- **`tipos_operacion_auditoria`**: se usa `WHERE tao.nombre = 'inscripcion_curso'`
  para obtener el ID del tipo de operacion, evitando hardcodear IDs.

---

## 7. `sp_emitir_certificado` — Actualizacion

### Que cambio
| Aspecto | Antes | Ahora |
|---------|-------|-------|
| Auditoria | No registraba | `INSERT INTO log_auditoria` |
| Usuario | No se registraba | Resuelve `usuario_id` desde `estudiantes` |

### Por que
- Misma justificacion que `sp_inscribir_estudiante`: trazabilidad
  completa de operaciones criticas.
- Resuelve `usuario_id` porque `log_auditoria.usuario_id` referencia
  a `usuarios.id`, no a `estudiantes.id`.

---

## Verificacion de funcionamiento

```sql
-- Funcion escalar
SELECT calcular_comision(100.00, 30.00);
-- → 30.00

-- Funcion TABLE (RC-03)
SELECT * FROM fn_avance_estudiante(
    '74b206f5-8ebd-4234-a45b-1aaa2a78c147',
    'c19d32e4-697a-47d3-8657-57d25bfc3560'
);
-- → 10 modulos, 34 lecciones, estado activo

-- Vista materializada (RC-05)
SELECT COUNT(*) FROM vm_ingresos_mensuales;
-- → 104 filas

-- Vista materializada (RC-06)
SELECT COUNT(*) FROM vm_top_cursos_vendidos;
-- → 10 filas

-- Vista normal (RC-07)
SELECT * FROM vw_tasa_finalizacion LIMIT 3;
-- → tasas entre 29% y 41%
```

---

## Impacto en los reportes

| RC | Objeto | Estado |
|----|--------|--------|
| RC-01 | `vw_catalogo_cursos_publicados` | ✅ Ya existia |
| RC-02 | `vw_cursos_estudiante` | ✅ Ya existia |
| RC-03 | `fn_avance_estudiante` | ✅ Nuevo |
| RC-04 | `fn_ingresos_instructor` | ✅ Ya existia |
| RC-05 | `vm_ingresos_mensuales` | ✅ Subido a Railway |
| RC-06 | `vm_top_cursos_vendidos` | ✅ Subido a Railway |
| RC-07 | `vw_tasa_finalizacion` | ✅ Nuevo |
| RC-08 | — | ❌ MongoDB |
| RC-09 | — | ❌ MongoDB |
| RC-10 | — | ❌ MongoDB |
| RC-11 | — | ❌ MongoDB |

**Reportes PostgreSQL: 7 de 7 completados** (100%)
**Reportes MongoDB: 0 de 4** (pendiente fase 7)

---

## Archivos generados

| Archivo | Contenido |
|---------|-----------|
| `db/objetos-finales.sql` | SQL completo con comentarios detallados |
| `context/informe-objetos-finales.md` | Este informe |
