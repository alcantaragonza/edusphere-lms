/**
 * Home — Catálogo público con búsqueda, filtros, paginación.
 * Ruta: #/
 */
import { state } from '../utils/state.js';
import { createEl } from '../utils/dom.js';
import { getCatalog } from '../api/cursos.js';
import { Navbar } from '../components/Navbar.js';
import { Footer } from '../components/Footer.js';
import { CourseCard } from '../components/CourseCard.js';
import { LoadingSpinner } from '../components/LoadingSpinner.js';
import { EmptyState } from '../components/EmptyState.js';
import { Pagination } from '../components/Pagination.js';

export async function homeController() {
  const app = document.getElementById('app');
  app.innerHTML = '';

  const main = createEl('main');
  app.appendChild(Navbar());
  app.appendChild(main);
  app.appendChild(Footer());

  try {
    const data = await getCatalog();
    const cursos = data.cursos || data.data || [];

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
            <div class="flex items-center gap-4">
              <select class="form-input" style="width:auto;padding:0.5rem" onchange="window.location.hash = '#/?sort=' + this.value">
                <option value="popular">Más Populares</option>
                <option value="newest">Más Nuevos</option>
                <option value="rating">Mejor Calificados</option>
                <option value="price-low">Precio: Menor a Mayor</option>
              </select>
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
      }));
    } else {
      cursos.forEach(c => {
        grid.appendChild(CourseCard({
          id: c.id, slug: c.slug, titulo: c.titulo,
          descripcion: c.descripcion_corta, instructor: c.instructor,
          precio: c.precio, categoria: c.categoria,
          calificacion_promedio: c.calificacion_promedio,
          total_estudiantes: c.total_estudiantes,
          total_resenas: c.total_resenas,
          imagen_url: c.imagen_url
        }));
      });
    }

    if (data.total_pages > 1) {
      const pag = main.querySelector('#catalog-pagination');
      pag.appendChild(Pagination({
        currentPage: data.page || 1,
        totalPages: data.total_pages,
        onPageChange: (p) => {
          window.location.hash = `#/?page=${p}`;
          homeController();
        }
      }));
    }
  } catch (err) {
    main.innerHTML = `
      <div class="container section text-center">
        <span class="material-symbols-rounded" style="font-size:4rem;color:var(--color-error)">error</span>
        <h2 style="margin-top:var(--space-4)">No se pudo cargar el catálogo</h2>
        <p class="text-muted" style="margin-top:var(--space-2)">Verifica que el servidor API esté funcionando.</p>
        <button class="btn btn-primary" style="margin-top:var(--space-6)" onclick="window.location.reload()">Reintentar</button>
      </div>`;
    renderDemoCatalog(main);
  }
}

function renderDemoCatalog(main) {
  const demo = [
    { slug: 'arquitectura-react-avanzada', titulo: 'Arquitectura Avanzada en React', instructor: 'Dra. Sarah Jenkins', categoria: 'Programación', calificacion_promedio: 4.8, total_estudiantes: 12500, total_resenas: 2450, precio: 699.99 },
    { slug: 'sistemas-visuales-marca', titulo: 'Sistemas Visuales e Identidad de Marca', instructor: 'Marcus Thorne', categoria: 'Diseño', calificacion_promedio: 5.0, total_estudiantes: 8200, total_resenas: 1100, precio: 965 },
    { slug: 'innovacion-gestion-estrategica', titulo: 'Innovación y Gestión Estratégica', instructor: 'Dra. Elena Rodríguez', categoria: 'Negocios', calificacion_promedio: 4.2, total_estudiantes: 25000, total_resenas: 3200, precio: 1245 },
    { slug: 'fundamentos-ciencia-datos', titulo: 'Fundamentos de Ciencia de Datos', instructor: 'Prof. Alex Kim', categoria: 'Ciencia de Datos', calificacion_promedio: 4.7, total_estudiantes: 18000, total_resenas: 4100, precio: 0 },
    { slug: 'ciberseguridad-esencial', titulo: 'Ciberseguridad Esencial', instructor: 'James Wilson', categoria: 'Tecnología', calificacion_promedio: 4.5, total_estudiantes: 9500, total_resenas: 1800, precio: 545 },
    { slug: 'sistemas-diseno-ui-avanzados', titulo: 'Sistemas de Diseño UI Avanzados', instructor: 'Lisa Chen', categoria: 'Diseño', calificacion_promedio: 4.9, total_estudiantes: 7200, total_resenas: 980, precio: 1165 },
  ];

  const grid = main.querySelector('#catalog-grid');
  if (!grid) return;

  grid.innerHTML = '';
  demo.forEach(c => {
    grid.appendChild(CourseCard(c));
  });
}
