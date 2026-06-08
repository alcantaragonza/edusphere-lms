/**
 * Checkout — Flujo de pago (carrito y directo).
 * Ruta: #/checkout[?directo=1&curso=id&precio=X&titulo=...]
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

  const queryParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
  const esDirecto = queryParams.get('directo') === '1';

  const main = createEl('main');
  app.appendChild(Navbar());
  app.appendChild(main);
  app.appendChild(Footer());

  let items = [];
  let total = 0;

  if (esDirecto) {
    const curso = {
      curso_id: queryParams.get('curso'),
      titulo: decodeURIComponent(queryParams.get('titulo') || 'Curso'),
      precio: parseFloat(queryParams.get('precio') || '0'),
    };
    items = [curso];
    total = curso.precio;
    main.innerHTML = renderCheckout(items, total, true);
  } else {
    try {
      const data = await getCart().catch(() => ({ items: [], total: 0 }));
      items = data.items || data.data || [];
      total = data.total || 0;
    } catch (_) {}

    if (items.length === 0) {
      main.innerHTML = `
        <div class="container section text-center">
          <span class="material-symbols-rounded" style="font-size:4rem;opacity:0.3">shopping_cart</span>
          <h2 style="margin-top:var(--space-4)">Tu carrito esta vacio</h2>
          <p class="text-muted">Agrega cursos antes de pagar.</p>
          <a href="#/" class="btn btn-primary" style="margin-top:var(--space-6)">Explorar Cursos</a>
        </div>`;
      return;
    }

    main.innerHTML = renderCheckout(items, total, false);
  }

  const form = main.querySelector('#checkout-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner spinner-sm"></span> Procesando...';

      let success = 0;
      let failed = 0;

      for (const item of items) {
        try {
          await enroll(item.curso_id || item.id);
          success++;
        } catch (_) {
          failed++;
        }
      }

      if (success > 0) {
        state.cartCount = 0;
        showToast({ type: 'success', title: 'Pago exitoso', message: `Te inscribiste a ${success} curso(s).` });
        window.location.hash = '#/mis-cursos';
      } else {
        showToast({ type: 'error', title: 'Pago fallido', message: 'No se pudo completar la inscripcion.' });
        btn.disabled = false;
        btn.textContent = `Pagar ${formatPrice(total)}`;
      }
    });
  }
}

function renderCheckout(items, total, esDirecto) {
  return `
    <div class="container" style="padding-block:var(--space-8);max-width:900px">
      <h1 style="font-size:var(--fs-display-md);margin-bottom:var(--space-8)">
        ${esDirecto ? 'Completar Inscripcion' : 'Finalizar Compra'}
      </h1>

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

          <h2 style="font-size:var(--fs-headline-sm);margin-bottom:var(--space-4)">Metodo de Pago</h2>
          <div class="card" style="padding:var(--space-6)">
            <div class="flex items-center gap-3" style="margin-bottom:var(--space-5);padding:var(--space-4);background:var(--color-bg);border-radius:var(--radius-lg);border:1px solid var(--color-border)">
              <span class="material-symbols-rounded text-primary" style="font-size:1.5rem">credit_card</span>
              <div>
                <p class="fw-semibold" style="font-size:var(--fs-body-sm)">Tarjeta de Credito / Debito</p>
                <p class="text-muted" style="font-size:var(--fs-caption)">Demo — no se procesa ningun pago real</p>
              </div>
            </div>
            <form id="checkout-form" style="display:flex;flex-direction:column;gap:var(--space-4)">
              <div class="form-group">
                <label class="form-label">Numero de Tarjeta</label>
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
              <div class="flex items-center gap-2" style="margin-top:var(--space-2);font-size:var(--fs-caption);color:var(--color-text-muted)">
                <span class="material-symbols-rounded" style="font-size:0.875rem">lock</span>
                <span>Pago seguro simulado. Datos no se almacenan.</span>
              </div>
              <button type="submit" class="btn btn-accent btn-lg" style="width:100%;margin-top:var(--space-4)">
                <span class="material-symbols-rounded">payments</span>
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
              <span class="text-muted">Comision plataforma</span>
              <span>Incluida</span>
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
}
