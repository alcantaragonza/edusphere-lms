/**
 * Footer.
 */
import { createEl } from '../utils/dom.js';

export function Footer() {
  const footer = createEl('footer', { className: 'footer' });
  footer.innerHTML = `
    <div class="container" style="padding-block:var(--space-12)">
      <div class="grid grid-4" style="gap:var(--space-10)">
        <div>
          <div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-4)">
            <span class="navbar-brand-icon material-symbols-rounded" style="width:2.5rem;height:2.5rem">school</span>
            <span style="font-family:var(--font-headline);font-weight:var(--fw-extrabold);font-size:var(--fs-body-lg)">EduSphere LMS</span>
          </div>
          <p class="text-muted" style="font-size:var(--fs-body-sm);line-height:var(--lh-relaxed)">
            Potenciando el aprendizaje continuo con excelencia académica y tecnología de vanguardia.
          </p>
        </div>
        <div>
          <h4 style="font-size:var(--fs-body-sm);margin-bottom:var(--space-4);color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:0.05em">Plataforma</h4>
          <ul style="display:flex;flex-direction:column;gap:var(--space-3)">
            <li><a href="#/" class="text-muted" style="font-size:var(--fs-body-sm)">Explorar Cursos</a></li>
            <li><a href="#/mis-cursos" class="text-muted" style="font-size:var(--fs-body-sm)">Mi Aprendizaje</a></li>
            <li><a href="#/carrito" class="text-muted" style="font-size:var(--fs-body-sm)">Carrito</a></li>
          </ul>
        </div>
        <div>
          <h4 style="font-size:var(--fs-body-sm);margin-bottom:var(--space-4);color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:0.05em">Soporte</h4>
          <ul style="display:flex;flex-direction:column;gap:var(--space-3)">
            <li><a href="#" class="text-muted" style="font-size:var(--fs-body-sm)">Centro de Ayuda</a></li>
            <li><a href="#" class="text-muted" style="font-size:var(--fs-body-sm)">Términos de Servicio</a></li>
            <li><a href="#" class="text-muted" style="font-size:var(--fs-body-sm)">Política de Privacidad</a></li>
          </ul>
        </div>
        <div>
          <h4 style="font-size:var(--fs-body-sm);margin-bottom:var(--space-4);color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:0.05em">Boletín</h4>
          <p class="text-muted" style="font-size:var(--fs-body-sm);margin-bottom:var(--space-3)">
            Recibe novedades de cursos y tips de aprendizaje.
          </p>
          <form style="display:flex;gap:var(--space-2)" onsubmit="event.preventDefault()">
            <input type="email" placeholder="tu@correo.com" class="form-input" style="flex:1;font-size:var(--fs-body-sm)">
            <button type="submit" class="btn btn-primary btn-sm">Enviar</button>
          </form>
        </div>
      </div>
      <div style="margin-top:var(--space-10);padding-top:var(--space-6);border-top:1px solid var(--color-border);text-align:center">
        <p class="text-muted" style="font-size:var(--fs-caption)">
          &copy; 2024 EduSphere LMS. Todos los derechos reservados.
        </p>
      </div>
    </div>
  `;
  return footer;
}
