/**
 * LessonAccordion — Module and lesson tree.
 */
import { createEl } from '../utils/dom.js';
import { formatDuration } from '../utils/formatters.js';

export function LessonAccordion({ modules, activeLessonId, onLessonClick }) {
  const container = createEl('div', { className: 'lesson-accordion' });

  if (!modules || modules.length === 0) {
    container.innerHTML = '<p class="text-muted" style="padding:var(--space-6);text-align:center">No modules yet</p>';
    return container;
  }

  modules.forEach((mod, idx) => {
    const moduleEl = createEl('div', { className: 'lesson-module' });

    const isOpen = mod.lecciones?.some(l => l.id === activeLessonId);
    const completedCount = mod.lecciones?.filter(l => l.completada).length || 0;
    const totalCount = mod.lecciones?.length || 0;

    moduleEl.innerHTML = `
      <button class="lesson-module-header ${isOpen ? 'active' : ''}">
        <div class="lesson-module-info">
          <span class="lesson-module-title">Módulo ${idx + 1}: ${mod.titulo}</span>
          <span class="lesson-module-meta">${totalCount} lecciones${completedCount > 0 ? ` · ${completedCount}/${totalCount} completadas` : ''}</span>
        </div>
        <span class="lesson-module-icon material-symbols-rounded">expand_more</span>
      </button>
      <div class="lesson-module-body ${isOpen ? 'open' : ''}">
        <div class="lesson-list">
          ${(mod.lecciones || []).map(l => `
            <div class="lesson-item ${l.id === activeLessonId ? 'active' : ''} ${l.completada ? 'completed' : ''}"
                 data-lesson-id="${l.id}">
              <span class="lesson-item-icon material-symbols-rounded">
                ${l.completada ? 'check_circle' : (l.tipo === 'video' ? 'play_circle' : 'description')}
              </span>
              <span>${l.titulo}</span>
              <span class="lesson-item-duration">${formatDuration(l.duracion_minutos)}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    const header = moduleEl.querySelector('.lesson-module-header');
    header.addEventListener('click', () => {
      const body = moduleEl.querySelector('.lesson-module-body');
      const isCurrentlyOpen = body.classList.contains('open');
      body.classList.toggle('open');
      header.classList.toggle('active', !isCurrentlyOpen);
    });

    // Lesson clicks
    const lessons = moduleEl.querySelectorAll('.lesson-item');
    lessons.forEach(l => {
      l.addEventListener('click', (e) => {
        e.stopPropagation();
        if (onLessonClick) onLessonClick(l.dataset.lessonId);
      });
    });

    container.appendChild(moduleEl);
  });

  return container;
}
