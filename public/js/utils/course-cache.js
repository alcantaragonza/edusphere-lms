/**
 * Cache de cursos — Mapea slug ↔ id para routing amigable.
 * Se puebla al cargar el catálogo.
 */
const courseMap = new Map(); // slug → { id, titulo, ... }

export function cacheCourses(courses) {
  for (const c of (Array.isArray(courses) ? courses : (courses.data || courses.cursos || []))) {
    if (c.id && c.slug) {
      courseMap.set(c.slug, { id: c.id, titulo: c.titulo, slug: c.slug });
    }
  }
}

export function getCourseBySlug(slug) {
  return courseMap.get(slug) || null;
}

export function getAllCachedCourses() {
  return [...courseMap.values()];
}

export function clearCache() {
  courseMap.clear();
}
