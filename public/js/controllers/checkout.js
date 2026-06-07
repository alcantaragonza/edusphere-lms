/**
 * Checkout — Flujo de pago.
 * Ruta: #/checkout
 */
import { state } from '../utils/state.js';
import { createEl } from '../utils/dom.js';
import { formatPrice } from '../utils/formatters.js';
import { getCart } from '../api/carrito.js';
import { enroll } from '../api/inscripciones.js';
import { Navbar } from '../components/Navbar.js';
import { Footer } from '../components/Footer.js';
import { LoadingSpinner } from '../components/LoadingSpinner.js';
import { showToast } from '../components/Toast.js';

export async function checkoutController() {
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

  main.appendChild(LoadingSpinner({ text: 'Cargando checkout...' }));

  try {
    const data = await getCart().catch(() => ({ items: [], total: 0 }));
    const items = data.items || data.data || [];
    const total = data.total || 0;

    if (items.length === 0) {
      main.innerHTML = `
        <div class="container section text-center">
          <span class="material-symbols-rounded" style="font-size:4rem;opacity:0.3">shopping_cart</span>
          <h2 style="margin-top:var(--space-4)">Tu carrito está vacío</h2>
          <p class="text-muted">Agrega cursos antes de pagar.</p>
          <a href="#/" class="btn btn-primary" style="margin-top:var(--space-6)">Explorar Cursos</a>
        </div>`;
      return;
    }

    main.innerHTML = `
      <div class="container" style="padding-block:var(--space-8);max-width:900px">
        <h1 style="font-size:var(--fs-display-md);margin-bottom:var(--space-8)">Finalizar Compra</h1>

        <div style="display:grid;grid-template-columns:1fr 320px;gap:var(--space-8)">
          <div>
            <h2 style="font-size:var(--fs-headline-sm);margin-bottom:var(--space-4)">Resumen del Pedido</h2>
            <div style="display:flex;flex-direction:column;gap:var(--space-3);margin-bottom:var(--space-8)">
              ${items.map(item => `
                <div class="flex items-center justify-between" style="padding:var(--space-3) 0;border-bottom:1px solid var(--color-border)">
                  <div>
                    <p class="fw-medium">${item.titulo}</p>
                    <p class="text-muted" style="font-size:var(--fs-caption)">Por ${item.instructor || 'Instructor'}</p>
                  </div>
                  <span class="fw-semibold">${formatPrice(item.precio)}</span>
                </div>
              `).join('')}
            </div>

            <h2 style="font-size:var(--fs-headline-sm);margin-bottom:var(--space-4)">Pago</h2>
            <div class="card" style="padding:var(--space-6)">
              <form id="checkout-form" style="display:flex;flex-direction:column;gap:var(--space-4)">
                <div class="form-group">
                  <label class="form-label">Número de Tarjeta</label>
                  <input type="text" class="form-input" placeholder="4242 4242 4242 4242" required>
                </div>
                <div class="grid grid-2">
                  <div class="form-group">
                    <label class="form-label">Vencimiento</label>
                    <input type="text" class="form-input" placeholder="MM/AA" required>
                  </div>
                  <div class="form-group">
                    <label class="form-label">CVC</label>
                    <input type="text" class="form-input" placeholder="123" required>
                  </div>
                </div>
                <div class="form-group">
                  <label class="form-label">Nombre del Titular</label>
                  <input type="text" class="form-input" placeholder="Nombre en la tarjeta" required>
                </div>
                <p class="text-muted" style="font-size:var(--fs-caption);margin-top:var(--space-2)">
                  <span class="material-symbols-rounded" style="font-size:0.875rem;vertical-align:middle">lock</span>
                  Esto es una demo. No se procesará ningún pago real.
                </p>
                <button type="submit" class="btn btn-accent btn-lg" style="width:100%;margin-top:var(--space-2)">
                  Pagar ${formatPrice(total)}
                </button>
              </form>
            </div>
          </div>

          <div>
            <div class="card" style="padding:var(--space-6);position:sticky;top:5rem">
              <h3 style="font-size:var(--fs-body-md);margin-bottom:var(--space-4)">Resumen</h3>
              <div class="flex items-center justify-between" style="margin-bottom:var(--space-2)">
                <span class="text-muted">Cursos (${items.length})</span>
                <span>${formatPrice(total)}</span>
              </div>
              <div class="flex items-center justify-between" style="margin-bottom:var(--space-2)">
                <span class="text-muted">IVA</span>
                <span>Q0.00</span>
              </div>
              <div style="border-top:1px solid var(--color-border);padding-top:var(--space-3);margin-top:var(--space-3)">
                <div class="flex items-center justify-between">
                  <span class="fw-bold">Total</span>
                  <span style="font-size:var(--fs-headline-sm);font-weight:var(--fw-extrabold);color:var(--color-accent)">${formatPrice(total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    const form = main.querySelector('#checkout-form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = form.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner spinner-sm"></span> Procesando...';

        try {
          for (const item of items) {
            await enroll(item.curso_id || item.id);
          }
          state.cartCount = 0;
          showToast({ type: 'success', title: '¡Inscrito!', message: 'Ya estás inscrito. ¡A aprender!' });
          window.location.hash = '#/mis-cursos';
        } catch {
          showToast({ type: 'error', title: 'Pago fallido', message: 'Intenta de nuevo.' });
          btn.disabled = false;
          btn.textContent = `Pagar ${formatPrice(total)}`;
        }
      });
    }

  } catch {
    main.innerHTML = `
      <div class="container section text-center">
        <h2>No se pudo cargar el checkout</h2>
        <a href="#/carrito" class="btn btn-ghost" style="margin-top:var(--space-6)">Volver al Carrito</a>
      </div>`;
  }
}
