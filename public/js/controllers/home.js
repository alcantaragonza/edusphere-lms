/**
 * Home — Catálogo público con filtros y paginación.
 * Ruta: #/
 */
import { state } from '../utils/state.js';
import { createEl } from '../utils/dom.js';
import { getCatalog, getCategories } from '../api/cursos.js';
import { api } from '../api/client.js';
import { cacheCourses } from '../utils/course-cache.js';
import { Navbar } from '../components/Navbar.js';
import { Footer } from '../components/Footer.js';
import { CourseCard } from '../components/CourseCard.js';
import { EmptyState } from '../components/EmptyState.js';
import { Pagination } from '../components/Pagination.js';

const PER_PAGE = 9;

export async function homeController() {
  const app = document.getElementById('app');
  app.innerHTML = '';

  const main = createEl('main');
  app.appendChild(Navbar());
  app.appendChild(main);
  app.appendChild(Footer());

  let todosCursos = [];
  let categorias = [];
  let currentPage = 1;

  try {
    let data;
    try {
      data = await api.get('/reportes/catalogo');
    } catch (_) {
      data = null;
    }
    todosCursos = (data && Array.isArray(data)) ? data : [];

    if (todosCursos.length === 0) {
      data = await getCatalog();
      todosCursos = Array.isArray(data) ? data : (data.data || data.cursos || []);
      try {
        const insData = await api.get('/instructores');
        const instructores = Array.isArray(insData) ? insData : (insData.data || []);
        const usersData = await api.get('/usuarios');
        const usuarios = Array.isArray(usersData) ? usersData : (usersData.data || []);
        const userMap = {};
        usuarios.forEach(u => { userMap[u.id] = (u.nombre || '') + ' ' + (u.apellido || ''); });
        const insMap = {};
        instructores.forEach(i => { insMap[i.id] = userMap[i.usuario_id] || ('Instructor #' + i.id); });
        todosCursos.forEach(c => {
          c.instructor_nombre = insMap[c.instructor_id] || ('Instructor #' + c.instructor_id);
        });
      } catch (_) {}
    }
    cacheCourses(todosCursos);
  } catch (_) {}

  todosCursos = todosCursos.map(c => ({
    ...c,
    instructor: c.instructor || c.instructor_nombre || c.instructor_name || c.nombre_instructor || '',
    categoria: c.categoria || c.categoria_nombre || c.categoria_name || c.nombre_categoria || '',
    calificacion_promedio: Number(c.calificacion_promedio) || 0,
    total_estudiantes: Number(c.total_estudiantes) || 0,
  }));

  try {
    const catData = await getCategories();
    categorias = Array.isArray(catData) ? catData : (catData.data || []);
  } catch (_) {}

  const niveles = ['principiante', 'intermedio', 'avanzado'];
  const nivelLabels = { principiante: 'Principiante', intermedio: 'Intermedio', avanzado: 'Avanzado' };

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

        <div class="flex items-center gap-3" id="catalog-filters" style="margin-bottom:var(--space-6);flex-wrap:wrap">
          <input type="text" id="filter-search" class="form-input" placeholder="Buscar cursos..." style="max-width:260px;font-size:var(--fs-body-sm)">
          <select id="filter-category" class="form-input" style="max-width:200px;font-size:var(--fs-body-sm)">
            <option value="">Todas las categorías</option>
            ${categorias.map(cat => `<option value="${cat.id}">${cat.nombre}</option>`).join('')}
          </select>
          <select id="filter-level" class="form-input" style="max-width:180px;font-size:var(--fs-body-sm)">
            <option value="">Todos los niveles</option>
            ${niveles.map(n => `<option value="${n}">${nivelLabels[n]}</option>`).join('')}
          </select>
          <span class="text-muted" id="filter-count" style="font-size:var(--fs-body-sm)"></span>
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
  const paginationContainer = main.querySelector('#catalog-pagination');
  const filterCount = main.querySelector('#filter-count');
  const searchInput = main.querySelector('#filter-search');
  const categorySelect = main.querySelector('#filter-category');
  const levelSelect = main.querySelector('#filter-level');

  function filterCourses() {
    const search = searchInput.value.toLowerCase().trim();
    const catId = categorySelect.value;
    const level = levelSelect.value;

    return todosCursos.filter(c => {
      if (search && !(c.titulo || '').toLowerCase().includes(search)) return false;
      if (catId && String(c.categoria_id) !== catId) return false;
      if (level && c.nivel !== level) return false;
      return true;
    });
  }

  function renderPage(page) {
    currentPage = page;
    const filtered = filterCourses();
    const totalPages = Math.ceil(filtered.length / PER_PAGE);
    const start = (page - 1) * PER_PAGE;
    const pageCourses = filtered.slice(start, start + PER_PAGE);

    grid.innerHTML = '';
    filterCount.textContent = `${filtered.length} curso${filtered.length !== 1 ? 's' : ''}`;

    if (filtered.length === 0) {
      grid.insertAdjacentElement('afterend', EmptyState({
        icon: 'search_off',
        title: 'Sin resultados',
        description: 'Prueba con otros filtros o términos de búsqueda.'
      }));
      paginationContainer.textContent = '';
      return;
    }

    const emptyEl = grid.nextElementSibling;
    if (emptyEl && emptyEl.classList?.contains('empty-state')) {
      emptyEl.remove();
    }

    pageCourses.forEach(c => {
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

    paginationContainer.textContent = '';
    paginationContainer.appendChild(Pagination({
      currentPage: page,
      totalPages,
      onPageChange: renderPage,
    }));
  }

  searchInput.addEventListener('input', () => renderPage(1));
  categorySelect.addEventListener('change', () => renderPage(1));
  levelSelect.addEventListener('change', () => renderPage(1));

  renderPage(1);
}
