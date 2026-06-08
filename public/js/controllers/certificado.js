/**
 * Certificado — Vista de certificado + Emision (instructor).
 * Ruta: #/certificado/:id
 */
import { state } from '../utils/state.js';
import { createEl } from '../utils/dom.js';
import { getCertificate, emitCertificate } from '../api/certificados.js';
import { Navbar } from '../components/Navbar.js';
import { Footer } from '../components/Footer.js';
import { LoadingSpinner } from '../components/LoadingSpinner.js';
import { showToast } from '../components/Toast.js';

export async function certificadoController(params) {
  const { id } = params;
  const app = document.getElementById('app');
  app.innerHTML = '';

  if (!state.isAuthenticated()) {
    window.location.hash = '#/login';
    return;
  }

  const main = createEl('main');
  app.appendChild(Navbar());
  app.appendChild(main);
  app.appendChild(Footer());

  const esInstructor = state.hasRole('instructor') || state.hasRole('admin');

  if (id === 'emitir' && esInstructor) {
    renderEmitirForm(main);
    return;
  }

  main.appendChild(LoadingSpinner({ text: 'Cargando certificado...' }));

  try {
    const data = await getCertificate(id);
    const cert = data.data || data;

    main.innerHTML = `
      <div class="container" style="padding-block:var(--space-8);max-width:800px">
        <a href="#/mis-cursos" class="btn btn-ghost btn-sm" style="margin-bottom:var(--space-6)">
          <span class="material-symbols-rounded">arrow_back</span> Volver al Dashboard
        </a>

        <div style="border:2px solid var(--color-primary);border-radius:var(--radius-xl);padding:var(--space-12);text-align:center;background:var(--color-surface);box-shadow:var(--shadow-glow)">
          <span class="material-symbols-rounded" style="font-size:4rem;background:var(--gradient-primary);-webkit-background-clip:text;-webkit-text-fill-color:transparent">workspace_premium</span>

          <h1 style="font-size:var(--fs-display-md);margin:var(--space-6) 0 var(--space-4);font-family:var(--font-headline)">Certificado de Finalizacion</h1>

          <p style="font-size:var(--fs-body-lg);color:var(--color-text-secondary);margin-bottom:var(--space-2)">Se certifica que</p>

          <p style="font-size:var(--fs-headline-sm);font-weight:var(--fw-bold);margin-bottom:var(--space-2);color:var(--color-primary)">
            ${cert.estudiante_nombre || state.user?.nombre || 'Estudiante'}
          </p>

          <p style="color:var(--color-text-secondary);margin-bottom:var(--space-6)">
            ha completado exitosamente el curso
          </p>

          <h2 style="font-size:var(--fs-headline-sm);font-weight:var(--fw-bold);margin-bottom:var(--space-6)">
            ${cert.curso_titulo || 'Curso'}
          </h2>

          <div style="display:flex;justify-content:center;gap:var(--space-12);padding-top:var(--space-6);border-top:1px solid var(--color-border)">
            <div style="text-align:center">
              <p class="text-muted" style="font-size:var(--fs-caption)">Fecha de Emision</p>
              <p class="fw-semibold" style="font-size:var(--fs-body-sm)">${cert.fecha_emision || '—'}</p>
            </div>
            <div style="text-align:center">
              <p class="text-muted" style="font-size:var(--fs-caption)">ID del Certificado</p>
              <p class="fw-semibold" style="font-size:var(--fs-body-sm);font-family:monospace">${cert.codigo || cert.id || '—'}</p>
            </div>
            <div style="text-align:center">
              <p class="text-muted" style="font-size:var(--fs-caption)">Instructor</p>
              <p class="fw-semibold" style="font-size:var(--fs-body-sm)">${cert.instructor_nombre || 'EduSphere LMS'}</p>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-center gap-4" style="margin-top:var(--space-6)">
          <button class="btn btn-primary" onclick="window.print()">
            <span class="material-symbols-rounded">download</span> Descargar
          </button>
          <button class="btn btn-ghost" onclick="navigator.clipboard.writeText('${cert.codigo || id}')">
            <span class="material-symbols-rounded">share</span> Compartir
          </button>
        </div>
      </div>
    `;

  } catch {
    main.innerHTML = `
      <div class="container section text-center">
        <h2>Certificado no encontrado</h2>
        <a href="#/mis-cursos" class="btn btn-primary" style="margin-top:var(--space-6)">Volver a Mis Cursos</a>
      </div>`;
  }
}

function renderEmitirForm(main) {
  main.innerHTML = `
    <div class="container" style="padding-block:var(--space-8);max-width:480px">
      <a href="#/instructor" class="btn btn-ghost btn-sm" style="margin-bottom:var(--space-6)">
        <span class="material-symbols-rounded">arrow_back</span> Volver al Dashboard
      </a>
      <h1 style="font-size:var(--fs-display-md);margin-bottom:var(--space-8)">Emitir Certificado</h1>
      <div class="card" style="padding:var(--space-6)">
        <form id="emitir-cert-form" style="display:flex;flex-direction:column;gap:var(--space-4)">
          <div class="form-group">
            <label class="form-label">ID de Inscripcion</label>
            <input type="text" name="inscripcion_id" class="form-input" placeholder="UUID de la inscripcion" required>
          </div>
          <p class="text-muted" style="font-size:var(--fs-caption)">
            La inscripcion debe estar en estado 'completado' y el curso debe permitir certificado.
          </p>
          <button type="submit" class="btn btn-accent btn-lg" style="width:100%">
            <span class="material-symbols-rounded">workspace_premium</span> Emitir Certificado
          </button>
        </form>
      </div>
    </div>
  `;

  const form = main.querySelector('#emitir-cert-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const inscripcionId = form.querySelector('[name="inscripcion_id"]').value.trim();
    if (!inscripcionId) return;

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner spinner-sm"></span> Emitiendo...';

    try {
      await emitCertificate(inscripcionId);
      showToast({ type: 'success', title: 'Certificado emitido', message: 'El certificado se ha generado correctamente.' });
      window.location.hash = `#/certificado/${inscripcionId}`;
    } catch (err) {
      btn.disabled = false;
      btn.innerHTML = '<span class="material-symbols-rounded">workspace_premium</span> Emitir Certificado';
      showToast({ type: 'error', title: 'Error', message: err.data?.error || 'No se pudo emitir el certificado.' });
    }
  });
}
