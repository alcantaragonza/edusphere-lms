/**
 * Visor de Lección — Reproductor + progreso.
 * Ruta: #/curso/:slug/aprender
 */
import { state } from '../utils/state.js';
import { createEl } from '../utils/dom.js';
import { getCourseBySlug, getCourseModules, getLesson } from '../api/cursos.js';
import { saveProgress } from '../api/progreso.js';
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

  if (!state.isAuthenticated()) {
    window.location.hash = '#/login';
    return;
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
            <h2 id="lesson-course-title" style="font-size:var(--fs-body-lg)">Cargando...</h2>
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
    const courseData = await getCourseBySlug(slug);
    const course = courseData.data || courseData;
    const modulesData = await getCourseModules(slug);
    const modules = modulesData.data || modulesData || [];

    main.querySelector('#lesson-course-title').textContent = course.titulo;

    const totalLessons = modules.reduce((s, m) => s + (m.lecciones?.length || 0), 0);
    const completedLessons = modules.reduce((s, m) => s + (m.lecciones?.filter(l => l.completada).length || 0), 0);
    const progressPercent = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

    main.querySelector('#progress-overview').appendChild(
      ProgressBar({ percent: progressPercent, label: 'Progreso', size: 'sm' })
    );
    main.querySelector('#progress-overview').insertAdjacentHTML('beforeend',
      `<p class="text-muted" style="font-size:var(--fs-caption);margin-top:var(--space-2)">${Math.round(progressPercent)}% Completado (${completedLessons}/${totalLessons} lecciones)</p>`
    );

    main.querySelector('#lesson-sidebar-accordion').appendChild(
      LessonAccordion({
        modules,
        activeLessonId: lessonId,
        onLessonClick: (lid) => {
          window.location.hash = `#/curso/${slug}/aprender?lesson=${lid}`;
          leccionController(params);
        }
      })
    );

    const contentArea = main.querySelector('#lesson-main-content');
    if (lessonId) {
      try {
        const lessonData = await getLesson(slug, lessonId);
        const lesson = lessonData.data || lessonData;

        contentArea.innerHTML = `
          <div style="width:100%;max-width:960px;padding:var(--space-8)">
            ${lesson.tipo === 'video' || !lesson.tipo ? `
              <div style="aspect-ratio:16/9;background:var(--color-bg);border-radius:var(--radius-xl);display:flex;align-items:center;justify-content:center;border:1px solid var(--color-border);margin-bottom:var(--space-8)">
                <div style="text-align:center">
                  <span class="material-symbols-rounded" style="font-size:5rem;opacity:0.3">play_circle</span>
                  <p class="text-muted" style="margin-top:var(--space-4)">Reproductor de Video</p>
                  <p class="text-muted" style="font-size:var(--fs-caption)">${lesson.duracion_minutos || 0} min</p>
                </div>
              </div>
            ` : ''}

            <div style="margin-bottom:var(--space-6)">
              <p class="text-muted" style="font-size:var(--fs-body-sm);margin-bottom:var(--space-2)">
                Módulo ${lesson.modulo_orden || '1'}.${lesson.orden || '1'}
              </p>
              <h1 style="font-size:var(--fs-headline-sm);margin-bottom:var(--space-6)">${lesson.titulo}</h1>

              <button class="btn btn-accent" id="btn-mark-complete" ${lesson.completada ? 'disabled' : ''}>
                <span class="material-symbols-rounded">check_circle</span>
                ${lesson.completada ? 'Completada' : 'Marcar como completada'}
              </button>
            </div>

            <div style="border-top:1px solid var(--color-border);padding-top:var(--space-6)">
              ${lesson.contenido ? `
                <div style="margin-bottom:var(--space-6);line-height:var(--lh-relaxed);color:var(--color-text-secondary)">
                  ${lesson.contenido}
                </div>
              ` : `
                <p class="text-muted">Contenido de la lección próximamente.</p>
              `}
            </div>
          </div>
        `;

        const btnComplete = contentArea.querySelector('#btn-mark-complete');
        if (btnComplete && !lesson.completada) {
          btnComplete.addEventListener('click', async () => {
            try {
              await saveProgress(lessonId, { completada: true });
              btnComplete.disabled = true;
              btnComplete.innerHTML = '<span class="material-symbols-rounded">check_circle</span> Completada';
              showToast({ type: 'success', title: '¡Lección completada!', message: 'Tu progreso ha sido guardado.' });
            } catch {
              showToast({ type: 'error', title: 'Error', message: 'No se pudo guardar el progreso.' });
            }
          });
        }
      } catch {
        contentArea.innerHTML = `
          <div style="text-align:center;padding:var(--space-12)">
            <span class="material-symbols-rounded" style="font-size:3rem;color:var(--color-text-muted)">error</span>
            <p class="text-muted" style="margin-top:var(--space-4)">No se pudo cargar la lección.</p>
          </div>`;
      }
    } else {
      contentArea.innerHTML = `
        <div style="text-align:center;padding:var(--space-12)">
          <span class="material-symbols-rounded" style="font-size:4rem;opacity:0.3">menu_book</span>
          <h2 style="margin-top:var(--space-4);font-size:var(--fs-headline-sm)">Selecciona una lección</h2>
          <p class="text-muted" style="margin-top:var(--space-2)">Elige una lección de la barra lateral para comenzar.</p>
        </div>`;
    }
  } catch {
    main.innerHTML = `
      <div class="container section text-center">
        <h2>Curso no encontrado</h2>
        <a href="#/mis-cursos" class="btn btn-primary" style="margin-top:var(--space-6)">Volver a Mis Cursos</a>
      </div>`;
  }
}
