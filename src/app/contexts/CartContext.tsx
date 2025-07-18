"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  fetchCart,
  apiAddItem,
  apiUpdateItem,
  apiRemoveItem,
  apiClearCart,
} from "@/services/cart";
import axios from "axios";
import { Cart, CartItem } from "Types/types"; 

interface CartContextValue {
  cart: Cart;
  cartCount: number;
  loading: boolean;
  addItem: (productId: string, quantity?: number) => Promise<void>;
  updateItem: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
}

export const CartContext = createContext<CartContextValue | undefined>(
  undefined
);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart>({
    id: "",
    items: [],
    subtotal: 0,
    shippingCost: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);

  // axios para buscar produto no guest cart
  const productAPI = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL,
  });

  // calcula subtotal + total
  function recalc(items: CartItem[], shippingCost = cart.shippingCost): Cart {
    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const total = subtotal + shippingCost;
    return {
      id: cart.id,
      items,
      subtotal,
      shippingCost,
      total,
    };
  }

  // Carrega carrinho do backend ou guest
  useEffect(() => {
    async function load() {
      try {
        const backendCart = await fetchCart();
        setCart(backendCart);
      } catch {
        // se falhar, tenta guest
        const guest = localStorage.getItem("guest_cart");
        if (guest) {
          setCart(JSON.parse(guest));
        } else {
          setCart({ id: "", items: [], subtotal: 0, shippingCost: 0, total: 0 });
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // sincroniza guest_cart
  useEffect(() => {
    if (!cart.id) {
      localStorage.setItem("guest_cart", JSON.stringify(cart));
    }
  }, [cart]);

  // adiciona item
  const addItem = async (productId: string, quantity = 1) => {
    setLoading(true);
    try {
      if (cart.id) {
        // usuário logado: chama API
        const updated = await apiAddItem(productId, quantity);
        setCart(updated);
      } else {
        // guest: busca detalhes do produto para preencher nome e preço
        // se já existir, apenas incrementa
        const exists = cart.items.find((i) => i.product_id === productId);
        let items: CartItem[];
        if (exists) {
          items = cart.items.map((i) =>
            i.product_id === productId
              ? { ...i, quantity: i.quantity + quantity }
              : i
          );
        } else {
          // busca produto
          const { data: prod } = await productAPI.get<{
            id: string;
            name: string;
            images: any;
            price_per: number;
          }>(`/product/unique/data?product_id=${productId}`);
          items = [
            ...cart.items,
            {
              id: crypto.randomUUID(),
              product_id: productId,
              name: prod.name,
              images: prod.images[0].url,
              price: prod.price_per,
              quantity,
            },
          ];
        }
        setCart(recalc(items));
      }
    } finally {
      setLoading(false);
    }
  };

  // atualiza quantidade
  const updateItem = async (itemId: string, quantity: number) => {
    setLoading(true);
    try {
      if (cart.id) {
        const updated = await apiUpdateItem(itemId, quantity);
        setCart(updated);
      } else {
        const items = cart.items.map((i) =>
          i.id === itemId ? { ...i, quantity } : i
        );
        setCart(recalc(items));
      }
    } finally {
      setLoading(false);
    }
  };

  // remove item
  const removeItem = async (itemId: string) => {
    setLoading(true);
    try {
      if (cart.id) {
        const updated = await apiRemoveItem(itemId);
        setCart(updated);
      } else {
        const items = cart.items.filter((i) => i.id !== itemId);
        setCart(recalc(items));
      }
    } finally {
      setLoading(false);
    }
  };

  // limpa carrinho
  const clearCart = async () => {
    setLoading(true);
    try {
      if (cart.id) {
        const emptied = await apiClearCart();
        setCart(emptied);
      } else {
        setCart({ id: "", items: [], subtotal: 0, shippingCost: 0, total: 0 });
      }
    } finally {
      setLoading(false);
    }
  };

  const cartCount = cart.items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        cartCount,
        loading,
        addItem,
        updateItem,
        removeItem,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}