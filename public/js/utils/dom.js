/**
 * DOM helpers.
 */

/** querySelector shortcut */
export const qs = (sel, parent = document) => parent.querySelector(sel);

/** querySelectorAll shortcut */
export const qsa = (sel, parent = document) => [...parent.querySelectorAll(sel)];

/** Create element with attributes and children */
export function createEl(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, val] of Object.entries(attrs)) {
    if (key === 'className') el.className = val;
    else if (key === 'dataset') Object.assign(el.dataset, val);
    else if (key.startsWith('on') && typeof val === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), val);
    } else if (key === 'style' && typeof val === 'object') {
      Object.assign(el.style, val);
    } else {
      el.setAttribute(key, val);
    }
  }
  for (const child of children) {
    if (typeof child === 'string') {
      if (child.trimStart().startsWith('<')) {
        el.insertAdjacentHTML('beforeend', child);
      } else {
        el.appendChild(document.createTextNode(child));
      }
    } else if (child instanceof Node) {
      el.appendChild(child);
    }
  }
  return el;
}

/** Render HTML string into a container */
export function render(container, html) {
  if (typeof html === 'string') {
    container.innerHTML = html;
  } else if (html instanceof Node) {
    container.innerHTML = '';
    container.appendChild(html);
  }
}
