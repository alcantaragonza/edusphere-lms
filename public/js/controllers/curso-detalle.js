/**
 * Detalle de Curso — Por slug (busca ID desde caché).
 * Ruta: #/curso/:slug
 */
import { state } from '../utils/state.js';
import { createEl } from '../utils/dom.js';
import { formatPrice, formatNumber } from '../utils/formatters.js';
import { getCourseById, getCourseModules, getModuleLessons } from '../api/cursos.js';
import { getReviews } from '../api/resenas.js';
import { addToCart } from '../api/carrito.js';
import { getCourseBySlug } from '../utils/course-cache.js';
import { Navbar } from '../components/Navbar.js';
import { Footer } from '../components/Footer.js';
import { StarRatingDisplay } from '../components/StarRating.js';
import { LessonAccordion } from '../components/LessonAccordion.js';
import { LoadingSpinner } from '../components/LoadingSpinner.js';
import { showToast } from '../components/Toast.js';

export async function cursoDetalleController(params) {
  const { slug } = params;
  const app = document.getElementById('app');
  app.innerHTML = '';

  const main = createEl('main');
  app.appendChild(Navbar());
  app.appendChild(main);
  app.appendChild(Footer());

  main.appendChild(LoadingSpinner({ text: 'Cargando curso...' }));

  // Buscar ID desde caché
  const cached = getCourseBySlug(slug);
  if (!cached) {
    main.innerHTML = `<div class="container section text-center"><h2>Curso no encontrado</h2><a href="#/" class="btn btn-primary" style="margin-top:var(--space-6)">Explorar Cursos</a></div>`;
    return;
  }

  try {
    const courseRes = await getCourseById(cached.id);
    const c = courseRes.data || courseRes;
    const modsData = await getCourseModules(cached.id);
    const mods = Array.isArray(modsData) ? modsData : (modsData.data || []);

    // Fetch lessons for each module
    const modulesWithLessons = await Promise.all(mods.map(async m => ({
      ...m,
      lecciones: Array.isArray(m.lecciones) ? m.lecciones : await getModuleLessons(m.id).then(r => Array.isArray(r) ? r : (r.data || [])).catch(() => []),
    })));

    // Reviews
    let res = [];
    try { const revData = await getReviews(cached.id); res = revData.resenas || revData.data || (Array.isArray(revData) ? revData : []); } catch (_) {}

    main.innerHTML = `
      <div class="container" style="padding-block:var(--space-8)">
        <nav style="margin-bottom:var(--space-6);font-size:var(--fs-body-sm)">
          <a href="#/" class="text-muted">Cursos</a>
          <span class="text-muted" style="margin:0 var(--space-2)">/</span>
          <span style="color:var(--color-text)">${c.titulo}</span>
        </nav>

        <div style="display:grid;grid-template-columns:1fr 380px;gap:var(--space-10);align-items:start">
          <div>
            <h1 style="font-size:var(--fs-display-md);margin-bottom:var(--space-4)">${c.titulo}</h1>
            <p class="text-muted" style="font-size:var(--fs-body-lg);line-height:var(--lh-relaxed);margin-bottom:var(--space-6)">
              ${c.descripcion || 'Domina habilidades de nivel profesional con este curso integral.'}
            </p>

            <div class="flex items-center gap-6" style="margin-bottom:var(--space-8)">
              ${c.calificacion_promedio ? StarRatingDisplay(Number(c.calificacion_promedio), c.total_resenas) : ''}
              <span class="text-muted" style="font-size:var(--fs-body-sm)">
                <span class="material-symbols-rounded" style="font-size:1rem;vertical-align:middle">group</span>
                ${formatNumber(c.total_estudiantes || 0)} inscritos
              </span>
            </div>

            <div class="flex items-center gap-4" style="margin-bottom:var(--space-8);padding:var(--space-4);background:var(--color-surface);border-radius:var(--radius-lg);border:1px solid var(--color-border)">
              <span class="navbar-avatar" style="width:3rem;height:3rem;font-size:1.25rem">${(c.instructor_nombre || 'I')[0].toUpperCase()}</span>
              <div>
                <p class="fw-semibold">${c.instructor_nombre || 'Instructor'}</p>
                <p class="text-muted" style="font-size:var(--fs-body-sm)">Instructor del curso</p>
              </div>
            </div>

            <h2 style="font-size:var(--fs-headline-sm);margin-bottom:var(--space-4)">Contenido del Curso</h2>
            <div id="lesson-accordion"></div>

            <h2 style="font-size:var(--fs-headline-sm);margin:var(--space-10) 0 var(--space-4)">Reseñas de Estudiantes</h2>
            <div id="reviews-section">
              ${res.length === 0
                ? '<p class="text-muted">Aún no hay reseñas. ¡Sé el primero!</p>'
                : res.slice(0, 5).map(r => `
                  <div style="padding:var(--space-4);border-bottom:1px solid var(--color-border)">
                    <div class="flex items-center gap-3" style="margin-bottom:var(--space-2)">
                      <span class="navbar-avatar" style="width:2rem;height:2rem;font-size:0.75rem">${(r.usuario_nombre || 'U')[0].toUpperCase()}</span>
                      <span class="fw-semibold" style="font-size:var(--fs-body-sm)">${r.usuario_nombre || 'Estudiante'}</span>
                    </div>
                    ${StarRatingDisplay(Number(r.calificacion))}
                    <p style="margin-top:var(--space-2);font-size:var(--fs-body-sm);color:var(--color-text-secondary)">${r.comentario}</p>
                  </div>
                `).join('')
              }
            </div>
          </div>

          <div class="card" style="position:sticky;top:5rem">
            <div class="course-card-image" style="aspect-ratio:16/9">
              ${c.imagen_portada_url
                ? `<img src="${c.imagen_portada_url}" alt="${c.titulo}">`
                : `<div class="course-card-image-placeholder"><span class="material-symbols-rounded" style="font-size:4rem">play_circle</span></div>`
              }
            </div>
            <div class="card-body" style="display:flex;flex-direction:column;gap:var(--space-4)">
              <div class="flex items-baseline gap-3">
                <span style="font-size:var(--fs-display-md);font-weight:var(--fw-extrabold);color:var(--color-accent)">
                  ${formatPrice(c.precio || 0)}
                </span>
                ${c.precio_descuento && c.precio_descuento < c.precio
                  ? `<span style="text-decoration:line-through;color:var(--color-text-muted)">${formatPrice(c.precio)}</span>
                     <span class="tag tag-accent">${Math.round((1 - c.precio_descuento/c.precio)*100)}% DESC</span>`
                  : ''
                }
              </div>

              ${state.isAuthenticated() && state.hasRole('estudiante')
                ? `
                  <button class="btn btn-accent btn-lg" style="width:100%">Inscribirse Ahora</button>
                  <button class="btn btn-outline btn-lg" id="btn-cart" style="width:100%">
                    <span class="material-symbols-rounded">shopping_cart</span> Agregar al Carrito
                  </button>
                `
                : `
                  <a href="#/login" class="btn btn-accent btn-lg" style="width:100%;text-decoration:none;display:flex;align-items:center;justify-content:center">
                    Inicia Sesión para Inscribirte
                  </a>
                `
              }

              <div style="border-top:1px solid var(--color-border);padding-top:var(--space-4)">
                <h4 class="fw-semibold" style="margin-bottom:var(--space-3);font-size:var(--fs-body-sm)">Incluye</h4>
                <ul style="display:flex;flex-direction:column;gap:var(--space-3);font-size:var(--fs-body-sm)">
                  <li class="flex items-center gap-2 text-muted">
                    <span class="material-symbols-rounded text-primary" style="font-size:1.1rem">video_library</span>
                    ${c.duracion_horas || '24'} horas de video bajo demanda
                  </li>
                  <li class="flex items-center gap-2 text-muted">
                    <span class="material-symbols-rounded text-primary" style="font-size:1.1rem">description</span>
                    Ejercicios prácticos
                  </li>
                  <li class="flex items-center gap-2 text-muted">
                    <span class="material-symbols-rounded text-primary" style="font-size:1.1rem">all_inclusive</span>
                    Acceso de por vida
                  </li>
                  <li class="flex items-center gap-2 text-muted">
                    <span class="material-symbols-rounded text-primary" style="font-size:1.1rem">workspace_premium</span>
                    Certificado de finalización
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    const accordionContainer = main.querySelector('#lesson-accordion');
    if (modulesWithLessons.length > 0) {
      accordionContainer.appendChild(LessonAccordion({
        modules: modulesWithLessons,
        onLessonClick: (lessonId) => {
          window.location.hash = `#/curso/${slug}/aprender?lesson=${lessonId}`;
        }
      }));
    } else {
      accordionContainer.innerHTML = '<p class="text-muted">Contenido del curso próximamente.</p>';
    }

    const btnCart = main.querySelector('#btn-cart');
    if (btnCart) {
      btnCart.addEventListener('click', async () => {
        try {
          await addToCart(cached.id);
          showToast({ type: 'success', title: 'Agregado al carrito', message: `${c.titulo} se agregó a tu carrito.` });
        } catch {
          showToast({ type: 'error', title: 'Error', message: 'No se pudo agregar al carrito.' });
        }
      });
    }

  } catch (err) {
    main.innerHTML = `<div class="container section text-center"><h2>Error al cargar el curso</h2><p class="text-muted">${err.message}</p><a href="#/" class="btn btn-primary" style="margin-top:var(--space-6)">Explorar Cursos</a></div>`;
  }
}
