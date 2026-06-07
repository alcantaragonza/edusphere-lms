/**
 * Hash Router — SPA navigation.
 * Routes: { pattern, handler }
 */
export class Router {
  constructor(routes) {
    this.routes = routes;
    this.outlet = document.getElementById('app');
    window.addEventListener('hashchange', () => this.resolve());
  }

  init() {
    if (!window.location.hash) {
      window.location.hash = '#/';
    }
    this.resolve();
  }

  resolve() {
    const hash = window.location.hash.slice(1) || '/';
    const [path, ..._rest] = hash.split('?');
    for (const route of this.routes) {
      const params = this.match(route.pattern, path);
      if (params !== null) {
        this.outlet.innerHTML = '';
        try {
          route.handler(params);
        } catch (err) {
          console.error('Route error:', err);
          this.outlet.innerHTML = `<div class="container section"><p class="text-error">Error loading page</p></div>`;
        }
        return;
      }
    }
    // 404
    this.outlet.innerHTML = `
      <div class="container section text-center">
        <h1>404</h1>
        <p class="text-muted">Page not found</p>
        <a href="#/" class="btn btn-primary" style="margin-top:1rem">Go Home</a>
      </div>`;
  }

  match(pattern, path) {
    const patternParts = pattern.split('/');
    const pathParts = path.split('/');
    if (patternParts.length !== pathParts.length) return null;
    const params = {};
    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(':')) {
        params[patternParts[i].slice(1)] = pathParts[i];
      } else if (patternParts[i] !== pathParts[i]) {
        return null;
      }
    }
    return params;
  }

  navigate(path) {
    window.location.hash = `#${path}`;
  }
}
