/**
 * Pagination — Page numbers.
 */
import { createEl } from '../utils/dom.js';

export function Pagination({ currentPage = 1, totalPages = 1, onPageChange } = {}) {
  if (totalPages <= 1) return createEl('div');

  const wrapper = createEl('div', { className: 'pagination' });

  // Previous
  const prev = createEl('button', {
    className: 'pagination-btn',
    disabled: currentPage <= 1,
  }, '<span class="material-symbols-rounded">chevron_left</span>');
  prev.addEventListener('click', () => onPageChange && onPageChange(currentPage - 1));
  wrapper.appendChild(prev);

  // Pages
  const pages = getPageNumbers(currentPage, totalPages);
  pages.forEach(p => {
    if (p === '...') {
      wrapper.appendChild(createEl('span', { className: 'pagination-ellipsis' }, '...'));
    } else {
      const btn = createEl('button', {
        className: `pagination-btn ${p === currentPage ? 'active' : ''}`,
      }, String(p));
      btn.addEventListener('click', () => onPageChange && onPageChange(p));
      wrapper.appendChild(btn);
    }
  });

  // Next
  const next = createEl('button', {
    className: 'pagination-btn',
    disabled: currentPage >= totalPages,
  }, '<span class="material-symbols-rounded">chevron_right</span>');
  next.addEventListener('click', () => onPageChange && onPageChange(currentPage + 1));
  wrapper.appendChild(next);

  return wrapper;
}

function getPageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = [1];
  if (current > 3) pages.push('...');
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 2) pages.push('...');
  pages.push(total);
  return pages;
}
