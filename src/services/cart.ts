import axios from 'axios';
import { Cart } from 'Types/types'; 

const API = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
});

export async function fetchCart(): Promise<Cart> {
  const { data } = await API.get<Cart>('/cart');
  return data;
}

export async function apiAddItem(productId: string, quantity = 1): Promise<Cart> {
  const { data } = await API.post<Cart>('/cart/items', { product_id: productId, quantity });
  return data;
}

export async function apiUpdateItem(itemId: string, quantity: number): Promise<Cart> {
  const { data } = await API.put<Cart>(`/cart/items/${itemId}`, { quantity });
  return data;
}

export async function apiRemoveItem(itemId: string): Promise<Cart> {
  const { data } = await API.delete<Cart>(`/cart/items/${itemId}`);
  return data;
}

export async function apiClearCart(): Promise<Cart> {
  const { data } = await API.delete<Cart>('/cart');
  return data;
}