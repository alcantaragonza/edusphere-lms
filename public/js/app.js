/**
 * EduSphere LMS — Application Entry Point
 * SPA with hash-router, ES modules, dark theme.
 */
import { Router } from './utils/router.js';
import { state } from './utils/state.js';
import { homeController } from './controllers/home.js';
import { cursoDetalleController } from './controllers/curso-detalle.js';
import { authController } from './controllers/auth.js';
import { dashboardEstudianteController } from './controllers/dashboard-estudiante.js';
import { dashboardInstructorController } from './controllers/dashboard-instructor.js';
import { leccionController } from './controllers/leccion.js';
import { carritoController } from './controllers/carrito.js';
import { checkoutController } from './controllers/checkout.js';
import { certificadoController } from './controllers/certificado.js';
import { perfilController } from './controllers/perfil.js';

// Guard: redirect to login if not authenticated
function requireAuth(fn) {
  return (params) => {
    if (!state.isAuthenticated()) {
      window.location.hash = '#/login';
      return;
    }
    fn(params);
  };
}

// Guard: redirect to login if not student
function requireStudent(fn) {
  return (params) => {
    if (!state.isAuthenticated()) {
      window.location.hash = '#/login';
      return;
    }
    if (state.user?.rol !== 'estudiante') {
      window.location.hash = '#/mis-cursos';
      return;
    }
    fn(params);
  };
}

// Guard: redirect to login if not instructor
function requireInstructor(fn) {
  return (params) => {
    if (!state.isAuthenticated()) {
      window.location.hash = '#/login';
      return;
    }
    if (state.user?.rol !== 'instructor' && state.user?.rol !== 'admin') {
      window.location.hash = '#/mis-cursos';
      return;
    }
    fn(params);
  };
}

const router = new Router([
  { pattern: '/',             handler: homeController },
  { pattern: '/login',        handler: authController },
  { pattern: '/curso/:slug',  handler: cursoDetalleController },
  { pattern: '/curso/:slug/aprender', handler: requireStudent(leccionController) },
  { pattern: '/mis-cursos',   handler: requireStudent(dashboardEstudianteController) },
  { pattern: '/carrito',      handler: requireAuth(carritoController) },
  { pattern: '/checkout',     handler: requireAuth(checkoutController) },
  { pattern: '/certificado/:id', handler: requireAuth(certificadoController) },
  { pattern: '/instructor',   handler: requireInstructor(dashboardInstructorController) },
  { pattern: '/perfil',       handler: requireAuth(perfilController) },
]);

// Boot
router.init();
