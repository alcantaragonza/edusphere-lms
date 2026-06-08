import { api } from './client.js';

export async function getCart() {
  return api.get('/carrito');
}

export async function addToCart(cursoId, precio) {
  const userId = localStorage.getItem('edusphere_user_id');
  return api.post('/carrito', {
    estudiante_id: userId,
    curso_id: cursoId,
    precio_snapshot: String(precio || 0),
  });
}

export async function removeFromCart(itemId) {
  return api.delete(`/carrito/${itemId}`);
}
