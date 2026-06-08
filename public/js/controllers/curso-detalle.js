/**
 * Detalle de Curso — Vista dual: estudiante (inscribir) e instructor (gestionar).
 * Ruta: #/curso/:slug
 */
import { state } from '../utils/state.js';
import { createEl } from '../utils/dom.js';
import { formatPrice, formatNumber, slugify } from '../utils/formatters.js';
import { getCourseById, getCourseModules, getModuleLessons, getCatalog } from '../api/cursos.js';
import { getReviews } from '../api/resenas.js';
import { addToCart } from '../api/carrito.js';
import { enroll } from '../api/inscripciones.js';
import { api } from '../api/client.js';
import { getCourseBySlug } from '../utils/course-cache.js';
import { Navbar } from '../components/Navbar.js';
import { Footer } from '../components/Footer.js';
import { StarRatingDisplay } from '../components/StarRating.js';
import { LessonAccordion } from '../components/LessonAccordion.js';
import { LoadingSpinner } from '../components/LoadingSpinner.js';
import { Modal } from '../components/Modal.js';
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

  let cursoId = null;
  const cached = getCourseBySlug(slug);
  if (cached) {
    cursoId = cached.id;
  } else {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
    if (isUUID) {
      try {
        const byId = await getCourseById(slug);
        if (byId && (byId.id || (byId.data && byId.data.id))) {
          cursoId = byId.id || byId.data.id;
        }
      } catch (_) {}
    }
    if (!cursoId) {
      try {
        const res = await getCatalog();
        const all = Array.isArray(res) ? res : (res.data || res.cursos || []);
        const found = all.find(c => c.slug === slug);
        if (found) cursoId = found.id;
      } catch (__) {}
    }
  }

  if (!cursoId) {
    main.innerHTML = `<div class="container section text-center"><h2>Curso no encontrado</h2><a href="#/" class="btn btn-primary" style="margin-top:var(--space-6)">Explorar Cursos</a></div>`;
    return;
  }

  let cursoData = cached || null;

  if (!cursoData) {
    try {
      const res = await getCatalog();
      const all = Array.isArray(res) ? res : (res.data || res.cursos || []);
      cursoData = all.find(c => c.id === cursoId) || null;
    } catch (_) {}
  }

  if (!cursoData) {
    if (state.isAuthenticated()) {
      try {
        const courseRes = await getCourseById(cursoId);
        cursoData = courseRes.data || courseRes;
      } catch (_) {}
    }
  }

  if (!cursoData) {
    main.innerHTML = `<div class="container section text-center"><h2>Curso no encontrado</h2><a href="#/" class="btn btn-primary" style="margin-top:var(--space-6)">Explorar Cursos</a></div>`;
    return;
  }

  const c = { ...cursoData, estado: cursoData.estado || cursoData.categoria };

  let mods = [];
  let modulesWithLessons = [];

  if (state.isAuthenticated()) {
    try {
      const modsData = await getCourseModules(cursoId);
      const allMods = Array.isArray(modsData) ? modsData : (modsData.data || []);
      mods = allMods.filter(m => m.curso_id === cursoId);

      modulesWithLessons = await Promise.all(mods.map(async m => ({
        ...m,
        lecciones: Array.isArray(m.lecciones) ? m.lecciones : await getModuleLessons(m.id).then(r => {
          const all = Array.isArray(r) ? r : (r.data || []);
          return all.filter(l => l.modulo_id === m.id);
        }).catch(() => []),
      })));
    } catch (_) {}
  }

    // ¿Es el instructor dueño de este curso?
    const userId = localStorage.getItem('edusphere_user_id');
    let esInstructor = false;
    let instructorId = null;
    if (state.isAuthenticated() && (state.hasRole('instructor') || state.hasRole('admin'))) {
      try {
        const instructores = await api.get('/instructores');
        const list = Array.isArray(instructores) ? instructores : (instructores.data || []);
        const perfil = list.find(i => i.usuario_id === userId);
        if (perfil) {
          instructorId = perfil.id;
          esInstructor = (c.instructor_id === perfil.id);
        }
      } catch (_) {}
    }

    const totalLessons = modulesWithLessons.reduce((s, m) => s + (m.lecciones?.length || 0), 0);

    main.innerHTML = `
      <div class="container" style="padding-block:var(--space-8)">
        <nav style="margin-bottom:var(--space-6);font-size:var(--fs-body-sm)">
          <a href="#/" class="text-muted">Cursos</a>
          <span class="text-muted" style="margin:0 var(--space-2)">/</span>
          <span style="color:var(--color-text)">${c.titulo}</span>
        </nav>

        <div style="display:grid;grid-template-columns:1fr 380px;gap:var(--space-10);align-items:start">
          <div>
            <div class="flex items-center gap-3" style="margin-bottom:var(--space-4)">
              <h1 style="font-size:var(--fs-display-md)">${c.titulo}</h1>
              <span class="tag ${c.estado === 'publicado' ? 'tag-success' : 'tag-secondary'}">${c.estado === 'publicado' ? 'Publicado' : c.estado === 'borrador' ? 'Borrador' : c.estado || '—'}</span>
            </div>
            <p class="text-muted" style="font-size:var(--fs-body-lg);line-height:var(--lh-relaxed);margin-bottom:var(--space-6)">
              ${c.descripcion || 'Domina habilidades de nivel profesional con este curso integral.'}
            </p>

            <div class="flex items-center gap-6" style="margin-bottom:var(--space-6)">
              <span class="text-muted" style="font-size:var(--fs-body-sm)">
                <span class="material-symbols-rounded" style="font-size:1rem;vertical-align:middle">menu_book</span>
                ${mods.length} módulos · ${totalLessons} lecciones
              </span>
              <span class="text-muted" style="font-size:var(--fs-body-sm)">
                <span class="material-symbols-rounded" style="font-size:1rem;vertical-align:middle">schedule</span>
                ${c.duracion_horas || 0}h de contenido
              </span>
              <span class="text-muted" style="font-size:var(--fs-body-sm)">
                <span class="material-symbols-rounded" style="font-size:1rem;vertical-align:middle">group</span>
                ${formatNumber(c.total_estudiantes || 0)} inscritos
              </span>
            </div>

            <h2 style="font-size:var(--fs-headline-sm);margin-bottom:var(--space-4)">Contenido del Curso</h2>
            <div id="lesson-accordion"></div>

            ${esInstructor ? '' : `
            <h2 style="font-size:var(--fs-headline-sm);margin:var(--space-10) 0 var(--space-4)">Reseñas de Estudiantes</h2>
            <div id="reviews-section">
              <p class="text-muted">Aún no hay reseñas.</p>
            </div>
            `}
          </div>

          <div class="card" style="position:sticky;top:5rem">
            <div class="course-card-image" style="aspect-ratio:16/9">
              ${c.imagen_portada_url
                ? `<img src="${c.imagen_portada_url}" alt="${c.titulo}">`
                : `<div class="course-card-image-placeholder"><span class="material-symbols-rounded" style="font-size:4rem">play_circle</span></div>`
              }
            </div>
            <div class="card-body" style="display:flex;flex-direction:column;gap:var(--space-4)">
              ${esInstructor ? `
                <span class="tag tag-primary" style="align-self:flex-start">Eres el instructor</span>
                ${c.estado !== 'publicado' ? `
                  <button class="btn btn-accent btn-lg" id="btn-publicar" style="width:100%">
                    <span class="material-symbols-rounded">publish</span> Publicar Curso
                  </button>
                ` : `
                  <button class="btn btn-outline btn-lg" id="btn-despublicar" style="width:100%">
                    <span class="material-symbols-rounded">unpublished</span> Despublicar
                  </button>
                `}
                ${c.estado === 'archivado' ? `
                  <button class="btn btn-outline btn-lg" id="btn-reactivar" style="width:100%">
                    <span class="material-symbols-rounded">restore</span> Reactivar
                  </button>
                ` : ''}
                <button class="btn btn-primary btn-lg" id="btn-add-modulo" style="width:100%">
                  <span class="material-symbols-rounded">playlist_add</span> Agregar Módulo
                </button>
                <a href="#/instructor" class="btn btn-ghost btn-sm" style="width:100%;text-align:center">Volver al Dashboard</a>
              ` : `
                <div class="flex items-baseline gap-3">
                  <span style="font-size:var(--fs-display-md);font-weight:var(--fw-extrabold);color:var(--color-accent)">
                    ${formatPrice(c.precio || 0)}
                  </span>
                  ${c.precio_descuento && Number(c.precio_descuento) > 0 && Number(c.precio_descuento) < Number(c.precio)
                    ? `<span style="text-decoration:line-through;color:var(--color-text-muted)">${formatPrice(c.precio)}</span>
                       <span class="tag tag-accent">${Math.round((1 - Number(c.precio_descuento)/Number(c.precio))*100)}% DESC</span>`
                    : ''
                  }
                </div>
                ${state.isAuthenticated() && state.hasRole('estudiante') ? `
                  <button class="btn btn-accent btn-lg" id="btn-enroll" style="width:100%">Inscribirse Ahora</button>
                  <button class="btn btn-outline btn-lg" id="btn-cart" style="width:100%">
                    <span class="material-symbols-rounded">shopping_cart</span> Agregar al Carrito
                  </button>
                ` : `
                  <a href="#/login" class="btn btn-accent btn-lg" style="width:100%;text-decoration:none;display:flex;align-items:center;justify-content:center">
                    Inicia Sesión para Inscribirte
                  </a>
                `}
              `}

              <div style="border-top:1px solid var(--color-border);padding-top:var(--space-4)">
                <h4 class="fw-semibold" style="margin-bottom:var(--space-3);font-size:var(--fs-body-sm)">Incluye</h4>
                <ul style="display:flex;flex-direction:column;gap:var(--space-3);font-size:var(--fs-body-sm)">
                  <li class="flex items-center gap-2 text-muted">
                    <span class="material-symbols-rounded text-primary" style="font-size:1.1rem">video_library</span>
                    ${c.duracion_horas || '0'} horas de video
                  </li>
                  <li class="flex items-center gap-2 text-muted">
                    <span class="material-symbols-rounded text-primary" style="font-size:1.1rem">all_inclusive</span>
                    Acceso de por vida
                  </li>
                  <li class="flex items-center gap-2 text-muted">
                    <span class="material-symbols-rounded text-primary" style="font-size:1.1rem">workspace_premium</span>
                    ${c.permite_certificado ? 'Certificado de finalización' : 'Sin certificado'}
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Accordion con botones de gestión para instructor
    const accordionContainer = main.querySelector('#lesson-accordion');
    if (modulesWithLessons.length > 0) {
      accordionContainer.appendChild(renderInstructorAccordion(modulesWithLessons, slug, esInstructor, cursoId));
    } else {
      accordionContainer.innerHTML = '<p class="text-muted" style="padding:var(--space-6);text-align:center">Este curso aún no tiene módulos.</p>';
    }

    // Botón agregar módulo (instructor)
    const btnAddModulo = main.querySelector('#btn-add-modulo');
    if (btnAddModulo) {
      btnAddModulo.addEventListener('click', () => openAddModuloModal(cursoId, slug));
    }

    const btnPublicar = main.querySelector('#btn-publicar');
    if (btnPublicar) {
      btnPublicar.addEventListener('click', async () => {
        try {
          await api.patch(`/cursos/${cursoId}`, { categoria: 'publicado' });
          showToast({ type: 'success', title: 'Publicado', message: 'El curso ya es visible en el catálogo.' });
          window.location.reload();
        } catch (err) {
          showToast({ type: 'error', title: 'Error', message: err.data?.error || 'No se pudo publicar.' });
        }
      });
    }

    const btnDespublicar = main.querySelector('#btn-despublicar');
    if (btnDespublicar) {
      btnDespublicar.addEventListener('click', async () => {
        try {
          await api.patch(`/cursos/${cursoId}`, { categoria: 'borrador' });
          showToast({ type: 'success', title: 'Despublicado', message: 'El curso ya no aparece en el catálogo.' });
          window.location.reload();
        } catch (err) {
          showToast({ type: 'error', title: 'Error', message: err.data?.error || 'No se pudo despublicar.' });
        }
      });
    }

    const btnReactivar = main.querySelector('#btn-reactivar');
    if (btnReactivar) {
      btnReactivar.addEventListener('click', async () => {
        try {
          await api.patch(`/cursos/${cursoId}`, { categoria: 'borrador' });
          showToast({ type: 'success', title: 'Reactivado', message: 'El curso está en borrador nuevamente.' });
          window.location.reload();
        } catch (err) {
          showToast({ type: 'error', title: 'Error', message: err.data?.error || 'No se pudo reactivar.' });
        }
      });
    }

    // Botón carrito (estudiante)
    const btnCart = main.querySelector('#btn-cart');
    if (btnCart) {
      btnCart.addEventListener('click', async () => {
        try {
          await addToCart(cursoId);
          showToast({ type: 'success', title: 'Agregado', message: `${c.titulo} se agregó a tu carrito.` });
        } catch {
          showToast({ type: 'error', title: 'Error', message: 'No se pudo agregar.' });
        }
      });
    }

    const btnEnroll = main.querySelector('#btn-enroll');
    if (btnEnroll) {
      btnEnroll.addEventListener('click', async () => {
        try {
          btnEnroll.disabled = true;
          btnEnroll.textContent = 'Inscribiendo...';
          await enroll(cursoId);
          showToast({ type: 'success', title: 'Inscrito', message: `Te inscribiste a ${c.titulo}.` });
          window.location.hash = '#/mis-cursos';
        } catch (err) {
          btnEnroll.disabled = false;
          btnEnroll.textContent = 'Inscribirse Ahora';
          const msg = err.status === 501
            ? 'El sistema de inscripciones no está disponible aún.'
            : (err.data?.error || 'No se pudo completar la inscripción.');
          showToast({ type: 'error', title: 'Error', message: msg });
        }
      });
    }

    if (!esInstructor) {
      try {
        const reviewsData = await getReviews(cursoId);
        const reviews = Array.isArray(reviewsData) ? reviewsData : (reviewsData.data || []);
        const reviewsSection = main.querySelector('#reviews-section');
        if (reviewsSection && reviews.length > 0) {
          reviewsSection.innerHTML = reviews.map(r => `
            <div class="card" style="margin-bottom:var(--space-4);padding:var(--space-5)">
              <div class="flex items-center gap-3" style="margin-bottom:var(--space-3)">
                <span class="navbar-avatar" style="width:2.5rem;height:2.5rem;font-size:0.9rem">${(r.estudiante || 'E')[0].toUpperCase()}</span>
                <div>
                  <p class="fw-semibold" style="font-size:var(--fs-body-sm)">${r.estudiante || 'Estudiante'}</p>
                  <p class="text-muted" style="font-size:var(--fs-body-xs)">${r.fecha_resena ? new Date(r.fecha_resena).toLocaleDateString('es') : ''}</p>
                </div>
                ${typeof r.calificacion_promedio === 'number' ? StarRatingDisplay({ value: r.calificacion_promedio }).outerHTML : ''}
              </div>
              <p style="font-size:var(--fs-body-sm);line-height:var(--lh-relaxed)">${r.comentario || r.texto || ''}</p>
            </div>
          `).join('');
        }
      } catch (_) {}
    }

}

function renderInstructorAccordion(modules, slug, esInstructor, cursoId) {
  const container = createEl('div', { className: 'lesson-accordion' });

  modules.forEach((mod, idx) => {
    const moduleEl = createEl('div', { className: 'lesson-module' });
    const lecciones = mod.lecciones || [];
    const total = lecciones.length;

    moduleEl.innerHTML = `
      <button class="lesson-module-header">
        <div class="lesson-module-info">
          <span class="lesson-module-title">Módulo ${idx + 1}: ${mod.titulo}</span>
          <span class="lesson-module-meta">${total} lecciones · ${mod.duracion_total_min || 0} min</span>
        </div>
        <span class="lesson-module-icon material-symbols-rounded">expand_more</span>
      </button>
      <div class="lesson-module-body">
        <div class="lesson-list">
          ${lecciones.map(l => `
            <div class="lesson-item ${esInstructor ? 'clickable' : ''}" data-lesson-id="${l.id}" data-lesson-titulo="${l.titulo}" data-lesson-desc="${l.descripcion || ''}" data-lesson-contenido="${(l.contenido_texto || '').replace(/"/g, '&quot;')}" data-lesson-tipo="${l.tipo}" data-lesson-dur="${l.duracion_minutos || 0}">
              <span class="lesson-item-icon material-symbols-rounded">${l.tipo === 'video' ? 'play_circle' : l.tipo === 'cuestionario' ? 'quiz' : 'description'}</span>
              <span>${l.titulo}</span>
              <span class="lesson-item-duration">${l.duracion_minutos || 0}m</span>
            </div>
          `).join('')}
          ${esInstructor ? `
            <div class="lesson-item" style="color:var(--color-primary);cursor:pointer" data-add-lesson="${mod.id}" data-lesson-count="${total}">
              <span class="lesson-item-icon material-symbols-rounded">add_circle</span>
              <span>Agregar lección</span>
            </div>
          ` : ''}
        </div>
      </div>
    `;

    const header = moduleEl.querySelector('.lesson-module-header');
    const body = moduleEl.querySelector('.lesson-module-body');
    header.addEventListener('click', () => {
      body.classList.toggle('open');
      header.classList.toggle('active');
    });

    // Botón agregar lección
    const addLessonBtn = moduleEl.querySelector('[data-add-lesson]');
    if (addLessonBtn) {
      addLessonBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const count = parseInt(addLessonBtn.dataset.lessonCount) || 0;
        openAddLessonModal(addLessonBtn.dataset.addLesson, slug, count + 1);
      });
    }

    // Click en lección existente (instructor: editar, estudiante: ver)
    moduleEl.querySelectorAll('.lesson-item.clickable').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = item.dataset.lessonId;
        const titulo = item.dataset.lessonTitulo;
        const desc = item.dataset.lessonDesc;
        const contenido = item.dataset.lessonContenido;
        const tipo = item.dataset.lessonTipo;
        const dur = parseInt(item.dataset.lessonDur) || 0;
        openEditLessonModal(id, titulo, desc, contenido, tipo, dur, slug);
      });
    });

    container.appendChild(moduleEl);
  });

  return container;
}

async function openAddModuloModal(cursoId, slug) {
  let nextOrden = 1;
  try {
    const modsData = await getCourseModules(cursoId);
    const all = Array.isArray(modsData) ? modsData : (modsData.data || []);
    const cursoMods = all.filter(m => m.curso_id === cursoId);
    const maxOrden = cursoMods.reduce((max, m) => Math.max(max, m.orden || 0), 0);
    nextOrden = maxOrden + 1;
  } catch (_) {}

  const formHtml = `
    <form id="form-add-modulo" style="display:flex;flex-direction:column;gap:var(--space-4)">
      <div class="form-group">
        <label class="form-label">Título *</label>
        <input type="text" name="titulo" class="form-input" placeholder="Nombre del módulo" required>
      </div>
      <div class="form-group">
        <label class="form-label">Descripción</label>
        <textarea name="descripcion" class="form-input" rows="2" placeholder="Descripción del módulo" style="resize:vertical"></textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Duración (min)</label>
        <input type="number" name="duracion_total_min" class="form-input" value="0" min="0">
      </div>
    </form>
  `;

  Modal({
    title: 'Agregar Módulo',
    content: formHtml,
    footer: `
      <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
      <button class="btn btn-primary" id="btn-submit-modulo">Crear Módulo</button>
    `,
  });

  document.querySelector('#btn-submit-modulo').addEventListener('click', async () => {
    const form = document.querySelector('#form-add-modulo');
    if (!form.reportValidity()) return;
    const fd = new FormData(form);
    const data = Object.fromEntries(fd.entries());

    try {
      await api.post('/modulos', {
        curso_id: cursoId,
        titulo: data.titulo,
        descripcion: data.descripcion || '',
        duracion_total_min: parseInt(data.duracion_total_min) || 0,
        es_gratuito: false,
        orden: nextOrden,
      });
      document.querySelector('.modal-overlay').remove();
      showToast({ type: 'success', title: 'Módulo creado' });
      window.location.hash = `#/curso/${slug}`;
      cursoDetalleController({ slug });
    } catch (err) {
      showToast({ type: 'error', title: 'Error', message: err.data?.error || err.message });
    }
  });
}

async function openAddLessonModal(moduloId, slug, nextOrden = 1) {
  const formHtml = `
    <form id="form-add-leccion" style="display:flex;flex-direction:column;gap:var(--space-4)">
      <div class="form-group">
        <label class="form-label">Título *</label>
        <input type="text" name="titulo" class="form-input" placeholder="Nombre de la lección" required>
      </div>
      <div class="form-group">
        <label class="form-label">Descripción</label>
        <textarea name="descripcion" class="form-input" rows="2" placeholder="Descripción breve" style="resize:vertical"></textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Contenido</label>
        <textarea name="contenido_texto" class="form-input" rows="6" placeholder="Escribe el contenido de la lección..." style="resize:vertical"></textarea>
      </div>
      <div class="grid grid-2" style="gap:var(--space-4)">
        <div class="form-group">
          <label class="form-label">Tipo</label>
          <select name="tipo" class="form-input">
            <option value="video">Video</option>
            <option value="lectura">Lectura</option>
            <option value="cuestionario">Cuestionario</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Duración (min)</label>
          <input type="number" name="duracion_minutos" class="form-input" value="10" min="1">
        </div>
      </div>
    </form>
  `;

  Modal({
    title: 'Agregar Lección',
    content: formHtml,
    size: 'lg',
    footer: `
      <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
      <button class="btn btn-primary" id="btn-submit-leccion">Crear Lección</button>
    `,
  });

  document.querySelector('#btn-submit-leccion').addEventListener('click', async () => {
    const form = document.querySelector('#form-add-leccion');
    if (!form.reportValidity()) return;
    const fd = new FormData(form);
    const data = Object.fromEntries(fd.entries());

    try {
      await api.post('/lecciones', {
        modulo_id: moduloId,
        tipo: data.tipo,
        titulo: data.titulo,
        descripcion: data.descripcion || '',
        contenido_url: '',
        contenido_texto: data.contenido_texto || null,
        duracion_minutos: parseInt(data.duracion_minutos) || 10,
        orden: nextOrden,
        permite_descarga: false,
      });
      document.querySelector('.modal-overlay').remove();
      showToast({ type: 'success', title: 'Lección creada' });
      window.location.hash = `#/curso/${slug}`;
      cursoDetalleController({ slug });
    } catch (err) {
      showToast({ type: 'error', title: 'Error', message: err.data?.error || err.message });
    }
  });
}

async function openEditLessonModal(id, titulo, desc, contenido, tipo, dur, slug) {
  const escapedTitulo = titulo.replace(/"/g, '&quot;');
  const escapedDesc = (desc || '').replace(/"/g, '&quot;');
  const escapedCont = (contenido || '').replace(/"/g, '&quot;');

  const formHtml = `
    <form id="form-edit-leccion" style="display:flex;flex-direction:column;gap:var(--space-4)">
      <div class="form-group">
        <label class="form-label">Título</label>
        <input type="text" name="titulo" class="form-input" value="${escapedTitulo}" required>
      </div>
      <div class="form-group">
        <label class="form-label">Descripción</label>
        <textarea name="descripcion" class="form-input" rows="2" style="resize:vertical">${escapedDesc}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Contenido</label>
        <textarea name="contenido_texto" class="form-input" rows="8" style="resize:vertical">${escapedCont}</textarea>
      </div>
      <div class="grid grid-2" style="gap:var(--space-4)">
        <div class="form-group">
          <label class="form-label">Tipo</label>
          <select name="tipo" class="form-input">
            <option value="video" ${tipo === 'video' ? 'selected' : ''}>Video</option>
            <option value="lectura" ${tipo === 'lectura' ? 'selected' : ''}>Lectura</option>
            <option value="cuestionario" ${tipo === 'cuestionario' ? 'selected' : ''}>Cuestionario</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Duración (min)</label>
          <input type="number" name="duracion_minutos" class="form-input" value="${dur}" min="1">
        </div>
      </div>
    </form>
  `;

  Modal({
    title: titulo,
    content: formHtml,
    size: 'lg',
    footer: `
      <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
      <button class="btn btn-primary" id="btn-save-leccion">Guardar Cambios</button>
    `,
  });

  document.querySelector('#btn-save-leccion').addEventListener('click', async () => {
    const form = document.querySelector('#form-edit-leccion');
    if (!form.reportValidity()) return;
    const fd = new FormData(form);
    const data = Object.fromEntries(fd.entries());

    try {
      await api.patch(`/lecciones/${id}`, {
        titulo: data.titulo,
        descripcion: data.descripcion || '',
        contenido_texto: data.contenido_texto || null,
        tipo: data.tipo,
        duracion_minutos: parseInt(data.duracion_minutos) || dur,
      });
      document.querySelector('.modal-overlay').remove();
      showToast({ type: 'success', title: 'Lección actualizada' });
      window.location.hash = `#/curso/${slug}`;
      cursoDetalleController({ slug });
    } catch (err) {
      showToast({ type: 'error', title: 'Error', message: err.data?.error || err.message });
    }
  });
}
