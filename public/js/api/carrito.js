/**
 * Carrito API.
 */
import { api } from './client.js';

export async function getCart() {
  return api.get('/carrito');
}

export async function addToCart(cursoId) {
  return api.post('/carrito', { curso_id: cursoId });
}

export async function removeFromCart(itemId) {
  return api.delete(`/carrito/${itemId}`);
}

export async function getCartTotal() {
  return api.get('/carrito/total');
}
