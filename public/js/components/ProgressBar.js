/**
 * ProgressBar — Linear progress indicator.
 */
import { createEl } from '../utils/dom.js';

export function ProgressBar({ percent = 0, showLabel = true, size = 'md', label } = {}) {
  const pct = Math.min(100, Math.max(0, percent));

  const wrapper = createEl('div', { className: showLabel ? 'progress-group' : '' });

  if (showLabel) {
    const lbl = createEl('div', { className: 'progress-label' });
    lbl.innerHTML = `
      <span>${label || 'Progress'}</span>
      <span class="progress-percent">${Math.round(pct)}%</span>
    `;
    wrapper.appendChild(lbl);
  }

  const bar = createEl('div', { className: `progress-bar progress-bar-${size}` });
  bar.innerHTML = `<div class="progress-bar-fill" style="width:${pct}%"></div>`;
  wrapper.appendChild(bar);

  return wrapper;
}
