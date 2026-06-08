/**
 * Autenticación — Login / Registro contra backend real.
 * Ruta: #/login[?tab=register]
 */
import { state } from '../utils/state.js';
import { createEl } from '../utils/dom.js';
import { login, register } from '../api/auth.js';
import { Navbar } from '../components/Navbar.js';
import { Footer } from '../components/Footer.js';
import { showToast } from '../components/Toast.js';

export function authController() {
  const app = document.getElementById('app');
  app.innerHTML = '';

  const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
  const isRegister = params.get('tab') === 'register';

  const main = createEl('main');
  app.appendChild(Navbar());
  app.appendChild(main);
  app.appendChild(Footer());

  main.innerHTML = `
    <div class="container" style="max-width:480px;padding-block:var(--space-16)">
      <div class="card" style="padding:var(--space-8)">
        <div style="text-align:center;margin-bottom:var(--space-8)">
          <span class="material-symbols-rounded" style="font-size:3rem;background:var(--gradient-primary);-webkit-background-clip:text;-webkit-text-fill-color:transparent">school</span>
          <h1 style="font-size:var(--fs-headline-sm);margin-top:var(--space-4)">Bienvenido a EduSphere</h1>
          <p class="text-muted" style="margin-top:var(--space-2)">${isRegister ? 'Crea tu cuenta' : 'Inicia sesión para continuar'}</p>
        </div>

        <div class="flex" style="margin-bottom:var(--space-6);border-bottom:1px solid var(--color-border)">
          <button class="auth-tab ${!isRegister ? 'active' : ''}" data-tab="login"
            style="flex:1;padding:var(--space-3);text-align:center;font-weight:var(--fw-semibold);font-size:var(--fs-body-sm);background:none;border:none;color:${!isRegister ? 'var(--color-primary)' : 'var(--color-text-muted)'};border-bottom:2px solid ${!isRegister ? 'var(--color-primary)' : 'transparent'};cursor:pointer">
            Iniciar Sesión
          </button>
          <button class="auth-tab ${isRegister ? 'active' : ''}" data-tab="register"
            style="flex:1;padding:var(--space-3);text-align:center;font-weight:var(--fw-semibold);font-size:var(--fs-body-sm);background:none;border:none;color:${isRegister ? 'var(--color-primary)' : 'var(--color-text-muted)'};border-bottom:2px solid ${isRegister ? 'var(--color-primary)' : 'transparent'};cursor:pointer">
            Registrarse
          </button>
        </div>

        <div id="auth-forms">
          ${renderLoginForm()}
          ${renderRegisterForm()}
        </div>
        <div id="auth-error" class="hidden" style="margin-top:var(--space-4);padding:var(--space-3);background:var(--color-error-light);border-radius:var(--radius-md);color:var(--color-error);font-size:var(--fs-body-sm)"></div>
      </div>
    </div>
  `;

  const activeTab = isRegister ? 'register' : 'login';
  toggleForms(main, activeTab);

  main.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const t = tab.dataset.tab;
      toggleForms(main, t);
      window.location.hash = `#/login${t === 'register' ? '?tab=register' : ''}`;
    });
  });

  // Login
  const loginForm = main.querySelector('#login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = loginForm.querySelector('[name="email"]').value;
      const password = loginForm.querySelector('[name="password"]').value;

      try {
        const res = await login(email, password);
        state.user = res.usuario || res.user;
        state.cartCount = 0;
        showToast({ type: 'success', title: '¡Bienvenido!', message: `Sesión iniciada como ${state.user.nombre}` });
        redirectByRole(state.user.rol);
      } catch (err) {
        showError(main, err.data?.error || 'Credenciales inválidas');
      }
    });
  }

  // Register
  const registerForm = main.querySelector('#register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nombre = registerForm.querySelector('[name="nombre"]').value;
      const apellido = registerForm.querySelector('[name="apellido"]').value;
      const email = registerForm.querySelector('[name="email"]').value;
      const password = registerForm.querySelector('[name="password"]').value;
      const telefono = registerForm.querySelector('[name="telefono"]').value;
      const fecha_nacimiento = registerForm.querySelector('[name="fecha_nacimiento"]').value;
      const rol = registerForm.querySelector('[name="rol"]').value;

      try {
        const res = await register({ nombre, apellido, email, password, telefono, fecha_nacimiento, rol });
        state.user = res.usuario || res.user;
        state.cartCount = 0;
        showToast({ type: 'success', title: '¡Cuenta creada!', message: `Bienvenido, ${state.user.nombre}` });
        redirectByRole(state.user.rol);
      } catch (err) {
        showError(main, err.data?.error || 'Error al registrarse');
      }
    });
  }
}

function redirectByRole(rol) {
  window.location.hash = (rol === 'instructor' || rol === 'admin') ? '#/instructor' : '#/mis-cursos';
}

function toggleForms(main, tab) {
  const loginForm = main.querySelector('#login-form');
  const registerForm = main.querySelector('#register-form');
  if (!loginForm || !registerForm) return;

  if (tab === 'login') {
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
  } else {
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
  }

  main.querySelectorAll('.auth-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === tab);
    t.style.color = t.dataset.tab === tab ? 'var(--color-primary)' : 'var(--color-text-muted)';
    t.style.borderBottomColor = t.dataset.tab === tab ? 'var(--color-primary)' : 'transparent';
  });
}

function showError(main, msg) {
  const el = main.querySelector('#auth-error');
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 5000);
}

function renderLoginForm() {
  return `
    <form id="login-form" style="display:flex;flex-direction:column;gap:var(--space-4)">
      <div class="form-group">
        <label class="form-label">Correo Electrónico</label>
        <input type="email" name="email" class="form-input" placeholder="tu@correo.com" required>
      </div>
      <div class="form-group">
        <label class="form-label">Contraseña</label>
        <input type="password" name="password" class="form-input" placeholder="Tu contraseña" required minlength="6">
      </div>
      <button type="submit" class="btn btn-primary btn-lg" style="width:100%;margin-top:var(--space-2)">Iniciar Sesión</button>
    </form>
  `;
}

function renderRegisterForm() {
  return `
    <form id="register-form" class="hidden" style="display:flex;flex-direction:column;gap:var(--space-4)">
      <div class="form-group">
        <label class="form-label">Nombre</label>
        <input type="text" name="nombre" class="form-input" placeholder="Tu nombre" required>
      </div>
      <div class="form-group">
        <label class="form-label">Apellido</label>
        <input type="text" name="apellido" class="form-input" placeholder="Tu apellido">
      </div>
      <div class="form-group">
        <label class="form-label">Correo Electrónico</label>
        <input type="email" name="email" class="form-input" placeholder="tu@correo.com" required>
      </div>
      <div class="form-group">
        <label class="form-label">Contraseña</label>
        <input type="password" name="password" class="form-input" placeholder="Mín. 6 caracteres" required minlength="6">
      </div>
      <div class="grid grid-2" style="gap:var(--space-4)">
        <div class="form-group">
          <label class="form-label">Teléfono</label>
          <input type="tel" name="telefono" class="form-input" placeholder="+502 5555-0000">
        </div>
        <div class="form-group">
          <label class="form-label">Fecha de Nacimiento</label>
          <input type="date" name="fecha_nacimiento" class="form-input">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Rol</label>
        <select name="rol" class="form-input">
          <option value="estudiante">Estudiante</option>
          <option value="instructor">Instructor</option>
        </select>
      </div>
      <button type="submit" class="btn btn-accent btn-lg" style="width:100%;margin-top:var(--space-2)">Crear Cuenta</button>
    </form>
  `;
}
