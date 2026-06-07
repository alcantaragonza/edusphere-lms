/**
 * Navbar — role-aware navigation.
 */
import { state } from '../utils/state.js';
import { createEl } from '../utils/dom.js';

let cleanupFns = [];

export function Navbar() {
  // Clean up previous listeners to avoid leaks
  cleanupFns.forEach(fn => fn());
  cleanupFns = [];

  const user = state.user;
  const cartCount = state.cartCount;

  const nav = createEl('nav', { className: 'navbar' });
  nav.innerHTML = `
    <div class="navbar-inner">
      <a href="#/" class="navbar-brand">
        <span class="navbar-brand-icon material-symbols-rounded">school</span>
        <span>EduSphere</span>
      </a>

      <button class="navbar-mobile-toggle" aria-label="Menú">
        <span class="material-symbols-rounded">menu</span>
      </button>

      <div class="navbar-links" id="navbar-links">
        <a href="#/" class="navbar-link" data-link="catalog">Explorar</a>
        ${user
          ? user.rol === 'estudiante'
            ? `<a href="#/mis-cursos" class="navbar-link" data-link="my-courses">Mis Cursos</a>`
            : `<a href="#/instructor" class="navbar-link" data-link="instructor">Dashboard</a>`
          : ''
        }
      </div>

      <div class="navbar-actions">
        ${user
          ? `
            <a href="#/carrito" class="navbar-cart-btn" aria-label="Carrito">
              <span class="material-symbols-rounded">shopping_cart</span>
              ${cartCount > 0 ? `<span class="badge navbar-cart-badge">${cartCount}</span>` : ''}
            </a>
            <div class="navbar-user-btn" role="button" tabindex="0">
              <span class="navbar-avatar">${(user.nombre || 'U')[0].toUpperCase()}</span>
              <a href="#/perfil" style="color:inherit;text-decoration:none;font-size:0.875rem">${user.nombre || 'Usuario'}</a>
            </div>
          `
          : `
            <a href="#/login" class="btn btn-outline btn-sm">Ingresar</a>
            <a href="#/login?tab=register" class="btn btn-primary btn-sm">Registrarse</a>
          `
        }
      </div>
    </div>
  `;

  // Mobile menu toggle
  const toggle = nav.querySelector('.navbar-mobile-toggle');
  const links = nav.querySelector('#navbar-links');
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      links.classList.toggle('open');
    });
  }

  updateActiveLink(nav);

  // Listen for state changes with cleanup
  cleanupFns.push(
    state.on('user', () => {
      const newNav = Navbar();
      nav.replaceWith(newNav);
    })
  );

  cleanupFns.push(
    state.on('cartCount', () => {
      const badge = nav.querySelector('.navbar-cart-badge');
      if (state.cartCount > 0) {
        if (badge) badge.textContent = state.cartCount;
        else {
          const cartBtn = nav.querySelector('.navbar-cart-btn');
          if (cartBtn) {
            const b = createEl('span', { className: 'badge navbar-cart-badge' }, String(state.cartCount));
            cartBtn.appendChild(b);
          }
        }
      } else if (badge) {
        badge.remove();
      }
    })
  );

  return nav;
}

function updateActiveLink(nav) {
  const hash = window.location.hash;
  const links = nav.querySelectorAll('.navbar-link');
  links.forEach(link => {
    link.classList.remove('active');
    if (hash.startsWith(link.getAttribute('href'))) {
      link.classList.add('active');
    }
  });
}
