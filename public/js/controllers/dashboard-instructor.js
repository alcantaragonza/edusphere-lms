/**
 * Dashboard Instructor — Cursos, ingresos, estadísticas.
 * Ruta: #/instructor
 */
import { state } from '../utils/state.js';
import { createEl } from '../utils/dom.js';
import { formatCurrency, formatNumber, slugify } from '../utils/formatters.js';
import { api } from '../api/client.js';
import { Navbar } from '../components/Navbar.js';
import { Footer } from '../components/Footer.js';
import { LoadingSpinner } from '../components/LoadingSpinner.js';
import { EmptyState } from '../components/EmptyState.js';
import { Modal } from '../components/Modal.js';
import { showToast } from '../components/Toast.js';

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

  const userId = localStorage.getItem('edusphere_user_id');
  const user = state.user;
  let instructorId = null;
  let earnings = {};
  let perfilInstructor = null;

  try {
    const instructores = await api.get('/instructores');
    const list = Array.isArray(instructores) ? instructores : (instructores.data || []);
    perfilInstructor = list.find(i => i.usuario_id === userId);
    if (perfilInstructor) {
      instructorId = perfilInstructor.id;
      try {
        const hoy = new Date();
        const desde = new Date(hoy.getFullYear() - 1, hoy.getMonth(), 1).toISOString().split('T')[0];
        const hasta = hoy.toISOString().split('T')[0];
        const ingData = await api.get(`/instructores/${instructorId}/ingresos?desde=${desde}&hasta=${hasta}`);
        const rows = Array.isArray(ingData) ? ingData : (ingData.data || []);
        if (rows.length > 0) {
          const total = rows.reduce((acc, r) => {
            acc.gross += Number(r.ingresos_brutos || r.monto_bruto || r.total_bruto || 0);
            acc.net += Number(r.ingresos_netos || r.monto_neto || r.total_neto || 0);
            acc.fee += Number(r.comision || r.plataforma || 0);
            return acc;
          }, { gross: 0, net: 0, fee: 0 });
          earnings = {
            net_earnings: total.net || total.gross * 0.7,
            gross_earnings: total.gross,
            platform_fee: total.fee || total.gross * 0.3,
          };
        }
      } catch (_) {}
    }
  } catch (_) {}

  let cursos = [];
  if (instructorId) {
    try {
      const cursosData = await api.get('/cursos');
      const all = Array.isArray(cursosData) ? cursosData : (cursosData.data || cursosData.cursos || []);
      cursos = all.filter(c => c.instructor_id === instructorId);
    } catch (_) {}
  }

  const totalStudents = cursos.reduce((s, c) => s + (c.total_estudiantes || 0), 0);
  const avgRating = cursos.length > 0
    ? cursos.reduce((s, c) => s + (Number(c.calificacion_promedio) || 0), 0) / cursos.length
    : 0;

  const puedeCrear = !!instructorId;

  main.innerHTML = `
    <div class="container" style="padding-block:var(--space-8)">
      <div class="flex items-center justify-between" style="margin-bottom:var(--space-8)">
        <div>
          <h1 style="font-size:var(--fs-display-md);margin-bottom:var(--space-2)">¡Bienvenido, ${user?.nombre || 'Instructor'}!</h1>
          <p class="text-muted" style="font-size:var(--fs-body-lg)">Esto es lo que está pasando con tus cursos este mes.</p>
        </div>
        <button class="btn btn-primary" id="btn-crear-curso" ${!puedeCrear ? 'disabled' : ''}>
          <span class="material-symbols-rounded">add_circle</span> Crear Nuevo Curso
        </button>
      </div>

      ${!puedeCrear ? `
        <div style="padding:var(--space-4);background:var(--color-warning-light);border-radius:var(--radius-lg);border:1px solid var(--color-warning);margin-bottom:var(--space-6);font-size:var(--fs-body-sm);color:var(--color-warning)">
          <span class="material-symbols-rounded" style="vertical-align:middle;margin-right:var(--space-2)">info</span>
          Tu perfil de instructor aún no ha sido configurado. Un administrador debe crearlo para que puedas publicar cursos.
        </div>
      ` : ''}

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
          ? EmptyState({ icon: 'menu_book', title: 'Aún no tienes cursos', description: puedeCrear ? 'Crea tu primer curso para empezar a enseñar.' : 'Necesitas que un admin configure tu perfil de instructor.' }).outerHTML
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
                        <span class="tag ${c.estado === 'publicado' ? 'tag-success' : c.estado === 'borrador' ? 'tag-secondary' : ''}">${c.estado === 'publicado' ? 'Publicado' : c.estado === 'borrador' ? 'Borrador' : c.estado || '—'}</span>
                      </div>
                      <p class="text-muted" style="font-size:var(--fs-body-sm)">${formatNumber(c.total_estudiantes || 0)} Inscritos</p>
                    </div>
                    <a href="#/curso/${c.slug}" class="btn btn-ghost btn-sm">Gestionar</a>
                  </div>
                </div>
              `).join('')}
            </div>
          `
        }
      </div>

      ${puedeCrear ? `
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
      ` : ''}
    </div>
  `;

  if (puedeCrear) {
    main.querySelector('#btn-crear-curso').addEventListener('click', () => openCreateCourseModal(instructorId));
  }
}

async function openCreateCourseModal(instructorId) {
  if (!instructorId || isNaN(Number(instructorId))) {
    showToast({ type: 'error', title: 'Perfil no configurado', message: 'Un administrador debe crear tu perfil de instructor.' });
    return;
  }

  let categorias = [];
  try {
    const res = await api.get('/categorias');
    categorias = Array.isArray(res) ? res : (res.data || []);
  } catch (_) {}

  const formHtml = `
    <form id="form-crear-curso" style="display:flex;flex-direction:column;gap:var(--space-4)">
      <div class="form-group">
        <label class="form-label">Título *</label>
        <input type="text" name="titulo" class="form-input" placeholder="Nombre del curso" required>
      </div>
      <div class="form-group">
        <label class="form-label">Slug</label>
        <input type="text" name="slug" class="form-input" placeholder="nombre-del-curso">
      </div>
      <div class="form-group">
        <label class="form-label">Descripción *</label>
        <textarea name="descripcion" class="form-input" rows="3" placeholder="Describe tu curso..." required style="resize:vertical"></textarea>
      </div>
      <div class="grid grid-2" style="gap:var(--space-4)">
        <div class="form-group">
          <label class="form-label">Categoría *</label>
          <select name="categoria_id" class="form-input" required>
            <option value="">Selecciona una categoría</option>
            ${categorias.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Nivel</label>
          <select name="nivel" class="form-input">
            <option value="principiante">Principiante</option>
            <option value="intermedio">Intermedio</option>
            <option value="avanzado">Avanzado</option>
          </select>
        </div>
      </div>
      <div class="grid grid-2" style="gap:var(--space-4)">
        <div class="form-group">
          <label class="form-label">Precio (Q)</label>
          <input type="number" name="precio" class="form-input" placeholder="0.00" step="0.01" min="0" value="0">
        </div>
        <div class="form-group">
          <label class="form-label">Precio Descuento (Q)</label>
          <input type="number" name="precio_descuento" class="form-input" placeholder="0.00" step="0.01" min="0">
        </div>
      </div>
      <div class="grid grid-2" style="gap:var(--space-4)">
        <div class="form-group">
          <label class="form-label">Duración (horas)</label>
          <input type="number" name="duracion_horas" class="form-input" placeholder="0" step="0.5" min="0" value="0">
        </div>
        <div class="form-group">
          <label class="form-label">Idioma</label>
          <select name="idioma" class="form-input">
            <option value="es">Español</option>
            <option value="en">English</option>
          </select>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <input type="checkbox" name="permite_certificado" id="chk-cert" checked style="accent-color:var(--color-primary)">
        <label for="chk-cert" style="font-size:var(--fs-body-sm);color:var(--color-text-secondary)">Permite certificado</label>
      </div>
    </form>
  `;

  Modal({
    title: 'Crear Nuevo Curso',
    content: formHtml,
    size: 'lg',
    footer: `
      <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
      <button class="btn btn-accent" id="btn-submit-curso">Crear Curso</button>
    `,
  });

  const tituloInput = document.querySelector('#form-crear-curso [name="titulo"]');
  const slugInput = document.querySelector('#form-crear-curso [name="slug"]');
  tituloInput.addEventListener('input', () => {
    if (!slugInput.dataset.manual) slugInput.value = slugify(tituloInput.value);
  });
  slugInput.addEventListener('input', () => { slugInput.dataset.manual = 'true'; });

  document.querySelector('#btn-submit-curso').addEventListener('click', async () => {
    const form = document.querySelector('#form-crear-curso');
    if (!form.reportValidity()) return;

    const fd = new FormData(form);
    const data = Object.fromEntries(fd.entries());

    const body = {
      instructor_id: parseInt(instructorId),
      categoria_id: parseInt(data.categoria_id),
      estado: 'publicado',
      nivel: data.nivel || 'principiante',
      slug: data.slug || slugify(data.titulo),
      titulo: data.titulo,
      descripcion: data.descripcion,
      idioma: data.idioma || 'es',
      imagen_portada_url: '',
      precio: parseFloat(data.precio) || 0,
      precio_descuento: data.precio_descuento ? parseFloat(data.precio_descuento) : null,
      duracion_horas: parseFloat(data.duracion_horas) || 0,
      permite_certificado: data.permite_certificado === 'on',
      fecha_publicacion: new Date().toISOString(),
    };

    try {
      await api.post('/cursos', body);
      document.querySelector('.modal-overlay').remove();
      showToast({ type: 'success', title: '¡Curso creado!', message: body.titulo });
      dashboardInstructorController();
    } catch (err) {
      showToast({ type: 'error', title: 'Error', message: err.data?.error || err.message });
    }
  });
}
