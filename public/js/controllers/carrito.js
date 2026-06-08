/**
 * Carrito de Compras.
 * Ruta: #/carrito
 */
import { state } from '../utils/state.js';
import { createEl } from '../utils/dom.js';
import { formatPrice } from '../utils/formatters.js';
import { getCart, removeFromCart } from '../api/carrito.js';
import { Navbar } from '../components/Navbar.js';
import { Footer } from '../components/Footer.js';
import { EmptyState } from '../components/EmptyState.js';
import { LoadingSpinner } from '../components/LoadingSpinner.js';
import { showToast } from '../components/Toast.js';

export async function carritoController() {
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

  main.appendChild(LoadingSpinner({ text: 'Cargando carrito...' }));

  try {
    const data = await getCart().catch(() => ({ items: [], total: 0 }));
    const items = data.items || data.data || [];
    const total = data.total || 0;

    main.innerHTML = `
      <div class="container" style="padding-block:var(--space-8);max-width:900px">
        <h1 style="font-size:var(--fs-display-md);margin-bottom:var(--space-8)">Carrito de Compras</h1>

        <div id="cart-items">
          ${items.length === 0
            ? EmptyState({
                icon: 'shopping_cart',
                title: 'Tu carrito está vacío',
                description: 'Agrega cursos para comenzar a aprender.',
                action: '<a href="#/" class="btn btn-primary" style="margin-top:var(--space-4)">Explorar Cursos</a>'
              }).outerHTML
            : `
              <div style="display:flex;flex-direction:column;gap:var(--space-4);margin-bottom:var(--space-8)">
                ${items.map(item => `
                  <div class="card" style="overflow:visible" data-item-id="${item.id}">
                    <div class="flex items-center gap-6" style="padding:var(--space-4)">
                      <div class="course-card-image" style="width:120px;height:80px;border-radius:var(--radius-lg);overflow:hidden;flex-shrink:0">
                        <div class="course-card-image-placeholder"><span class="material-symbols-rounded">school</span></div>
                      </div>
                      <div style="flex:1">
                        <a href="#/curso/${item.slug}" style="text-decoration:none;color:inherit">
                          <h4 style="font-size:var(--fs-body-md);font-weight:var(--fw-semibold)">${item.titulo}</h4>
                        </a>
                        <p class="text-muted" style="font-size:var(--fs-body-sm);margin-top:var(--space-1)">Por ${item.instructor || 'Instructor'}</p>
                      </div>
                      <div style="text-align:right">
                        <p style="font-weight:var(--fw-bold);font-size:var(--fs-body-lg);color:var(--color-accent)">${formatPrice(item.precio)}</p>
                        <button class="btn-remove text-error" style="font-size:var(--fs-body-sm);margin-top:var(--space-1);background:none;border:none;cursor:pointer">
                          Quitar
                        </button>
                      </div>
                    </div>
                  </div>
                `).join('')}
              </div>

              <div class="card" style="padding:var(--space-6)">
                <div class="flex items-center justify-between" style="margin-bottom:var(--space-4)">
                  <span class="text-muted">Total</span>
                  <span style="font-size:var(--fs-headline-sm);font-weight:var(--fw-extrabold);color:var(--color-accent)">${formatPrice(total)}</span>
                </div>
                <a href="#/checkout" class="btn btn-accent btn-lg" style="width:100%">
                  Proceder al Pago
                </a>
              </div>
            `
          }
        </div>
      </div>
    `;

    main.querySelectorAll('.btn-remove').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const itemEl = btn.closest('[data-item-id]');
        const itemId = itemEl?.dataset.itemId;
        if (!itemId) return;
        try {
          await removeFromCart(itemId);
          state.cartCount = Math.max(0, state.cartCount - 1);
          showToast({ type: 'success', title: 'Eliminado', message: 'Curso eliminado del carrito.' });
          carritoController();
        } catch {
          showToast({ type: 'error', title: 'Error', message: 'No se pudo eliminar.' });
        }
      });
    });

  } catch {
    main.innerHTML = `
      <div class="container section text-center">
        <h2>No se pudo cargar el carrito</h2>
        <button class="btn btn-primary" style="margin-top:var(--space-6)" onclick="window.location.reload()">Reintentar</button>
      </div>`;
  }
}
