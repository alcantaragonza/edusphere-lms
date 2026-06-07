/**
 * Mock Data Store — Datos simulados en español, precios en Quetzales.
 */
const now = new Date();
const daysAgo = (d) => new Date(now - d * 86400000).toISOString();

export const courses = [
  {
    id: 'c1', slug: 'arquitectura-react-avanzada',
    titulo: 'Arquitectura Avanzada en React',
    descripcion: 'Domina el arte de construir aplicaciones React escalables, mantenibles y de alto rendimiento usando patrones de diseño profesionales y principios arquitectónicos.',
    descripcion_corta: 'Construye apps React de nivel profesional con patrones avanzados.',
    instructor_id: 'i1', instructor_nombre: 'Dra. Sarah Jenkins', instructor: 'Dra. Sarah Jenkins',
    categoria: 'Programación', nivel: 'avanzado',
    precio: 699.99, precio_original: 1399.99,
    calificacion_promedio: 4.8, total_estudiantes: 12500, total_resenas: 2450,
    total_lecciones: 28, total_horas: '24h 30m',
    imagen_url: '', estado: 'publicado',
  },
  {
    id: 'c2', slug: 'sistemas-visuales-marca',
    titulo: 'Sistemas Visuales e Identidad de Marca',
    descripcion: 'Aprende a crear sistemas visuales cohesivos que comuniquen los valores de una marca efectivamente. De teoría del color a sistemas tipográficos.',
    descripcion_corta: 'Diseña identidades de marca poderosas que destaquen.',
    instructor_id: 'i2', instructor_nombre: 'Marcus Thorne', instructor: 'Marcus Thorne',
    categoria: 'Diseño', nivel: 'intermedio',
    precio: 965.00, precio_original: 1549.00,
    calificacion_promedio: 5.0, total_estudiantes: 8200, total_resenas: 1100,
    total_lecciones: 24, total_horas: '18h',
    imagen_url: '', estado: 'publicado',
  },
  {
    id: 'c3', slug: 'innovacion-gestion-estrategica',
    titulo: 'Innovación y Gestión Estratégica',
    descripcion: 'Transforma tu organización con marcos de innovación probados. Aprende design thinking, estrategia ágil y cómo construir una cultura de innovación continua.',
    descripcion_corta: 'Impulsa la innovación y lidera el cambio organizacional.',
    instructor_id: 'i3', instructor_nombre: 'Dra. Elena Rodríguez', instructor: 'Dra. Elena Rodríguez',
    categoria: 'Negocios', nivel: 'principiante',
    precio: 1245.00, precio_original: 2345.00,
    calificacion_promedio: 4.2, total_estudiantes: 25000, total_resenas: 3200,
    total_lecciones: 32, total_horas: '28h',
    imagen_url: '', estado: 'publicado',
  },
  {
    id: 'c4', slug: 'fundamentos-ciencia-datos',
    titulo: 'Fundamentos de Ciencia de Datos',
    descripcion: 'De estadística a machine learning — una introducción completa a la ciencia de datos. Proyectos prácticos con Python, Pandas y Scikit-learn.',
    descripcion_corta: 'Tu primer paso en el mundo de la ciencia de datos.',
    instructor_id: 'i4', instructor_nombre: 'Prof. Alex Kim', instructor: 'Prof. Alex Kim',
    categoria: 'Ciencia de Datos', nivel: 'principiante',
    precio: 0, precio_original: 0,
    calificacion_promedio: 4.7, total_estudiantes: 18000, total_resenas: 4100,
    total_lecciones: 42, total_horas: '36h',
    imagen_url: '', estado: 'publicado',
  },
  {
    id: 'c5', slug: 'ciberseguridad-esencial',
    titulo: 'Ciberseguridad Esencial',
    descripcion: 'Protege sistemas y redes de ataques digitales. Cubre modelado de amenazas, encriptación, seguridad de redes y respuesta a incidentes.',
    descripcion_corta: 'Defiéndete contra las amenazas cibernéticas modernas.',
    instructor_id: 'i5', instructor_nombre: 'James Wilson', instructor: 'James Wilson',
    categoria: 'Tecnología', nivel: 'intermedio',
    precio: 545.00, precio_original: 1015.00,
    calificacion_promedio: 4.5, total_estudiantes: 9500, total_resenas: 1800,
    total_lecciones: 36, total_horas: '30h',
    imagen_url: '', estado: 'publicado',
  },
  {
    id: 'c6', slug: 'sistemas-diseno-ui-avanzados',
    titulo: 'Sistemas de Diseño UI Avanzados',
    descripcion: 'Construye sistemas de diseño escalables que empoderen equipos. Aprende arquitectura de componentes, temas basados en tokens, patrones de accesibilidad y flujos Figma-a-código.',
    descripcion_corta: 'Crea sistemas de diseño de clase mundial desde cero.',
    instructor_id: 'i6', instructor_nombre: 'Lisa Chen', instructor: 'Lisa Chen',
    categoria: 'Diseño', nivel: 'avanzado',
    precio: 1165.00, precio_original: 1945.00,
    calificacion_promedio: 4.9, total_estudiantes: 7200, total_resenas: 980,
    total_lecciones: 30, total_horas: '22h',
    imagen_url: '', estado: 'publicado',
  },
];

function makeLessons(prefix, count, startMinutes = 10) {
  const topics = ['Introducción a', 'Comprendiendo', 'Dominando', 'Práctica de', 'Análisis Profundo:', 'Ejercicio:', 'Caso de Estudio:', 'Avanzado:'];
  const concepts = ['Conceptos Clave', 'Patrones', 'Técnicas', 'Mejores Prácticas', 'Aplicaciones Reales', 'Errores Comunes', 'Rendimiento', 'Arquitectura'];
  return Array.from({ length: count }, (_, i) => ({
    id: `${prefix}-l${i + 1}`,
    titulo: `Lección ${i + 1}: ${topics[i % 8]} ${concepts[i % 8]}`,
    tipo: i % 3 === 0 ? 'texto' : 'video',
    duracion_minutos: startMinutes + i * 5,
    orden: i + 1,
    completada: i < Math.floor(count * 0.4),
    contenido: '<p>En esta lección exploramos conceptos clave y aplicaciones prácticas. Sigue los ejemplos y completa los ejercicios al final.</p><p>Aprendizajes clave:</p><ul><li>Comprender los principios fundamentales</li><li>Aplicar patrones en escenarios reales</li><li>Evitar errores comunes</li></ul>',
  }));
}

export const modules = {
  'c1': [
    { id: 'm1-1', titulo: 'Fundamentos de Escalabilidad', orden: 1, lecciones: makeLessons('c1m1', 6, 8) },
    { id: 'm1-2', titulo: 'Patrones de Diseño Avanzados', orden: 2, lecciones: makeLessons('c1m2', 8, 15) },
    { id: 'm1-3', titulo: 'Gestión de Estado a Escala', orden: 3, lecciones: makeLessons('c1m3', 7, 20) },
    { id: 'm1-4', titulo: 'Optimización de Rendimiento', orden: 4, lecciones: makeLessons('c1m4', 7, 25) },
  ],
  'c2': [
    { id: 'm2-1', titulo: 'Teoría del Color y Psicología', orden: 1, lecciones: makeLessons('c2m1', 6, 10) },
    { id: 'm2-2', titulo: 'Sistemas Tipográficos', orden: 2, lecciones: makeLessons('c2m2', 6, 12) },
    { id: 'm2-3', titulo: 'Diseño de Logotipo y Marca', orden: 3, lecciones: makeLessons('c2m3', 6, 15) },
    { id: 'm2-4', titulo: 'Guías de Marca y Documentación', orden: 4, lecciones: makeLessons('c2m4', 6, 18) },
  ],
  'c3': [
    { id: 'm3-1', titulo: 'Fundamentos de Innovación', orden: 1, lecciones: makeLessons('c3m1', 8, 8) },
    { id: 'm3-2', titulo: 'Proceso de Design Thinking', orden: 2, lecciones: makeLessons('c3m2', 8, 12) },
    { id: 'm3-3', titulo: 'Estrategia Ágil', orden: 3, lecciones: makeLessons('c3m3', 8, 15) },
    { id: 'm3-4', titulo: 'Liderando Equipos de Innovación', orden: 4, lecciones: makeLessons('c3m4', 8, 20) },
  ],
  'c4': [
    { id: 'm4-1', titulo: 'Fundamentos de Estadística', orden: 1, lecciones: makeLessons('c4m1', 10, 10) },
    { id: 'm4-2', titulo: 'Python para Ciencia de Datos', orden: 2, lecciones: makeLessons('c4m2', 12, 12) },
    { id: 'm4-3', titulo: 'Machine Learning Básico', orden: 3, lecciones: makeLessons('c4m3', 10, 15) },
    { id: 'm4-4', titulo: 'Visualización de Datos', orden: 4, lecciones: makeLessons('c4m4', 10, 18) },
  ],
  'c5': [
    { id: 'm5-1', titulo: 'Fundamentos de Seguridad', orden: 1, lecciones: makeLessons('c5m1', 9, 8) },
    { id: 'm5-2', titulo: 'Seguridad de Redes', orden: 2, lecciones: makeLessons('c5m2', 9, 12) },
    { id: 'm5-3', titulo: 'Encriptación y Criptografía', orden: 3, lecciones: makeLessons('c5m3', 9, 15) },
    { id: 'm5-4', titulo: 'Respuesta a Incidentes', orden: 4, lecciones: makeLessons('c5m4', 9, 20) },
  ],
  'c6': [
    { id: 'm6-1', titulo: 'Tokens de Diseño y Variables', orden: 1, lecciones: makeLessons('c6m1', 7, 8) },
    { id: 'm6-2', titulo: 'Arquitectura de Componentes', orden: 2, lecciones: makeLessons('c6m2', 8, 12) },
    { id: 'm6-3', titulo: 'Patrones de Accesibilidad', orden: 3, lecciones: makeLessons('c6m3', 8, 15) },
    { id: 'm6-4', titulo: 'Flujo Figma a Código', orden: 4, lecciones: makeLessons('c6m4', 7, 18) },
  ],
};

export const reviews = {
  'c1': [
    { id: 'r1', usuario_nombre: 'María García', calificacion: 5, comentario: 'Este curso cambió completamente mi forma de pensar sobre desarrollo frontend. El módulo de patrones de diseño fue una revelación.', created_at: daysAgo(2) },
    { id: 'r2', usuario_nombre: 'Carlos Mendoza', calificacion: 5, comentario: 'El mejor curso de arquitectura que he tomado. La Dra. Jenkins explica conceptos complejos con una claridad increíble.', created_at: daysAgo(7) },
  ],
  'c2': [
    { id: 'r4', usuario_nombre: 'Ana López', calificacion: 5, comentario: 'Marcus es un verdadero maestro. Este curso elevó mi carrera de diseño.', created_at: daysAgo(3) },
    { id: 'r5', usuario_nombre: 'Pedro Ramírez', calificacion: 5, comentario: 'Por fin un curso de diseño que cubre el lado estratégico del branding, no solo la estética.', created_at: daysAgo(10) },
  ],
  'c3': [
    { id: 'r6', usuario_nombre: 'Luisa Fernández', calificacion: 4, comentario: 'Excelentes marcos de trabajo. Los apliqué en mi startup y vi resultados inmediatos.', created_at: daysAgo(5) },
  ],
  'c4': [
    { id: 'r8', usuario_nombre: 'Diego Morales', calificacion: 5, comentario: 'Increíble introducción a ciencia de datos. Los ejercicios de Python están perfectamente dosificados.', created_at: daysAgo(1) },
  ],
  'c5': [
    { id: 'r9', usuario_nombre: 'Sofía Martínez', calificacion: 4, comentario: 'Muy práctico. Los ejercicios de laboratorio simulando ataques reales fueron reveladores.', created_at: daysAgo(8) },
  ],
  'c6': [
    { id: 'r10', usuario_nombre: 'Alex Rivera', calificacion: 5, comentario: 'El enfoque de Lisa para sistemas de diseño es el estándar de oro. Un curso obligatorio.', created_at: daysAgo(4) },
  ],
};

export let cart = [];
let cartIdCounter = 1;

export function addToCartMock(slug) {
  const course = courses.find(c => c.slug === slug);
  if (!course) throw new Error('Curso no encontrado');
  const existing = cart.find(i => i.curso_id === course.id);
  if (existing) return existing;
  const item = { id: `ci${cartIdCounter++}`, curso_id: course.id, slug: course.slug, titulo: course.titulo, instructor: course.instructor, precio: course.precio, imagen_url: course.imagen_url };
  cart.push(item);
  return item;
}

export function removeFromCartMock(id) { cart = cart.filter(i => i.id !== id); }
export function clearCartMock() { cart = []; cartIdCounter = 1; }

export const enrollments = [
  { id: 'en1', curso_id: 'c6', slug: 'sistemas-diseno-ui-avanzados', titulo: 'Sistemas de Diseño UI Avanzados', instructor: 'Lisa Chen', imagen_url: '', porcentaje_avance: 75, lecciones_completadas: 12, total_lecciones: 16 },
  { id: 'en2', curso_id: 'c4', slug: 'fundamentos-ciencia-datos', titulo: 'Fundamentos de Ciencia de Datos', instructor: 'Prof. Alex Kim', imagen_url: '', porcentaje_avance: 32, lecciones_completadas: 8, total_lecciones: 25 },
  { id: 'en3', curso_id: 'c1', slug: 'arquitectura-react-avanzada', titulo: 'Arquitectura Avanzada en React', instructor: 'Dra. Sarah Jenkins', imagen_url: '', porcentaje_avance: 90, lecciones_completadas: 18, total_lecciones: 20 },
  { id: 'en4', curso_id: 'c3', slug: 'innovacion-gestion-estrategica', titulo: 'Innovación y Gestión Estratégica', instructor: 'Dra. Elena Rodríguez', imagen_url: '', porcentaje_avance: 15, lecciones_completadas: 3, total_lecciones: 20 },
];

export const certificates = [
  { id: 'cert1', codigo: 'EDU-2023-0001', curso_titulo: 'Sistemas Visuales e Identidad de Marca', estudiante_nombre: 'Alex Rivera', instructor_nombre: 'Marcus Thorne', fecha_emision: '2023-10-15' },
  { id: 'cert2', codigo: 'EDU-2023-0002', curso_titulo: 'Ciberseguridad Esencial', estudiante_nombre: 'Alex Rivera', instructor_nombre: 'James Wilson', fecha_emision: '2023-08-22' },
];

export const instructorCourses = [
  { id: 'c1', slug: 'arquitectura-react-avanzada', titulo: 'Arquitectura Avanzada en React', categoria: 'Programación', total_estudiantes: 4200, calificacion_promedio: 4.8, estado: 'publicado', imagen_url: '', instructor_id: 'i1' },
  { id: 'c5', slug: 'ciberseguridad-esencial', titulo: 'Ciberseguridad Esencial', categoria: 'Tecnología', total_estudiantes: 856, calificacion_promedio: 4.5, estado: 'borrador', imagen_url: '', instructor_id: 'i1' },
  { id: 'c3', slug: 'innovacion-gestion-estrategica', titulo: 'Innovación y Gestión Estratégica', categoria: 'Negocios', total_estudiantes: 2100, calificacion_promedio: 4.2, estado: 'archivado', imagen_url: '', instructor_id: 'i1' },
];

export const instructorEarnings = {
  net_earnings: 69500.00,
  gross_earnings: 99300.00,
  platform_fee: 29800.00,
  total_balance: 187800.00,
};

export const students = {
  'u1': { id: 'u1', nombre: 'Alex Rivera', email: 'alex@demo.com', rol: 'estudiante' },
  'u2': { id: 'u2', nombre: 'Dra. Sarah Jenkins', email: 'sarah@demo.com', rol: 'instructor' },
};
