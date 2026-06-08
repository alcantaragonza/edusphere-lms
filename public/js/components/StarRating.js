/**
 * StarRating — Display.
 */
export function StarRatingDisplay(rating, count) {
  const full = Math.floor(rating);
  const hasHalf = rating - full >= 0.5;
  const empty = 5 - full - (hasHalf ? 1 : 0);

  let html = '<div class="stars">';
  html += `<span class="material-symbols-rounded">star</span>`.repeat(full);
  if (hasHalf) html += `<span class="material-symbols-rounded">star_half</span>`;
  html += `<span class="material-symbols-rounded empty">star</span>`.repeat(empty);
  html += `<span class="stars-rating-value">${rating.toFixed(1)}</span>`;
  if (count) html += `<span class="stars-rating-count">(${count})</span>`;
  html += '</div>';

  return html;
}

/**
 * StarRating — Interactive input.
 * Returns HTML string with data attribute for JS.
 */
export function StarRatingInput(currentRating = 0) {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    const filled = i <= currentRating;
    stars.push(`<span class="material-symbols-rounded ${filled ? '' : 'empty'}" data-star="${i}">star</span>`);
  }
  return `<div class="stars stars-interactive" data-rating="${currentRating}">${stars.join('')}</div>`;
}
