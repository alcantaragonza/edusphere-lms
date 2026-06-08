/**
 * Visor de Lección.
 * Ruta: #/curso/:slug/aprender
 */
import { state } from '../utils/state.js';
import { createEl } from '../utils/dom.js';
import { getCourseModules, getModuleLessons, getLesson, getCatalog } from '../api/cursos.js';
import { saveProgress } from '../api/progreso.js';
import { getCourseBySlug } from '../utils/course-cache.js';
import { Navbar } from '../components/Navbar.js';
import { Footer } from '../components/Footer.js';
import { LessonAccordion } from '../components/LessonAccordion.js';
import { ProgressBar } from '../components/ProgressBar.js';
import { LoadingSpinner } from '../components/LoadingSpinner.js';
import { showToast } from '../components/Toast.js';

export async function leccionController(params) {
  const { slug } = params;
  const searchParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
  const lessonId = searchParams.get('lesson');

  const app = document.getElementById('app');
  app.innerHTML = '';

  if (!state.isAuthenticated()) { window.location.hash = '#/login'; return; }

  const cached = getCourseBySlug(slug);
  let cursoId = cached?.id || null;
  let courseTitle = cached?.titulo || cached?.curso_titulo || 'Curso';

  if (!cursoId) {
    try {
      const all = await getCatalog();
      const cursos = Array.isArray(all) ? all : (all.data || all.cursos || []);
      const found = cursos.find(c => c.slug === slug || c.curso_slug === slug);
      if (found) {
        cursoId = found.id || found.curso_id;
        courseTitle = found.titulo || found.curso_titulo || courseTitle;
      }
    } catch (_) {}
  }

  const main = createEl('main');
  app.appendChild(Navbar());

  main.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 360px;min-height:calc(100vh - 4rem)">
      <div style="background:var(--color-bg)">
        <div style="padding:var(--space-4);border-bottom:1px solid var(--color-border)">
          <div class="flex items-center gap-4">
            <a href="#/mis-cursos" class="btn btn-ghost btn-sm">
              <span class="material-symbols-rounded">arrow_back</span> Dashboard
            </a>
            <h2 id="lesson-course-title" style="font-size:var(--fs-body-lg)">${courseTitle}</h2>
          </div>
        </div>
        <div id="lesson-main-content" style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:400px">
          ${LoadingSpinner({ text: 'Cargando lección...' }).innerHTML}
        </div>
      </div>
      <div style="background:var(--color-surface);border-left:1px solid var(--color-border);overflow-y:auto">
        <div style="padding:var(--space-4);border-bottom:1px solid var(--color-border)">
          <h3 style="font-size:var(--fs-body-sm);text-transform:uppercase;letter-spacing:0.05em;color:var(--color-text-secondary)">Contenido del Curso</h3>
        </div>
        <div id="progress-overview" style="padding:var(--space-4);border-bottom:1px solid var(--color-border)"></div>
        <div id="lesson-sidebar-accordion" style="padding:var(--space-3)"></div>
      </div>
    </div>
  `;

  app.appendChild(main);
  app.appendChild(Footer());

  try {
    const modsData = await getCourseModules(cursoId);
    const allMods = Array.isArray(modsData) ? modsData : (modsData.data || []);
    const mods = allMods.filter(m => m.curso_id === cursoId);

    const allLecciones = await getModuleLessons(null).then(r => Array.isArray(r) ? r : (r.data || [])).catch(() => []);

    const modulesWithLessons = mods.map(m => ({
      ...m,
      lecciones: allLecciones.filter(l => l.modulo_id === m.id),
    }));

    const totalLessons = modulesWithLessons.reduce((s, m) => s + (m.lecciones?.length || 0), 0);
    const completedLessons = modulesWithLessons.reduce((s, m) => s + (m.lecciones?.filter(l => l.completada).length || 0), 0);
    const progressPercent = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

    main.querySelector('#progress-overview').appendChild(ProgressBar({ percent: progressPercent, label: 'Progreso', size: 'sm' }));
    main.querySelector('#progress-overview').insertAdjacentHTML('beforeend',
      `<p class="text-muted" style="font-size:var(--fs-caption);margin-top:var(--space-2)">${Math.round(progressPercent)}% Completado (${completedLessons}/${totalLessons} lecciones)</p>`);

    main.querySelector('#lesson-sidebar-accordion').appendChild(
      LessonAccordion({ modules: modulesWithLessons, activeLessonId: lessonId, onLessonClick: (lid) => {
        window.location.hash = `#/curso/${slug}/aprender?lesson=${lid}`;
        leccionController(params);
      }})
    );

    const contentArea = main.querySelector('#lesson-main-content');
    if (lessonId) {
      try {
        const lessonData = await getLesson(lessonId);
        const lesson = lessonData.data || lessonData;
        const tipo = lesson.tipo || 'video';
        let mediaHtml = '';

        if (tipo === 'video') {
          mediaHtml = `
            <div style="aspect-ratio:16/9;background:var(--color-bg);border-radius:var(--radius-xl);display:flex;align-items:center;justify-content:center;border:1px solid var(--color-border);margin-bottom:var(--space-8)">
              <div style="text-align:center">
                <span class="material-symbols-rounded" style="font-size:5rem;opacity:0.3">play_circle</span>
                <p class="text-muted" style="margin-top:var(--space-4)">Reproductor de Video</p>
                <p class="text-muted" style="font-size:var(--fs-caption)">${lesson.duracion_minutos || 0} min</p>
              </div>
            </div>`;
        } else if (tipo === 'cuestionario') {
          mediaHtml = `
            <div style="background:var(--color-surface);border-radius:var(--radius-xl);padding:var(--space-6);border:1px solid var(--color-border);margin-bottom:var(--space-8)">
              <div class="flex items-center gap-3" style="margin-bottom:var(--space-4)">
                <span class="material-symbols-rounded text-accent" style="font-size:2.5rem">quiz</span>
                <div>
                  <p class="fw-semibold">Cuestionario</p>
                  <p class="text-muted" style="font-size:var(--fs-body-sm)">Responde las preguntas para evaluar tu conocimiento</p>
                </div>
              </div>
              <button class="btn btn-accent btn-lg" style="width:100%" disabled>Iniciar Cuestionario (próximamente)</button>
            </div>`;
        } else if (tipo === 'descarga') {
          mediaHtml = `
            <div style="background:var(--color-surface);border-radius:var(--radius-xl);padding:var(--space-6);border:1px solid var(--color-border);margin-bottom:var(--space-8)">
              <div class="flex items-center gap-3">
                <span class="material-symbols-rounded text-primary" style="font-size:2.5rem">download</span>
                <div>
                  <p class="fw-semibold">Recurso Descargable</p>
                  <p class="text-muted" style="font-size:var(--fs-body-sm)">Material complementario de la lección</p>
                </div>
              </div>
            </div>`;
        }

        contentArea.innerHTML = `
          <div style="width:100%;max-width:960px;padding:var(--space-8)">
            ${mediaHtml}
            <div style="margin-bottom:var(--space-6)">
              <h1 style="font-size:var(--fs-headline-sm);margin-bottom:var(--space-4)">${lesson.titulo}</h1>
              ${tipo !== 'lectura' ? '' : `<span class="tag tag-primary" style="margin-bottom:var(--space-4)">Lectura</span>`}
              <button class="btn btn-accent" id="btn-mark-complete" ${lesson.completada ? 'disabled' : ''}>
                <span class="material-symbols-rounded">check_circle</span>
                ${lesson.completada ? 'Completada' : 'Marcar como completada'}
              </button>
            </div>
            <div style="border-top:1px solid var(--color-border);padding-top:var(--space-6)">
              ${lesson.contenido_texto || lesson.contenido || (tipo === 'lectura' ? '<p class="text-muted">Sin contenido.</p>' : '<p class="text-muted">Contenido de la lección próximamente.</p>')}
            </div>
          </div>`;

        const btnComplete = contentArea.querySelector('#btn-mark-complete');
        if (btnComplete && !lesson.completada) {
          btnComplete.addEventListener('click', async () => {
            try {
              await saveProgress({ leccion_id: lessonId, completada: true });
              btnComplete.disabled = true;
              btnComplete.innerHTML = '<span class="material-symbols-rounded">check_circle</span> Completada';
              showToast({ type: 'success', title: 'Progreso guardado', message: 'Leccion marcada como completada.' });
            } catch {
              showToast({ type: 'info', title: 'Progreso local', message: 'El progreso detallado requiere conexion a MongoDB.' });
            }
          });
        }
      } catch {
        contentArea.innerHTML = `<div style="text-align:center;padding:var(--space-12)"><p class="text-muted">No se pudo cargar la lección.</p></div>`;
      }
    } else {
      contentArea.innerHTML = `<div style="text-align:center;padding:var(--space-12)"><span class="material-symbols-rounded" style="font-size:4rem;opacity:0.3">menu_book</span><h2 style="margin-top:var(--space-4);font-size:var(--fs-headline-sm)">Selecciona una lección</h2><p class="text-muted" style="margin-top:var(--space-2)">Elige una lección de la barra lateral.</p></div>`;
    }
  } catch {
    main.innerHTML = `<div class="container section text-center"><h2>Curso no encontrado</h2><a href="#/mis-cursos" class="btn btn-primary" style="margin-top:var(--space-6)">Volver a Mis Cursos</a></div>`;
  }
}
