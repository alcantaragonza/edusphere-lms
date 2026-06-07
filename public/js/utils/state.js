/**
 * Global reactive state.
 */
class State {
  #data;
  #listeners;

  constructor() {
    this.#data = {
      user: null,
      cartCount: 0,
      loading: false,
    };
    this.#listeners = new Map();

    try {
      const saved = localStorage.getItem('edusphere_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.#data.user = parsed.user || null;
        this.#data.cartCount = parsed.cartCount || 0;
      }
    } catch (_) {}
  }

  get user() { return this.#data.user; }
  set user(val) {
    this.#data.user = val;
    this.#persist();
    this.#emit('user', val);
  }

  get cartCount() { return this.#data.cartCount; }
  set cartCount(val) {
    this.#data.cartCount = val;
    this.#persist();
    this.#emit('cartCount', val);
  }

  get loading() { return this.#data.loading; }
  set loading(val) {
    this.#data.loading = val;
    this.#emit('loading', val);
  }

  isAuthenticated() { return !!this.#data.user; }
  hasRole(role) { return this.#data.user?.rol === role; }

  logout() {
    this.user = null;
    this.cartCount = 0;
    localStorage.removeItem('edusphere_token');
    localStorage.removeItem('edusphere_state');
  }

  on(key, fn) {
    if (!this.#listeners.has(key)) {
      this.#listeners.set(key, new Set());
    }
    this.#listeners.get(key).add(fn);
    // Return unsubscribe function
    return () => {
      const set = this.#listeners.get(key);
      if (set) set.delete(fn);
    };
  }

  #emit(key, val) {
    const fns = this.#listeners.get(key);
    if (fns) fns.forEach(fn => fn(val));
  }

  #persist() {
    try {
      localStorage.setItem('edusphere_state', JSON.stringify({
        user: this.#data.user,
        cartCount: this.#data.cartCount,
      }));
    } catch (_) {}
  }
}

export const state = new State();
