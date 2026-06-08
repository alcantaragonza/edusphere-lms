/**
 * Toast — Floating notifications.
 */
import { createEl } from '../utils/dom.js';

let container = null;

function getContainer() {
  if (!container) {
    container = createEl('div', { className: 'toast-container' });
    document.body.appendChild(container);
  }
  return container;
}

export function showToast({ type = 'info', title = '', message = '', duration = 4000 } = {}) {
  const icons = {
    success: 'check_circle',
    error: 'error',
    warning: 'warning',
    info: 'info',
  };

  const toast = createEl('div', { className: `toast toast-${type}` });
  toast.innerHTML = `
    <span class="toast-icon material-symbols-rounded">${icons[type]}</span>
    <div class="toast-body">
      ${title ? `<span class="toast-title">${title}</span>` : ''}
      ${message ? `<span class="toast-message">${message}</span>` : ''}
    </div>
    <button class="toast-close material-symbols-rounded">close</button>
  `;

  toast.querySelector('.toast-close').addEventListener('click', () => removeToast(toast));

  getContainer().appendChild(toast);

  if (duration > 0) {
    setTimeout(() => removeToast(toast), duration);
  }
}

function removeToast(toast) {
  toast.classList.add('removing');
  setTimeout(() => toast.remove(), 200);
}
