/**
 * Dashboard Instructor — Cursos, ingresos, estadísticas.
 * Ruta: #/instructor
 */
import { state } from '../utils/state.js';
import { createEl } from '../utils/dom.js';
import { formatCurrency, formatNumber } from '../utils/formatters.js';
import { api } from '../api/client.js';
import { Navbar } from '../components/Navbar.js';
import { Footer } from '../components/Footer.js';
import { LoadingSpinner } from '../components/LoadingSpinner.js';
import { EmptyState } from '../components/EmptyState.js';

export async function dashboardInstructorController() {
  const app = document.getElementById('app');
  app.innerHTML = '';

  if (!state.isAuthenticated() || (!state.hasRole('instructor') && !state.hasRole('admin'))) {
    window.location.hash = '#/login';
    return;
  }

  const main = createEl('main');
  app.appendChild(Navbar());
  app.appendChild(main);
  app.appendChild(Footer());

  main.appendChild(LoadingSpinner({ text: 'Cargando dashboard...' }));

  try {
    // Buscar instructor por usuario_id
    const userId = localStorage.getItem('edusphere_user_id');
    let instructorId = userId; // fallback
    let earnings = {};

    try {
      const instructores = await api.get('/instructores');
      const list = Array.isArray(instructores) ? instructores : (instructores.data || []);
      const inst = list.find(i => i.usuario_id === userId);
      if (inst) {
        instructorId = inst.id;
        const ingData = await api.get(`/instructores/${instructorId}/ingresos`);
        earnings = ingData.data || ingData || {};
      }
    } catch (_) {}

    const cursosData = await api.get(`/cursos?instructor_id=${instructorId}`);
    const cursos = cursosData.cursos || cursosData.data || [];
    const user = state.user;

    const totalStudents = cursos.reduce((s, c) => s + (c.total_estudiantes || 0), 0);
    const avgRating = cursos.length > 0
      ? cursos.reduce((s, c) => s + (Number(c.calificacion_promedio) || 0), 0) / cursos.length
      : 0;

    main.innerHTML = `
      <div class="container" style="padding-block:var(--space-8)">
        <div class="flex items-center justify-between" style="margin-bottom:var(--space-8)">
          <div>
            <h1 style="font-size:var(--fs-display-md);margin-bottom:var(--space-2)">¡Bienvenido, ${user?.nombre || 'Instructor'}!</h1>
            <p class="text-muted" style="font-size:var(--fs-body-lg)">Esto es lo que está pasando con tus cursos este mes.</p>
          </div>
          <a href="#" class="btn btn-primary">
            <span class="material-symbols-rounded">add_circle</span> Crear Nuevo Curso
          </a>
        </div>

        <div class="grid grid-3" style="margin-bottom:var(--space-10)">
          <div class="card" style="padding:var(--space-6)">
            <span class="material-symbols-rounded text-primary" style="font-size:2rem">group</span>
            <p style="font-size:var(--fs-display-md);font-weight:var(--fw-extrabold);margin-top:var(--space-2)">${formatNumber(totalStudents)}</p>
            <p class="text-muted" style="font-size:var(--fs-body-sm)">Total Estudiantes</p>
          </div>
          <div class="card" style="padding:var(--space-6)">
            <span class="material-symbols-rounded text-accent" style="font-size:2rem">star</span>
            <p style="font-size:var(--fs-display-md);font-weight:var(--fw-extrabold);margin-top:var(--space-2)">${avgRating.toFixed(1)} / 5.0</p>
            <p class="text-muted" style="font-size:var(--fs-body-sm)">Calificación Promedio</p>
          </div>
          <div class="card" style="padding:var(--space-6)">
            <span class="material-symbols-rounded text-success" style="font-size:2rem">payments</span>
            <p style="font-size:var(--fs-display-md);font-weight:var(--fw-extrabold);margin-top:var(--space-2)">${formatCurrency(earnings.net_earnings || 0)}</p>
            <p class="text-muted" style="font-size:var(--fs-body-sm)">Ganancias Netas</p>
          </div>
        </div>

        <h2 style="font-size:var(--fs-headline-sm);margin-bottom:var(--space-6)">Mis Cursos</h2>
        <div id="instructor-courses">
          ${cursos.length === 0
            ? EmptyState({ icon: 'menu_book', title: 'Aún no tienes cursos', description: 'Crea tu primer curso para empezar a enseñar.', action: '<button class="btn btn-primary" style="margin-top:var(--space-4)">Crear Curso</button>' }).outerHTML
            : `
              <div style="display:flex;flex-direction:column;gap:var(--space-4)">
                ${cursos.map(c => `
                  <div class="card" style="overflow:visible">
                    <div class="flex items-center gap-6" style="padding:var(--space-5)">
                      <div class="course-card-image" style="width:120px;height:80px;border-radius:var(--radius-lg);overflow:hidden;flex-shrink:0">
                        <div class="course-card-image-placeholder"><span class="material-symbols-rounded">school</span></div>
                      </div>
                      <div style="flex:1">
                        <div class="flex items-center gap-3" style="margin-bottom:var(--space-2)">
                          <h4 style="font-size:var(--fs-body-md)">${c.titulo}</h4>
                          <span class="tag ${c.estado === 'publicado' ? 'tag-success' : c.estado === 'borrador' ? 'tag-secondary' : ''}">${c.estado === 'publicado' ? 'Publicado' : c.estado === 'borrador' ? 'Borrador' : 'Archivado'}</span>
                        </div>
                        <p class="text-muted" style="font-size:var(--fs-body-sm)">${c.categoria_nombre || c.categoria || ''} · ${formatNumber(c.total_estudiantes || 0)} Inscritos</p>
                      </div>
                      <a href="#/curso/${c.slug}" class="btn btn-ghost btn-sm">Gestionar</a>
                    </div>
                  </div>
                `).join('')}
              </div>
            `
          }
        </div>

        <div class="card" style="padding:var(--space-6);margin-top:var(--space-8)">
          <h3 style="font-size:var(--fs-body-md);margin-bottom:var(--space-4)">Resumen Financiero</h3>
          <div class="flex items-center justify-between" style="margin-bottom:var(--space-2)">
            <span class="text-muted">Ganancias Brutas</span>
            <span>${formatCurrency(earnings.gross_earnings || 0)}</span>
          </div>
          <div class="flex items-center justify-between" style="margin-bottom:var(--space-2)">
            <span class="text-muted">Comisión Plataforma (30%)</span>
            <span class="text-error">-${formatCurrency(earnings.platform_fee || 0)}</span>
          </div>
          <div style="border-top:1px solid var(--color-border);padding-top:var(--space-3);margin-top:var(--space-3)">
            <div class="flex items-center justify-between">
              <span class="fw-bold">Próximo Pago</span>
              <span style="font-size:var(--fs-headline-sm);font-weight:var(--fw-extrabold);color:var(--color-success)">${formatCurrency(earnings.net_earnings || 0)}</span>
            </div>
          </div>
        </div>
      </div>
    `;

  } catch (err) {
    main.innerHTML = `<div class="container section text-center"><h2>No se pudo cargar el dashboard</h2><p class="text-muted">Intenta de nuevo.</p><button class="btn btn-primary" style="margin-top:var(--space-6)" onclick="window.location.reload()">Reintentar</button></div>`;
  }
}
