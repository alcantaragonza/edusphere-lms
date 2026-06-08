/**
 * LoadingSpinner.
 */
import { createEl } from '../utils/dom.js';

export function LoadingSpinner({ size = 'md', text = '' } = {}) {
  const wrapper = createEl('div', {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--space-12)',
      gap: 'var(--space-4)',
    }
  });

  wrapper.innerHTML = `
    <div class="spinner spinner-${size}"></div>
    ${text ? `<p class="text-muted" style="font-size:var(--fs-body-sm)">${text}</p>` : ''}
  `;

  return wrapper;
}
