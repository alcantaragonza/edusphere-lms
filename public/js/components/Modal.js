/**
 * Modal — Generic modal dialog.
 */
import { createEl } from '../utils/dom.js';

export function Modal({ title, content, footer, onClose, size = 'md' } = {}) {
  // Remove existing modals
  document.querySelectorAll('.modal-overlay').forEach(m => m.remove());

  const overlay = createEl('div', { className: 'modal-overlay', onClick: (e) => {
    if (e.target === overlay && onClose) onClose();
  }});

  const modal = createEl('div', { className: 'modal' });
  if (size === 'lg') modal.style.maxWidth = '640px';
  if (size === 'sm') modal.style.maxWidth = '360px';

  modal.innerHTML = `
    <div class="modal-header">
      <h2 class="modal-title">${title || ''}</h2>
      <button class="modal-close" aria-label="Close">
        <span class="material-symbols-rounded">close</span>
      </button>
    </div>
    <div class="modal-body">${content || ''}</div>
    ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
  `;

  modal.querySelector('.modal-close').addEventListener('click', () => {
    overlay.remove();
    if (onClose) onClose();
  });

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  return { overlay, modal };
}
