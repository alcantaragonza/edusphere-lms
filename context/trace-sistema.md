# Trace del Sistema — EduSphere LMS

> **Guía de estudio para defensa oral.** Sigue 4 flujos completos desde el clic del usuario hasta la base de datos. Cada paso indica archivo, línea y qué sucede técnica y simplemente.

---

## Índice

1. [Flujo 1 — Estudiante: Catálogo → Inscribirse → Pagar → Dashboard](#flujo-1)
2. [Flujo 2 — Instructor: Crear curso → Módulos → Publicar → Ver ingresos](#flujo-2)
3. [Flujo 3 — Certificado: Completar curso → Emitir certificado](#flujo-3)
4. [Flujo 4 — Entre bastidores: Triggers, vistas, contadores](#flujo-4)

---

## Mini-glosario para leer los traces

| Término | Significado simple |
|---------|-------------------|
| `🗂️` | Archivo y número de línea donde está el código |
| `🧠` | Qué piensa/hace el programa en ese momento |
| `🔄` | Qué sentencia SQL se ejecuta en la base de datos |
| `📋` | Resultado o efecto de la operación |
| `FK` | Foreign Key — columna que referencia el ID de otra tabla |
| `PK` | Primary Key — identificador único de cada fila |
| `SP` | Stored Procedure — programa que vive dentro de PostgreSQL |
| `ENUM` | Tipo de dato con valores predefinidos (ej. 'activo', 'completado') |

---

<a name="flujo-1"></a>

## Flujo 1 — Estudiante: Catálogo → Inscribirse → Pagar → Dashboard

**Actores:** María (estudiante, ya registrada y logueada)  
**Objetivo:** Ver cursos disponibles, inscribirse en uno, pagar, verlo en su dashboard.

---

### 📌 PASO 1.1 — María abre la página principal

```
🗂️ public/js/app.js:60
🧠 El router detecta la URL #/ y llama a homeController()
```

```
🗂️ public/js/controllers/home.js:30
🧠 homeController() intenta cargar el catálogo. Primero prueba el endpoint
    de reportes (más rápido, datos ya con JOINs), y si falla usa /cursos.
🔄 GET /api/reportes/catalogo → Railway ejecuta:
    SELECT * FROM vw_catalogo_cursos_publicados
📋 La vista está definida en:
    🗂️ db/cambios_railway.sql:173 (línea 173)
    Es un SELECT que junta 3 tablas:
      cursos ──JOIN──→ categorias   (para obtener el nombre de la categoría)
      cursos ──JOIN──→ instructores (para saber quién enseña)
      instructores ──JOIN──→ usuarios (para obtener nombre y apellido)
    Solo muestra cursos WHERE estado = 'publicado'
```

**En simple:** La página de inicio le pide a Railway "dame todos los cursos publicados con el nombre de su categoría e instructor". Railway ejecuta la vista `vw_catalogo_cursos_publicados` que pega 3 tablas como si pegaras 3 hojas de Excel por una columna en común.

---

### 📌 PASO 1.2 — María ve los filtros y la paginación

```
🗂️ public/js/controllers/home.js:44-102
🧠 El HTML del catálogo incluye:
    - Un input de búsqueda (filter-search)
    - Un dropdown de categorías (filter-category) — cargado desde GET /api/categorias
    - Un dropdown de niveles (filter-level)
    - Una grilla de 3 columnas con 9 cursos por página
```

```
🗂️ public/js/controllers/home.js:119-130
🧠 renderPage(1) se ejecuta al cargar y cada vez que cambia un filtro.
    Filtra los cursos en memoria (JavaScript, sin llamar al servidor):
      1. Si hay texto en el buscador → filtra por título
      2. Si hay categoría seleccionada → filtra por categoria_id
      3. Si hay nivel seleccionado → filtra por nivel
    Luego pagina: solo muestra 9 por página.
```

**En simple:** Los filtros funcionan en el navegador, sin molestar al servidor. María escribe "react" y solo ve los cursos que contienen esa palabra. Si cambia de página, se recalculan qué 9 cursos mostrar.

---

### 📌 PASO 1.3 — María hace clic en un curso

```
🗂️ public/js/controllers/curso-detalle.js:22
🧠 El router detecta #/curso/figma-para-dise-adores-6512
    y llama a cursoDetalleController({ slug: 'figma-para-dise-adores-6512' })
```

```
🗂️ public/js/controllers/curso-detalle.js:34-61
🧠 Busca el curso en la caché (guardada cuando visitó la página principal).
    Si no está en caché, busca en GET /api/cursos por slug.
    Si no, intenta reconocer el slug como UUID y busca por ID.
🔄 Si no está en caché: GET /api/cursos → SELECT * FROM cursos
    O GET /api/reportes/catalogo para catálogo completo
📋 Obtiene el curso_id (UUID) para usarlo en el resto de la página
```

```
🗂️ public/js/controllers/curso-detalle.js:91-102
🧠 Si María está autenticada (lo está), carga los módulos y lecciones:
🔄 GET /api/modulos?limit=9999     → SELECT * FROM modulos
    GET /api/lecciones?limit=9999   → SELECT * FROM lecciones
🧠 Filtra en JavaScript: solo módulos cuyo curso_id coincide
    Solo lecciones cuyo modulo_id coincide con los módulos del curso
📋 Muestra el acordeón: Módulo 1 → Lección 1, Lección 2...
```

**En simple:** La página del curso carga toda la info: título, descripción, precio, módulos y lecciones. Los módulos y lecciones se piden TODOS al servidor (con limit=9999 para evitar paginación) y se filtran en el navegador para mostrar solo los de este curso.

---

### 📌 PASO 1.4 — María ve las reseñas del curso

```
🗂️ public/js/controllers/curso-detalle.js:324
🧠 Carga las reseñas desde MongoDB:
🔄 GET /api/cursos/{cursoId}/resenas
    → Esto golpea la ruta definida en:
    🗂️ src/routes/index.js (ruta inline /cursos/:cursoId/resenas)
    → El controlador busca en MongoDB:
    db.collection('resenas').find({ curso_id: cursoId, aprobada: true })
📋 MongoDB devuelve documentos con:
    - calif_contenido, calif_claridad, calif_dificultad, calif_valor, calif_instructor
    - comentario, titulo_resena, fecha_resena
    - calificacion_promedio (promedio de las 5)
```

**En simple:** Las reseñas viven en MongoDB (no en PostgreSQL). El backend busca en la colección `resenas` todos los documentos cuyo `curso_id` coincida y estén aprobados. Los muestra con estrellas y comentarios.

---

### 📌 PASO 1.5 — María hace clic en "Inscribirse por Q151.76"

```
🗂️ public/js/controllers/curso-detalle.js:309-314
🧠 El botón "Inscribirse" obtiene el precio (precio_descuento si existe, sino precio)
    y redirige a la página de checkout con los datos del curso en la URL:
    #/checkout?directo=1&curso={cursoId}&precio=151.76&titulo=Figma%20para%20Diseñadores
```

```
🗂️ public/js/controllers/checkout.js:24-43
🧠 checkoutController() detecta que es un pago DIRECTO (directo=1).
    Extrae el curso_id, título y precio de los parámetros de la URL.
    Si el precio es 0 (no se pasó bien), lo busca en el catálogo:
🔄 GET /api/reportes/catalogo o /api/cursos
📋 Muestra la pasarela de pago con:
    - Resumen del pedido (1 curso, Q151.76)
    - Formulario de tarjeta (demo, no se procesa realmente)
    - Total a pagar
```

**En simple:** El botón "Inscribirse" no inscribe directamente — primero te manda a una página de pago. Esto simula una pasarela de pago real (como MercadoPago o Stripe) pero en modo demo.

---

### 📌 PASO 1.6 — María completa el formulario y hace clic en "Pagar Q151.76"

```
🗂️ public/js/controllers/checkout.js:70-85
🧠 Al enviar el formulario, por cada curso en el carrito (en este caso 1):
🔄 POST /api/inscripciones
    Body: { estudiante_id: "uuid-de-maria", curso_id: "uuid-del-curso" }
```

```
🗂️ src/routes/operaciones.routes.js
🧠 La ruta POST /api/inscripciones apunta al controlador:
    🗂️ src/controllers/operaciones.controller.js
    → Valida que estudiante_id y curso_id sean UUIDs válidos
    → Llama al modelo:
    🗂️ src/models/operaciones.model.js
🔄 CALL sp_inscribir_estudiante($1, $2)
    $1 = usuario_id de María (UUID)
    $2 = curso_id de Figma para Diseñadores (UUID)
```

**AHORA EMPIEZA LA MAGIA DENTRO DE POSTGRESQL:**

```
🗂️ db/objetos-finales.sql:106 (SP sp_inscribir_estudiante)
🧠 El SP recibe p_usuario_id y p_curso_id.

PASO 1 DEL SP — Buscar el estudiantes.id de María:
🔄 SELECT id INTO v_est_id FROM estudiantes WHERE usuario_id = p_usuario_id
📋 María tiene usuario_id = "bd30..." → estudiantes.id = "530e..."
    (Son UUIDs DIFERENTES. El SP resuelve la relación.)

PASO 2 DEL SP — Verificar que el curso existe y está publicado:
🔄 SELECT c.estado::text, COALESCE(c.precio_descuento, c.precio)
    INTO v_estado_curso, v_precio
    FROM cursos c WHERE c.id = p_curso_id
📋 Figma para Diseñadores: estado = 'publicado' ✓, precio = 151.76

PASO 3 DEL SP — Validar que no sea duplicado:
🔄 SELECT 1 FROM inscripciones
    WHERE estudiante_id = v_est_id AND curso_id = p_curso_id
📋 No encuentra nada → María no está inscrita aún ✓

PASO 4 DEL SP — Calcular la comisión de la plataforma:
🔄 v_comision := calcular_comision(v_precio, v_tasa)
    Esto llama a la función escalar:
    🗂️ db/objetos-finales.sql:1
    SELECT ROUND(p_monto * p_tasa / 100.0, 2)
📋 calcular_comision(151.76, 30) = ROUND(151.76 * 30 / 100, 2) = 45.53
    EduSphere se queda con Q45.53. El instructor recibe Q106.23.

PASO 5 DEL SP — Crear la inscripción:
🔄 INSERT INTO inscripciones (estudiante_id, curso_id, monto_pagado, tasa_comision_aplicada)
    VALUES (v_est_id, p_curso_id, v_precio, v_tasa)
    RETURNING id INTO v_ins_id
📋 Nueva fila en tabla `inscripciones`:
    id = "990b..." (generado por gen_random_uuid())
    estudiante_id = "530e..."
    curso_id = "45dd..."
    monto_pagado = 151.76
    tasa_comision_aplicada = 30.00
    estado = 'activo' (default de la tabla)

PASO 6 DEL SP — Registrar el pago:
🔄 INSERT INTO pagos (inscripcion_id, monto, metodo_pago, referencia_pago, proveedor_pago, estado, detalles_pago)
    VALUES (v_ins_id, v_precio, 'tarjeta', 'ref-...', 'EduSphere Demo', 'completado', '{"curso": "...", "tasa": 30}')
📋 Nueva fila en tabla `pagos`:
    inscripcion_id = "990b..." (mismo UUID que la inscripción)
    monto = 151.76
    metodo_pago = 'tarjeta'
    estado = 'completado'

PASO 7 DEL SP — Registrar en auditoría:
🔄 INSERT INTO log_auditoria (usuario_id, tipo_operacion_id, entidad_afectada, entidad_id, detalles_operacion)
    SELECT p_usuario_id, tao.id, 'inscripciones', v_ins_id, jsonb_build_object(...)
    FROM tipos_operacion_auditoria tao WHERE tao.nombre = 'inscripcion_curso'
📋 Nueva fila en tabla `log_auditoria`:
    usuario_id = "bd30..." (María)
    tipo_operacion_id = 2 ('inscripcion_curso')
    entidad_afectada = 'inscripciones'
    entidad_id = "990b..."
    detalles_operacion = {"estudiante_id": "...", "curso_id": "...", "monto": 151.76, "tasa": 30, "comision": 45.53}
    fecha_operacion = NOW()
    ⚠️ Esta tabla es APPEND-ONLY: nunca se modifica ni se borra.

PASO 8 DEL SP — Actualizar contadores desnormalizados:
🔄 UPDATE cursos SET total_estudiantes = total_estudiantes + 1
    WHERE id = p_curso_id
📋 Figma para Diseñadores: total_estudiantes pasa de 27 a 28

🔄 UPDATE estudiantes SET total_cursos = total_cursos + 1
    WHERE id = v_est_id
📋 María: total_cursos pasa de 3 a 4
```

**En simple:** El SP hace 8 cosas en orden: (1) encuentra el ID de estudiante de María, (2) verifica que el curso existe y está publicado, (3) se asegura que no esté duplicada, (4) calcula que EduSphere se queda con el 30%, (5) crea la inscripción, (6) registra el pago, (7) deja huella en auditoría, (8) actualiza los contadores de "total de estudiantes" y "total de cursos".

---

### 📌 PASO 1.7 — María es redirigida a su dashboard

```
🗂️ public/js/controllers/checkout.js:82
🧠 Después del pago exitoso: window.location.hash = '#/mis-cursos'
```

```
🗂️ public/js/controllers/dashboard-estudiante.js:34
🧠 dashboardEstudianteController() carga los cursos inscritos:
🔄 GET /api/estudiantes/{userId}/cursos
    → Esto golpea:
    🗂️ src/controllers/estudiantes.controller.js (función cursos)
    → Que llama a:
    🗂️ src/models/reportes.model.js (función cursosDeEstudiante)
🔄 SELECT * FROM vw_cursos_estudiante WHERE estudiante_id = $1
    $1 = "bd30..." (usuario_id de María)
📋 La vista está definida en:
    🗂️ db/cambios_railway.sql:198
    Devuelve los cursos de María con:
    - titulo, slug, nivel, instructor
    - total_modulos, total_lecciones
    - estado_inscripcion (activo/completado)
    - certificado_obtenido (true/false)
```

```
🗂️ public/js/controllers/dashboard-estudiante.js:39-46
🧠 Normaliza los nombres de campo (la vista devuelve curso_titulo, el frontend espera titulo)
    y guarda en caché para que el visor de lección los encuentre después.
📋 Muestra:
    - Tarjeta de "Horas de aprendizaje"
    - Tarjeta de "Cursos en progreso" (número)
    - Tarjeta de "Certificados obtenidos"
    - Grid con cada curso: título, progreso, botón "Continuar Aprendiendo"
```

**En simple:** El dashboard le pide al backend "dame los cursos de María". El backend consulta la vista `vw_cursos_estudiante` que ya tiene todo pre-calculado (módulos, lecciones, instructor). María ve sus 4 cursos con barras de progreso.

---

<a name="flujo-2"></a>

## Flujo 2 — Instructor: Crear curso → Módulos → Publicar → Ver ingresos

**Actores:** Luis (instructor)  
**Objetivo:** Crear un curso nuevo, agregarle módulos y lecciones, publicarlo, y ver sus ganancias en el dashboard.

---

### 📌 PASO 2.1 — Luis abre su dashboard de instructor

```
🗂️ public/js/app.js:68
🧠 requireInstructor() verifica que Luis tenga rol 'instructor' o 'admin'
    → dashboardInstructorController()
```

```
🗂️ public/js/controllers/dashboard-instructor.js:38-58
🧠 Carga el perfil de instructor y los ingresos:
🔄 GET /api/instructores → busca el perfil de Luis por usuario_id
🔄 GET /api/cursos → filtra en JS por instructor_id = perfil.id
🔄 GET /api/instructores/{id}/ingresos?desde=2025-06-01&hasta=2026-06-08
    → Esto invoca:
    🗂️ src/models/reportes.model.js (función ingresosInstructor)
🔄 SELECT * FROM fn_ingresos_instructor($1, $2, $3)
    La función está definida en:
    🗂️ db/objetos-finales.sql (función fn_ingresos_instructor)
    Retorna por cada curso: total_inscripciones, ingreso_bruto, ingreso_neto
📋 Dashboard muestra:
    - Total estudiantes
    - Calificación promedio
    - Ganancias netas
    - Lista de cursos con badges (Publicado/Borrador)
    - Resumen financiero (bruto, comisión 30%, neto)
```

**En simple:** El dashboard del instructor muestra cuánto ha ganado Luis. La función `fn_ingresos_instructor` suma todos los pagos de sus cursos en los últimos 12 meses y descuenta la comisión del 30% de EduSphere.

---

### 📌 PASO 2.2 — Luis crea un curso nuevo

```
🗂️ public/js/controllers/dashboard-instructor.js (modal "Crear Nuevo Curso")
🧠 Luis llena el formulario: título, categoría, nivel, precio, etc.
    Al hacer clic en "Crear Curso":
🔄 POST /api/cursos
    Body: { instructor_id, categoria_id, slug, titulo, precio, estado: 'publicado', ... }
    🗂️ src/controllers/cursos.controller.js (usa CRUD factory)
    🗂️ src/models/cursos.model.js (usa crearModelo del CRUD factory)
🔄 INSERT INTO cursos (instructor_id, categoria_id, slug, titulo, precio, estado, ...)
    VALUES ($1, $2, $3, $4, $5, 'publicado', ...)
    RETURNING *
```

**PERO HAY UN TRUCO — EL TRIGGER:**

```
🗂️ db/cambios_railway.sql:12 (trigger sync_categoria_estado)
🧠 ANTES de que el INSERT se escriba en disco, el trigger se dispara:
    🗂️ db/cambios_railway.sql:12-24
    CREATE TRIGGER trg_sync_categoria_estado
      BEFORE INSERT OR UPDATE ON cursos
      FOR EACH ROW
      EXECUTE FUNCTION sync_categoria_estado()

    La función del trigger:
    NEW.estado = NEW.categoria;
    RETURN NEW;

📋 ¿Qué pasó?
    El frontend/envío dice: estado = 'publicado'
    Pero el backend model espera: categoria = 'publicado'
    Como agregamos la columna `categoria` a la tabla y el trigger la copia a `estado`,
    ambas columnas quedan con 'publicado'.
    
    ⚠️ ESTO ES CLAVE PARA LA DEFENSA:
    El backend (feature/api) tiene un bug de naming: el modelo de cursos espera
    que la columna se llame `categoria`, pero el schema original la llamó `estado`.
    En vez de corregir el backend (que requeriría redeploy), agregamos la columna
    `categoria` y un trigger que mantiene ambas sincronizadas.
```

**En simple:** Crear un curso dispara un trigger invisible que copia el valor de `categoria` a `estado`. Esto es un parche para un bug del backend que usa el nombre equivocado de columna. Para la defensa: "aplicamos el principio de mínimo cambio — en vez de modificar el backend y redeployar, extendimos el schema con una columna extra y un trigger de sincronización".

---

### 📌 PASO 2.3 — Luis agrega módulos al curso

```
🗂️ public/js/controllers/curso-detalle.js:424-482
🧠 Luis hace clic en "Agregar Módulo" (solo visible para instructores).
    Se abre un modal con formulario: título, descripción, duración.
    
    Antes de mostrar el modal, calcula el orden:
🔄 GET /api/modulos?limit=9999
🧠 Filtra por curso_id en JavaScript y calcula:
    nextOrden = max(orden de los módulos de este curso) + 1
    Así el primer módulo tiene orden=1, el segundo orden=2, etc.

    Al enviar:
🔄 POST /api/modulos
    Body: { curso_id, titulo, descripcion, duracion_total_min, es_gratuito, orden }
    🗂️ src/models/modulos.model.js
🔄 INSERT INTO modulos (curso_id, titulo, descripcion, duracion_total_min, es_gratuito, orden)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
📋 Nueva fila en tabla `modulos`
```

**En simple:** Cada módulo tiene un número de orden (1, 2, 3...). El frontend calcula cuál es el siguiente número disponible preguntando "dame todos los módulos de este curso, ¿cuál es el orden más alto?" y sumándole 1.

---

### 📌 PASO 2.4 — Luis publica el curso

```
🗂️ public/js/controllers/curso-detalle.js:246-258
🧠 Luis hace clic en "Publicar Curso" (visible cuando estado = 'borrador').
🔄 PATCH /api/cursos/{cursoId}
    Body: { categoria: 'publicado' }
    🗂️ src/controllers/cursos.controller.js (CRUD factory → actualizar)
    🗂️ src/models/cursos.model.js
🔄 UPDATE cursos SET categoria = 'publicado' WHERE id = $1 RETURNING *

    EL TRIGGER SE DISPARA OTRA VEZ:
    🗂️ db/cambios_railway.sql:12
    NEW.estado = NEW.categoria  →  ambas columnas ahora son 'publicado'
📋 El curso ahora aparece en el catálogo público.
```

**En simple:** Publicar un curso es simplemente cambiar su estado de 'borrador' a 'publicado' en la base de datos. El trigger asegura que ambas columnas (estado y categoria) se actualicen.

---

<a name="flujo-3"></a>

## Flujo 3 — Certificado: Completar curso → Emitir certificado

**Actores:** María (estudiante) y Luis (instructor)  
**Objetivo:** María completó todas las lecciones. Luis le emite el certificado.

---

### 📌 PASO 3.1 — Luis abre el formulario de emisión de certificado

```
🗂️ public/js/controllers/dashboard-instructor.js:92
🧠 Luis hace clic en "Emitir Certificado" desde su dashboard.
    Redirige a: #/certificado/emitir
```

```
🗂️ public/js/controllers/certificado.js:96-150
🧠 certificadoController() detecta que id === 'emitir' y que Luis es instructor.
    Muestra un formulario con un campo: "ID de Inscripción" (UUID).
```

---

### 📌 PASO 3.2 — Luis ingresa el ID de inscripción y emite el certificado

```
🗂️ public/js/controllers/certificado.js:130-148
🧠 Al enviar el formulario:
🔄 POST /api/certificados
    Body: { inscripcion_id: "uuid-de-la-inscripcion" }
```

```
🗂️ src/routes/operaciones.routes.js
🧠 La ruta POST /api/certificados solo permite instructor/admin.
    → 🗂️ src/controllers/operaciones.controller.js (emitirCertificado)
    → 🗂️ src/models/operaciones.model.js
🔄 CALL sp_emitir_certificado($1)
    $1 = inscripcion_id
```

**EL SP DE CERTIFICADO:**

```
🗂️ db/objetos-finales.sql:180 (SP sp_emitir_certificado)

PASO 1 — Validar inscripción y curso:
🔄 SELECT i.estado::text, c.permite_certificado, i.estudiante_id, c.id
    INTO v_estado, v_permite_cert, v_estudiante, v_curso_id
    FROM inscripciones i JOIN cursos c ON c.id = i.curso_id
    WHERE i.id = p_inscripcion_id
📋 ¿La inscripción existe? ✓
    ¿Estado = 'completado'? ✓
    ¿El curso permite certificado? ✓

PASO 2 — Validar que no esté duplicado:
🔄 SELECT 1 FROM certificados WHERE inscripcion_id = p_inscripcion_id
📋 No existe → OK ✓

PASO 3 — Generar código único:
🧠 v_codigo := 'CERT-' || upper(substr(replace(p_inscripcion_id::text, '-', ''), 1, 12))
📋 Ejemplo: 'CERT-A1B2C3D4E5F6'
    Toma el UUID de la inscripción, le quita los guiones, toma los primeros 12
    caracteres y los pone en mayúscula. Como el UUID es único, el código también.

PASO 4 — Insertar certificado:
🔄 INSERT INTO certificados (inscripcion_id, codigo_certificado, url_certificado)
    VALUES (p_inscripcion_id, v_codigo, 'https://edusphere.app/certificados/' || v_codigo)
📋 Nueva fila en tabla `certificados`

PASO 5 — Actualizar estados:
🔄 UPDATE inscripciones SET certificado_obtenido = true
    WHERE id = p_inscripcion_id
🔄 UPDATE estudiantes SET total_certificados = total_certificados + 1
    WHERE id = v_estudiante
📋 María ahora tiene total_certificados incrementado en 1
```

**En simple:** El certificado es una fila en la tabla `certificados` con un código único derivado del UUID de la inscripción. El SP valida que la inscripción esté completada y que el curso permita certificados antes de emitirlo.

---

<a name="flujo-4"></a>

## Flujo 4 — Entre bastidores: Lo que pasa sin que el usuario lo vea

---

### 📌 4.1 — El trigger silencioso

```
🗂️ db/cambios_railway.sql:12-24
🧠 CADA VEZ que alguien INSERTA o ACTUALIZA un curso, el trigger se dispara
    automáticamente. No hay código en el backend que lo llame — es la BD misma.

    BEFORE INSERT OR UPDATE ON cursos
    FOR EACH ROW
    EXECUTE FUNCTION sync_categoria_estado()

📋 El trigger garantiza que:
    cursos.categoria y cursos.estado SIEMPRE tengan el mismo valor.
    Sin este trigger, actualizar una columna y olvidar la otra causaría
    inconsistencias (ej. el catálogo mostraría un curso como 'publicado'
    pero el SP lo rechazaría como 'borrador').
```

---

### 📌 4.2 — Las vistas materializadas (datos pre-cocinados)

```
🗂️ db/vistas.sql:71 (vm_ingresos_mensuales)
🧠 Una vista materializada es como una foto instantánea de una consulta.
    En vez de re-ejecutar los JOINs y agregaciones cada vez, PostgreSQL
    guarda el resultado en disco.

    COMPARACIÓN:
    Vista normal:     cada consulta → recalcula todo → lento (2.9ms)
    Materializada:    cada consulta → lee resultado guardado → rápido (0.03ms)
                      Pero necesita REFRESH periódico para actualizarse.

    ESTRATEGIA: REFRESH MATERIALIZED VIEW vm_ingresos_mensuales
    Se ejecuta semanalmente (lunes a las 3 AM) porque los pagos completados
    son inmutables y no cambian minuto a minuto.
```

---

### 📌 4.3 — Los contadores desnormalizados

```
🗂️ db/objetos-finales.sql:175-176 (dentro del SP)
🧠 Cada vez que alguien se inscribe:
    UPDATE cursos      SET total_estudiantes = total_estudiantes + 1
    UPDATE estudiantes SET total_cursos      = total_cursos + 1

    ¿POR QUÉ?
    Sin esto, cada vez que cargamos "Mis Cursos" habría que hacer:
    SELECT COUNT(*) FROM inscripciones WHERE estudiante_id = ...
    
    Con 200 estudiantes y 696 inscripciones no es grave. Pero con 10,000
    estudiantes y 100,000 inscripciones, cada carga de página haría un
    COUNT sobre 100,000 filas. El contador desnormalizado lo convierte en
    una simple lectura de un número.
    
    COSTO/BENEFICIO:
    - Costo: 1 UPDATE extra al inscribir (operación poco frecuente)
    - Beneficio: lectura instantánea en cada carga de página (muy frecuente)
    
    Es el clásico trade-off: pagar en escritura para ahorrar en lectura.
```

---

### 📌 4.4 — La tabla de auditoría (append-only)

```
🗂️ db/cambios_railway.sql:165-173 y db/objetos-finales.sql:165-173
🧠 log_auditoria es una tabla ESPECIAL:
    - Solo recibe INSERTs (nunca UPDATEs ni DELETEs)
    - Cada operación crítica deja un registro INMUTABLE
    - El campo detalles_operacion es JSONB (semi-estructurado)
    - Tiene un índice GIN para búsquedas dentro del JSON

    ¿QUÉ SE REGISTRA?
    1. Cada inscripción (sp_inscribir_estudiante)
    2. Cada certificado emitido (sp_emitir_certificado)
    
    ¿PARA QUÉ SIRVE?
    - Trazabilidad: "¿quién inscribió a María en Figma?"
    - Auditoría: "¿cuántas inscripciones hubo en junio?"
    - Depuración: "¿por qué falló esta inscripción?"
    
    El índice GIN permite consultas como:
    SELECT * FROM log_auditoria
    WHERE detalles_operacion @> '{"curso_id": "45dd012d-..."}'
    — "dame todas las operaciones relacionadas con este curso"
```

---

### 📌 4.5 — MongoDB: progreso de lecciones y reseñas

```
🗂️ db/Mongo/seed_mongo.js
🧠 MongoDB almacena datos que NO necesitan ACID ni relaciones estrictas:
    - progreso_lecciones: 702 documentos, ~22,038 entries de progreso individual
    - resenas: 200 reseñas con 5 calificaciones cada una
    - logs_actividad: 37,994 eventos (TTL de 90 días — se autodestruyen)
    - cuestionarios_respuestas: 800 intentos
    - foros: 300 publicaciones (100 hilos + 200 respuestas)

    ¿POR QUÉ MONGO Y NO POSTGRES?
    - progreso: alto volumen de escritura (cada clic en "siguiente lección")
    - logs: semi-estructurados, TTL automático
    - reseñas: estructura flexible (5 calificaciones independientes)
    
    Los UUIDs de PostgreSQL se guardan como BinData en MongoDB para
    mantener la integridad referencial entre ambos motores.
```

---

## Resumen — Lo que tenés que recordar para la defensa

| # | Concepto | Dónde está | En una frase |
|---|----------|-----------|-------------|
| 1 | `sp_inscribir_estudiante` | `db/objetos-finales.sql:106` | Crea inscripción + pago + auditoría en 8 pasos atómicos |
| 2 | `sp_emitir_certificado` | `db/objetos-finales.sql:180` | Emite certificado validando completado y no duplicado |
| 3 | `calcular_comision` | `db/objetos-finales.sql:1` | Función escalar IMMUTABLE — Q100 × 30% = Q30 |
| 4 | `fn_ingresos_instructor` | `db/objetos-finales.sql` | Ingresos brutos/netos por instructor en rango de fechas |
| 5 | `fn_avance_estudiante` | `db/objetos-finales.sql:11` | Estructura del curso (módulos, lecciones) para RC-03 |
| 6 | Trigger sync | `db/cambios_railway.sql:12` | Mantiene `categoria` = `estado` siempre sincronizados |
| 7 | Vistas materializadas | `db/vistas.sql:71,86` | Datos pre-cocinados — 85x más rápido que recalcular |
| 8 | `log_auditoria` | Tabla en PostgreSQL | Append-only, JSONB con índice GIN — trazabilidad total |
| 9 | MongoDB | `db/Mongo/seed_mongo.js` | 38K logs, 22K progresos, 200 reseñas, 800 quizzes |
| 10 | Contadores desnormalizados | `db/objetos-finales.sql:175` | Pagar en escritura para ahorrar en lectura |
