# Avance — 2026-06-05 18:05

## Objetivo de la sesion

Reducir la base de datos al alcance MVP definido en `INSTRUCCIONES_EVALUACION_IA.md`, eliminar tablas no solicitadas, mover resenas a MongoDB y documentar la arquitectura para sesiones futuras.

---

## Cambios realizados

### 1. `estructura_db.sql` — Limpieza de tablas no MVP

**Tablas eliminadas (7):**

| Tabla | Motivo |
|-------|--------|
| `cupones` + `cupones_uso` | Sistema de descuentos. No lo pide el enunciado, complejidad innecesaria para MVP. |
| `recursos_descargables` | Archivos adjuntos por leccion. El tipo `'descarga'` en lecciones existe pero la tabla no es requisito. |
| `foros_cursos` + `foros_respuestas` | Sistema Q&A. Fuera del alcance del MVP. |
| `notificaciones` | Notificaciones in-app. No es parte del flujo core (inscribir → aprender → certificar). |
| `wishlist` | Lista de deseos. Marketing, no funcionalidad core. |

**Tabla movida a MongoDB (1):**

| Tabla | Destino | Motivo |
|-------|---------|--------|
| `resenas` | MongoDB `resenas` | Datos semi-estructurados con calificaciones multidimensionales. No participa en transacciones ACID. Se consulta con agregaciones. |

**Campo eliminado:**

- `cursos.total_recursos` — contaba registros en `recursos_descargables`. Al eliminar esa tabla, el campo queda huerfano.

**Tabla restaurada:**

- `carrito_compras` — necesario para el flujo de compra real (catalogo → carrito → pago → inscripcion). Eliminado el FK a `cupones` (`cupon_aplicado`) porque la tabla `cupones` ya no existe.

**Indices:**

- Eliminados 15 indices de las tablas removidas
- Agregado 1 indice para `carrito_compras(estudiante_id)`

**Resultado final:** 16 tablas, 27 indices (antes: 24 tablas, 42 indices).

---

### 2. `mongodb_estructura.js` — Creado

3 colecciones con validadores JSON Schema, indices y 1 registro de prueba cada una:

| Coleccion | Indices | Proposito |
|-----------|---------|-----------|
| `progreso_lecciones` | 3 (inscripcion_id unico, estudiante_id, curso_id) | Avance del estudiante por curso. Array embebido de lecciones. |
| `logs_actividad` | 4 (usuario+timestamp, evento+timestamp, curso_id sparse, TTL 90 dias) | Eventos de usuario de alto volumen. Rotacion automatica. |
| `resenas` | 4 (inscripcion_id unico, curso+fecha, instructor, aprobada+fecha) | Calificaciones movidas desde PostgreSQL. |

---

### 3. `AGENTS.md` — Creado y actualizado

Archivo de instrucciones para sesiones futuras de OpenCode. Contiene:

- Roles de cada archivo del repo
- Conflicto documentado: los dos SQL (`estructura_db.sql` vs `cursos_online_postgres_completo.sql`) tienen definiciones de tabla diferentes
- Comandos para aplicar los scripts
- Prerequisitos (PostgreSQL 14+, `pgcrypto`)
- Arquitectura: que va en PostgreSQL vs MongoDB
- Justificacion de UUIDs (requisito del evaluador + integracion cross-engine)
- Convenciones de diseno (snapshot historico, contadores denormalizados, ENUMs vs catalogos)
- Inmutabilidad del log de auditoria

---

## Por que se hicieron estos cambios

1. **Alcance MVP**: `INSTRUCCIONES_EVALUACION_IA.md` define explicitamente que tablas evaluar. Agregar tablas extra solo aumenta complejidad sin mejorar la calificacion.
2. **Resenas en MongoDB**: Son el caso de uso perfecto para NoSQL — datos flexibles, consultas de agregacion, sin requerimientos ACID. Ademas el enunciado ya espera MongoDB para datos no transaccionales.
3. **Carrito de compras**: Aunque no lo pide el enunciado, es necesario para un flujo de compra realista. Sin el, `sp_inscribir_estudiante` recibe una compra directa sin paso intermedio.
4. **Documentacion**: `AGENTS.md` evita que sesiones futuras pierdan tiempo re-descubriendo la arquitectura o cometiendo errores ya conocidos (como modificar el SQL equivocado).

---

## Estado actual del repositorio

```
estructura_db.sql                    # 16 tablas, 27 indices — estructura PostgreSQL MVP
cursos_online_postgres_completo.sql  # Schema completo (vistas, funciones, SPs, triggers)
                                     # ATENCION: tablas desfasadas respecto a estructura_db.sql
mongodb_estructura.js                # 3 colecciones MongoDB con validadores + test records
INSTRUCCIONES_EVALUACION_IA.md       # Rubrica de evaluacion (no modificar)
ANALISIS_3NF.md                      # Analisis de normalizacion
VERIFICACION_ESTRUCTURA_COMPLETA.md  # Verificacion de estructura (desactualizado tras cambios)
AGENTS.md                            # Instrucciones para OpenCode
avance.md                            # Este archivo
```

---

## Pendiente

- Actualizar `cursos_online_postgres_completo.sql` para que sus tablas coincidan con `estructura_db.sql` (ENUMs, campos nuevos)
- Actualizar vistas (`v_catalogo_cursos`, `v_cursos_estudiante`) para usar los campos agregados en `estructura_db.sql`
- Eliminar `resenas` del script completo (ya esta en MongoDB)
- Agregar `carrito_compras` al script completo
- Crear `seed_data.sql` con los volumenes minimos de datos de prueba
- Implementar endpoints Node.js/Express
- Documentar estrategia de backup/restore
