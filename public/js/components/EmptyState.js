/**
 * EmptyState — placeholder cuando no hay datos.
 */
import { createEl } from '../utils/dom.js';

export function EmptyState({ icon = 'inbox', title = 'Nada por aquí aún', description = '', action = null } = {}) {
  const wrapper = createEl('div', { className: 'empty-state' });

  wrapper.innerHTML = `
    <span class="empty-state-icon material-symbols-rounded">${icon}</span>
    <h3>${title}</h3>
    ${description ? `<p>${description}</p>` : ''}
  `;

  if (action) {
    wrapper.insertAdjacentHTML('beforeend', typeof action === 'string' ? action : '');
    if (action instanceof Node) wrapper.appendChild(action);
  }

  return wrapper;
}
