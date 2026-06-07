/**
 * Home — Catálogo público.
 * Ruta: #/
 */
import { state } from '../utils/state.js';
import { createEl } from '../utils/dom.js';
import { getCatalog } from '../api/cursos.js';
import { cacheCourses } from '../utils/course-cache.js';
import { Navbar } from '../components/Navbar.js';
import { Footer } from '../components/Footer.js';
import { CourseCard } from '../components/CourseCard.js';
import { EmptyState } from '../components/EmptyState.js';
import { Pagination } from '../components/Pagination.js';

export async function homeController() {
  const app = document.getElementById('app');
  app.innerHTML = '';

  const main = createEl('main');
  app.appendChild(Navbar());
  app.appendChild(main);
  app.appendChild(Footer());

  let cursos = [];

  try {
    const data = await getCatalog();
    cursos = Array.isArray(data) ? data : (data.data || data.cursos || []);
    cacheCourses(cursos);
  } catch (_) {
    // Fallback a demo si API falla
  }

  main.innerHTML = `
    <section class="hero" style="background:var(--gradient-hero);padding:var(--space-20) 0 var(--space-16)">
      <div class="container text-center">
        <p class="text-primary fw-semibold" style="font-size:var(--fs-body-sm);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:var(--space-4)">
          Más de 2M+ estudiantes confían en nosotros
        </p>
        <h1 style="font-size:var(--fs-display-lg);margin-bottom:var(--space-4)">
          Domina tu futuro con<br><span style="background:var(--gradient-primary);-webkit-background-clip:text;-webkit-text-fill-color:transparent">Precisión y Claridad</span>
        </h1>
        <p class="text-muted" style="max-width:600px;margin:0 auto var(--space-8);font-size:var(--fs-body-lg);line-height:var(--lh-relaxed)">
          Accede a una colección curada de cursos de clase mundial diseñados para transformar tu trayectoria profesional.
        </p>
        <div class="flex items-center justify-center gap-3">
          <a href="#/login?tab=register" class="btn btn-accent btn-lg">Comenzar Gratis</a>
          <a href="#catalogo" class="btn btn-ghost btn-lg">Explorar Cursos</a>
        </div>
      </div>
    </section>

    <section id="catalogo" class="section">
      <div class="container">
        <div class="flex items-center justify-between" style="margin-bottom:var(--space-8)">
          <div>
            <h2 style="font-size:var(--fs-display-md)">Cursos Destacados</h2>
            <p class="text-muted" style="margin-top:var(--space-2)">Descubre tu siguiente camino de aprendizaje</p>
          </div>
        </div>

        <div class="grid grid-3" id="catalog-grid"></div>
        <div id="catalog-pagination"></div>
      </div>
    </section>

    <section style="background:var(--gradient-primary);padding:var(--space-16) 0;margin-top:var(--space-8)">
      <div class="container text-center">
        <h2 style="font-size:var(--fs-display-md);color:#fff;margin-bottom:var(--space-4)">
          Desbloquea tu Potencial
        </h2>
        <p style="color:rgba(255,255,255,0.8);max-width:600px;margin:0 auto var(--space-8);font-size:var(--fs-body-lg)">
          Accede a toda nuestra biblioteca, sesiones exclusivas de mentoría y programas de diploma certificados.
        </p>
        <a href="#/login?tab=register" class="btn btn-accent btn-lg">Únete por Q150/mes</a>
      </div>
    </section>
  `;

  const grid = main.querySelector('#catalog-grid');
  if (cursos.length === 0) {
    grid.insertAdjacentElement('afterend', EmptyState({
      icon: 'school',
      title: 'No hay cursos aún',
      description: '¡Vuelve pronto para ver nuevos cursos!',
      action: '<a href="#/login?tab=register" class="btn btn-primary" style="margin-top:var(--space-4)">Crear Cuenta</a>'
    }));
  } else {
    cursos.forEach(c => {
      grid.appendChild(CourseCard({
        id: c.id, slug: c.slug, titulo: c.titulo,
        descripcion: c.descripcion_corta || c.descripcion,
        instructor: c.instructor_nombre || c.instructor,
        precio: c.precio, categoria: c.categoria_nombre || c.categoria,
        calificacion_promedio: c.calificacion_promedio,
        total_estudiantes: c.total_estudiantes,
        total_resenas: c.total_resenas,
        imagen_url: c.imagen_portada_url || c.imagen_url
      }));
    });
  }
}
