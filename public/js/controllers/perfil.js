/**
 * Perfil de Usuario.
 * Ruta: #/perfil
 */
import { state } from '../utils/state.js';
import { createEl } from '../utils/dom.js';
import { Navbar } from '../components/Navbar.js';
import { Footer } from '../components/Footer.js';
import { showToast } from '../components/Toast.js';

export function perfilController() {
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

  const user = state.user;

  main.innerHTML = `
    <div class="container" style="padding-block:var(--space-8);max-width:600px">
      <h1 style="font-size:var(--fs-display-md);margin-bottom:var(--space-8)">Tu Perfil</h1>

      <div class="card" style="padding:var(--space-8)">
        <div class="flex items-center gap-6" style="margin-bottom:var(--space-8);padding-bottom:var(--space-6);border-bottom:1px solid var(--color-border)">
          <span class="navbar-avatar" style="width:4rem;height:4rem;font-size:1.5rem">
            ${(user?.nombre || 'U')[0].toUpperCase()}
          </span>
          <div>
            <h2 style="font-size:var(--fs-headline-sm)">${user?.nombre || 'Usuario'}</h2>
            <span class="tag tag-primary" style="margin-top:var(--space-1)">${user?.rol === 'instructor' ? 'Instructor' : 'Estudiante'}</span>
          </div>
        </div>

        <form id="profile-form" style="display:flex;flex-direction:column;gap:var(--space-4)">
          <div class="form-group">
            <label class="form-label">Nombre</label>
            <input type="text" name="nombre" class="form-input" value="${user?.nombre || ''}" required>
          </div>
          <div class="form-group">
            <label class="form-label">Correo Electrónico</label>
            <input type="email" name="email" class="form-input" value="${user?.email || ''}" disabled>
          </div>
          <div class="form-group">
            <label class="form-label">Rol</label>
            <input type="text" class="form-input" value="${user?.rol === 'instructor' ? 'Instructor' : 'Estudiante'}" disabled>
          </div>

          <button type="submit" class="btn btn-primary" style="margin-top:var(--space-4)">Guardar Cambios</button>
        </form>

        <div style="margin-top:var(--space-8);padding-top:var(--space-6);border-top:1px solid var(--color-border)">
          <button class="btn btn-ghost text-error" id="btn-logout" style="width:100%">
            <span class="material-symbols-rounded">logout</span> Cerrar Sesión
          </button>
        </div>
      </div>
    </div>
  `;

  const form = main.querySelector('#profile-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      showToast({ type: 'success', title: 'Guardado', message: 'Perfil actualizado correctamente.' });
    });
  }

  const btnLogout = main.querySelector('#btn-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      state.logout();
      window.location.hash = '#/';
    });
  }
}
