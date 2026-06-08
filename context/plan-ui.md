# Plan de Trabajo — UI EduSphere LMS (MVP)

## Decisiones de arquitectura

| Decisión | Elección |
|----------|----------|
| Enfoque | SPA con hash-router (`#/ruta`) |
| Shell | Un solo `index.html` |
| Stack | HTML + CSS + JS vanilla (ES modules) |
| Servidor UI | Separado de la API (live-server, CORS habilitado) |
| Estilo | Variables CSS, sin preprocesadores |
| Roles | Estudiante + Instructor (redirect post-login según `rol`) |

## Estructura de archivos

```
public/
├── index.html                        # Shell SPA
├── css/
│   ├── main.css                      # Reset, variables, grid, utilidades
│   └── components/
│       ├── navbar.css
│       ├── course-card.css
│       ├── lesson-list.css
│       ├── stars.css
│       ├── modal.css
│       ├── toast.css
│       ├── progress.css
│       └── pagination.css
├── js/
│   ├── app.js                        # Boot: init router, estado global, auth check
│   ├── api/                          # === MODEL ===
│   │   ├── client.js                 # fetch wrapper (base URL API, headers, errores)
│   │   ├── auth.js                   # login, register, me
│   │   ├── cursos.js                 # catálogo, detalle, módulos/lecciones
│   │   ├── inscripciones.js          # inscribir (OC-01), mis cursos, avance (RC-03)
│   │   ├── carrito.js                # añadir, quitar, listar, total
│   │   ├── certificados.js           # emitir (OC-02), verificar
│   │   ├── progreso.js               # guardar progreso lección (MongoDB)
│   │   └── resenas.js                # crear, listar (MongoDB)
│   ├── controllers/                  # === CONTROLLER ===
│   │   ├── home.js                   # Landing / catálogo público
│   │   ├── curso-detalle.js          # Curso con módulos, lecciones, reseñas
│   │   ├── auth.js                   # Login + registro
│   │   ├── dashboard-estudiante.js   # Mis cursos con avance (RC-02, RC-03)
│   │   ├── dashboard-instructor.js   # Mis cursos creados, ingresos (RC-04)
│   │   ├── leccion.js                # Visor lección + marca progreso (MongoDB)
│   │   ├── carrito.js                # Gestión carrito
│   │   ├── checkout.js               # Flujo pago → OC-01
│   │   └── certificado.js            # Vista certificado emitido (OC-02)
│   ├── components/                   # === VIEW ===
│   │   ├── Navbar.js                 # Cambia según auth: links distintos por rol
│   │   ├── Footer.js
│   │   ├── CourseCard.js             # Reutilizado en catálogo, dashboard, carrito
│   │   ├── StarRating.js             # ⭐ display e input
│   │   ├── LessonAccordion.js        # Acordeón módulos → lecciones
│   │   ├── ProgressBar.js            # Barra de avance circular o lineal
│   │   ├── Modal.js                  # Modal genérico (confirmación, formularios)
│   │   ├── Toast.js                  # Notificaciones flotantes
│   │   ├── Pagination.js             # Paginación para catálogo
│   │   ├── LoadingSpinner.js         # Estado de carga
│   │   └── EmptyState.js             # "No tienes cursos aún"
│   └── utils/
│       ├── router.js                 # Hash router (#/catalogo, #/curso/:slug, etc.)
│       ├── dom.js                    # Helpers: qs, qsa, createEl, render
│       ├── state.js                  # Estado global: usuario, carrito count
│       └── formatters.js             # Fecha relativa, moneda, duración (min → h:m)
└── img/
    └── logo.svg
```

## Páginas / Vistas del SPA

| # | Ruta hash | Vista | Rol | Conexión BD |
|---|-----------|-------|-----|-------------|
| 1 | `#/` | Catálogo público (home) | Público | `v_catalogo_cursos` → RC-01 |
| 2 | `#/curso/:slug` | Detalle de curso | Público | cursos + módulos + lecciones + reseñas (Mongo) |
| 3 | `#/login` | Login / Registro | Público | `usuarios` |
| 4 | `#/mis-cursos` | Dashboard estudiante | Estudiante | `v_cursos_estudiante` → RC-02, `fn_avance_estudiante` → RC-03 |
| 5 | `#/curso/:slug/aprender` | Visor de lección | Estudiante | `lecciones` + `progreso_lecciones` (MongoDB) |
| 6 | `#/carrito` | Carrito de compras | Estudiante | `carrito_compras` |
| 7 | `#/checkout` | Pago → Inscripción | Estudiante | `sp_inscribir_estudiante` → OC-01 |
| 8 | `#/certificado/:id` | Certificado emitido | Estudiante | `certificados` → OC-02 |
| 9 | `#/instructor` | Dashboard instructor | Instructor | Cursos creados + `fn_ingresos_instructor` → RC-04 |
| 10 | `#/perfil` | Perfil de usuario | Ambos | `usuarios` + `estudiantes`/`instructores` |

## Redirección post-login

```
Login exitoso:
  rol = 'estudiante'  → #/mis-cursos
  rol = 'instructor'  → #/instructor
  rol = 'admin'       → #/instructor (mismo dashboard por ahora)
```

## Componentes reutilizables

| Componente | Páginas donde se usa |
|-----------|---------------------|
| `Navbar` | Todas (cambia links por rol + badge carrito count) |
| `Footer` | Todas |
| `CourseCard` | Catálogo, Mis cursos, Dashboard instructor, Carrito |
| `StarRating` | CourseCard, Detalle curso (reseñas) |
| `LessonAccordion` | Detalle curso, Visor lección |
| `ProgressBar` | Mis cursos, Visor lección |
| `Modal` | Carrito, Checkout, Login |
| `Toast` | Todas (feedback de acciones) |
| `Pagination` | Catálogo |
| `LoadingSpinner` | Todas |
| `EmptyState` | Mis cursos, Carrito, Dashboard instructor |

## Flujo principal del MVP (demo)

```
Catálogo → Detalle curso → Login → Carrito → Checkout (OC-01)
    → Mis cursos → Visor lección (progreso MongoDB)
    → Completar 100% → Emitir certificado (OC-02)
```

## Alcance MVP

### Sí incluye (10 vistas)
- Catálogo con filtros (categoría, nivel, precio, búsqueda) y paginación
- Detalle de curso (módulos, lecciones, instructor, reseñas)
- Login/Registro con redirección por rol
- Dashboard estudiante (avance por curso)
- Visor de lección (video placeholder, texto, cuestionario placeholder)
- Carrito + Checkout completo (flujo OC-01)
- Certificado (OC-02)
- Dashboard instructor básico (cursos + ingresos)
- Perfil de usuario

### No incluye en MVP
- Admin avanzado (reportes RC-05 a RC-11)
- Foros (fuera del alcance MVP)
- Notificaciones (fuera del alcance MVP)
- Wishlist (fuera del alcance MVP)

## Stack y setup

- **Servir UI**: `npx serve public/` o `live-server` en puerto distinto a la API
- **API**: Express en otro puerto (CORS habilitado)
- **Sin bundlers**: JS vanilla con ES modules (`type="module"`)
- **CSS**: Variables CSS para theming, sin preprocesadores

## Orden de implementación

1. `index.html` + `css/main.css` — Shell y estilos base
2. `js/utils/` — Router, DOM helpers, formateadores, estado global
3. `js/api/client.js` — Cliente HTTP base
4. Componentes base: `Navbar`, `Footer`, `LoadingSpinner`, `Toast`, `Modal`
5. `#/` Catálogo — `CourseCard`, `Pagination`, `StarRating`
6. `#/curso/:slug` — `LessonAccordion`
7. `#/login` — Auth controller + API
8. `#/mis-cursos` — `ProgressBar`, `EmptyState`
9. `#/curso/:slug/aprender` — Visor lección + progreso
10. `#/carrito` + `#/checkout` — Flujo compra
11. `#/certificado/:id` — Vista certificado
12. `#/instructor` — Dashboard instructor
13. `#/perfil` — Perfil
