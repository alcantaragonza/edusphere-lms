/**
 * Dashboard Estudiante — Mis cursos, progreso, logros.
 * Ruta: #/mis-cursos
 */
import { state } from '../utils/state.js';
import { createEl } from '../utils/dom.js';
import { formatNumber } from '../utils/formatters.js';
import { getMyCourses } from '../api/inscripciones.js';
import { cacheCourses } from '../utils/course-cache.js';
import { Navbar } from '../components/Navbar.js';
import { Footer } from '../components/Footer.js';
import { ProgressBar } from '../components/ProgressBar.js';
import { EmptyState } from '../components/EmptyState.js';
import { LoadingSpinner } from '../components/LoadingSpinner.js';

export async function dashboardEstudianteController() {
  const app = document.getElementById('app');
  app.innerHTML = '';

  if (!state.isAuthenticated() || !state.hasRole('estudiante')) {
    window.location.hash = '#/login';
    return;
  }

  const main = createEl('main');
  app.appendChild(Navbar());
  app.appendChild(main);
  app.appendChild(Footer());

  main.appendChild(LoadingSpinner({ text: 'Cargando dashboard...' }));

  try {
    const cursosData = await getMyCourses().catch(() => []);
    const cursos = (Array.isArray(cursosData) ? cursosData : (cursosData?.cursos || cursosData?.data || [])).map(c => ({
      ...c,
      titulo: c.curso_titulo || c.titulo,
      slug: c.curso_slug || c.slug,
      id: c.curso_id || c.id,
      imagen_url: c.imagen_portada_url || c.imagen_url,
    }));
    cacheCourses(cursos);

    const certificados = cursos
      .filter(c => c.certificado_obtenido)
      .map(c => ({
        id: c.inscripcion_id,
        curso_titulo: c.titulo,
        fecha_emision: c.fecha_inscripcion,
      }));
    const user = state.user;

    const totalHours = cursos.reduce((s, c) => s + (c.horas_completadas || 0), 0);

    main.innerHTML = `
      <div class="container" style="padding-block:var(--space-8)">
        <h1 style="font-size:var(--fs-display-md);margin-bottom:var(--space-2)">¡Bienvenido, ${user?.nombre || 'Estudiante'}!</h1>
        <p class="text-muted" style="font-size:var(--fs-body-lg);margin-bottom:var(--space-8)">Estás progresando muy bien. ¡Sigue así!</p>

        <div class="grid grid-3" style="margin-bottom:var(--space-10)">
          <div class="card" style="padding:var(--space-6)">
            <span class="material-symbols-rounded text-primary" style="font-size:2rem">schedule</span>
            <p style="font-size:var(--fs-display-md);font-weight:var(--fw-extrabold);margin-top:var(--space-2)">${totalHours}</p>
            <p class="text-muted" style="font-size:var(--fs-body-sm)">Horas de aprendizaje</p>
          </div>
          <div class="card" style="padding:var(--space-6)">
            <span class="material-symbols-rounded text-primary" style="font-size:2rem">menu_book</span>
            <p style="font-size:var(--fs-display-md);font-weight:var(--fw-extrabold);margin-top:var(--space-2)">${cursos.length}</p>
            <p class="text-muted" style="font-size:var(--fs-body-sm)">Cursos en progreso</p>
          </div>
          <div class="card" style="padding:var(--space-6)">
            <span class="material-symbols-rounded text-accent" style="font-size:2rem">workspace_premium</span>
            <p style="font-size:var(--fs-display-md);font-weight:var(--fw-extrabold);margin-top:var(--space-2)">${certificados.length}</p>
            <p class="text-muted" style="font-size:var(--fs-body-sm)">Certificados obtenidos</p>
          </div>
        </div>

        <div class="flex items-center justify-between" style="margin-bottom:var(--space-6)">
          <h2 style="font-size:var(--fs-headline-sm)">Mis Cursos</h2>
          <a href="#/" class="btn btn-ghost btn-sm">Ver Todos <span class="material-symbols-rounded" style="font-size:1rem">arrow_forward</span></a>
        </div>

        <div id="my-courses-grid" class="grid grid-3"></div>
        <div id="my-courses-empty"></div>

        ${certificados.length > 0 ? `
          <h2 style="font-size:var(--fs-headline-sm);margin:var(--space-10) 0 var(--space-6)">Certificados</h2>
          <div class="grid grid-3" id="certificates-grid">
            ${certificados.map(cert => `
              <div class="card" style="padding:var(--space-5)">
                <span class="material-symbols-rounded text-accent" style="font-size:2.5rem">workspace_premium</span>
                <h4 style="margin-top:var(--space-3);font-size:var(--fs-body-md)">${cert.curso_titulo || 'Certificado'}</h4>
                <p class="text-muted" style="font-size:var(--fs-caption);margin-top:var(--space-1)">Emitido ${cert.fecha_emision || ''}</p>
                <a href="#/certificado/${cert.id}" class="btn btn-outline btn-sm" style="margin-top:var(--space-4);width:100%">
                  <span class="material-symbols-rounded" style="font-size:1rem">download</span> Ver
                </a>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <div style="text-align:center;margin-top:var(--space-16);padding:var(--space-10);background:var(--color-surface);border-radius:var(--radius-xl);border:1px solid var(--color-border)">
          <h3 style="font-size:var(--fs-headline-sm);margin-bottom:var(--space-3)">¿Listo para más?</h3>
          <p class="text-muted" style="margin-bottom:var(--space-6)">Obtén 20% de descuento en tu próxima certificación.</p>
          <a href="#/" class="btn btn-accent btn-lg">Explorar Cursos</a>
        </div>
      </div>
    `;

    const grid = main.querySelector('#my-courses-grid');
    const empty = main.querySelector('#my-courses-empty');

    if (cursos.length === 0) {
      grid.style.display = 'none';
      empty.appendChild(EmptyState({
        icon: 'school',
        title: 'Aún no tienes cursos',
        description: 'Comienza explorando nuestro catálogo de cursos.',
        action: '<a href="#/" class="btn btn-primary" style="margin-top:var(--space-4)">Explorar Cursos</a>'
      }));
    } else {
      cursos.forEach(c => {
        const completado = c.estado_inscripcion === 'completado';
        const totalLecciones = c.total_lecciones || 0;
        const progressPct = completado ? 100 : (c.certificado_obtenido ? 100 : 0);

        const wrapper = createEl('div');
        wrapper.innerHTML = `
          <div class="card" style="overflow:visible">
            <div class="course-card-image">
              ${c.imagen_url
                ? `<img src="${c.imagen_url}" alt="${c.titulo}" loading="lazy">`
                : `<div class="course-card-image-placeholder"><span class="material-symbols-rounded">school</span></div>`
              }
            </div>
            <div style="padding:var(--space-4)">
              <a href="#/curso/${c.slug}" style="text-decoration:none;color:inherit">
                <h4 style="font-size:var(--fs-body-md);font-weight:var(--fw-semibold);margin-bottom:var(--space-3)">${c.titulo}</h4>
              </a>
              <div style="margin-bottom:var(--space-3)"></div>
            </div>
            <div style="padding:0 var(--space-4) var(--space-4);display:flex;flex-direction:column;gap:var(--space-2)">
              ${c.certificado_obtenido ? `
                <span class="tag tag-success" style="width:100%;text-align:center;padding:var(--space-2)">
                  <span class="material-symbols-rounded" style="font-size:1rem;vertical-align:middle">verified</span> Certificado obtenido
                </span>
              ` : completado ? `
                <span class="tag tag-accent" style="width:100%;text-align:center;padding:var(--space-2)">
                  <span class="material-symbols-rounded" style="font-size:1rem;vertical-align:middle">hourglass_top</span> Completado — Certificado pendiente
                </span>
              ` : ''}
              <a href="#/curso/${c.slug}/aprender" class="btn btn-primary btn-sm" style="width:100%">
                ${completado ? 'Repasar' : 'Continuar Aprendiendo'}
              </a>
              ${totalLecciones > 0 ? `
                <div style="font-size:var(--fs-caption);color:var(--color-text-muted);text-align:center">
                  ${c.total_modulos || 0} módulos · ${totalLecciones} lecciones
                </div>
              ` : ''}
            </div>
          </div>
        `;

        const progressEl = wrapper.querySelector('.card > div:nth-child(2) > div');
        progressEl.appendChild(ProgressBar({
          percent: progressPct,
          label: `${progressPct}% completado · ${totalLecciones} lecciones`,
          size: 'sm',
        }));

        grid.appendChild(wrapper.firstElementChild);
      });
    }

  } catch (err) {
    main.innerHTML = `
      <div class="container section text-center">
        <h2>No se pudo cargar el dashboard</h2>
        <p class="text-muted">Intenta de nuevo más tarde.</p>
        <button class="btn btn-primary" style="margin-top:var(--space-6)" onclick="window.location.reload()">Reintentar</button>
      </div>`;
  }
}
