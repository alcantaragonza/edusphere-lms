/**
 * CourseCard — tarjeta de curso reutilizable.
 */
import { createEl } from '../utils/dom.js';
import { formatPrice, formatNumber } from '../utils/formatters.js';
import { StarRatingDisplay } from './StarRating.js';

export function CourseCard({ id, slug, titulo, descripcion, instructor, precio, categoria, calificacion_promedio, total_estudiantes, total_resenas, imagen_url, variant = 'grid' }) {
  const isHorizontal = variant === 'horizontal';
  const price = Number(precio) || 0;

  const card = createEl('a', {
    className: `course-card ${isHorizontal ? 'course-card-horizontal' : ''}`,
    href: `#/curso/${slug || id}`,
  });

  card.innerHTML = `
    <div class="course-card-image">
      ${imagen_url
        ? `<img src="${imagen_url}" alt="${titulo}" loading="lazy">`
        : `<div class="course-card-image-placeholder"><span class="material-symbols-rounded">school</span></div>`
      }
      <span class="tag tag-primary course-card-tag">${categoria || 'Curso'}</span>
    </div>
    <div class="course-card-body">
      <div class="course-card-title">${titulo}</div>
      ${instructor ? `<div class="course-card-instructor">Por ${instructor}</div>` : ''}
      ${calificacion_promedio && Number(calificacion_promedio) > 0 ? StarRatingDisplay(Number(calificacion_promedio), total_resenas) : ''}
      ${descripcion && variant === 'horizontal'
        ? `<p class="text-muted" style="font-size:var(--fs-body-sm);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${descripcion}</p>`
        : ''
      }
      <div class="course-card-meta">
        <span class="course-card-students">
          <span class="material-symbols-rounded">group</span>
          ${formatNumber(total_estudiantes || 0)} estudiantes
        </span>
        <span class="course-card-price ${price === 0 ? 'free' : ''}">
          ${price === 0 ? 'Gratis' : formatPrice(price)}
        </span>
      </div>
    </div>
    ${variant === 'grid' && price > 0
      ? `<div class="course-card-footer">
          <span class="btn btn-outline btn-sm">Ver Curso</span>
        </div>`
      : ''
    }
  `;

  return card;
}
