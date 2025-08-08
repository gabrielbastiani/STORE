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
  addItem: (productId: string, quantity?: number, variantId?: string | null) => Promise<void>;
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

  const productAPI = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL,
  });

  // Recalcula subtotal + total
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

  // Carrega do backend ou guest
  useEffect(() => {
    async function load() {
      try {
        const backendCart = await fetchCart();
        setCart(backendCart);
      } catch {
        const guest = localStorage.getItem("guest_cart");
        if (guest) setCart(JSON.parse(guest));
        else setCart({ id: "", items: [], subtotal: 0, shippingCost: 0, total: 0 });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Sincroniza guest_cart
  useEffect(() => {
    if (!cart.id) {
      localStorage.setItem("guest_cart", JSON.stringify(cart));
    }
  }, [cart]);

  // ADD (aceita variantId opcional que pode ser null)
  const addItem = async (productId: string, quantity = 1, variantId?: string | null) => {
    setLoading(true);
    try {
      if (cart.id) {
        // usuário autenticado -> repassa variantId ao backend
        const updated = await apiAddItem(productId, quantity, variantId ?? undefined);
        setCart(updated);
      } else {
        // guest -> adicionar localmente; buscar produto para preencher dados
        // procurar item já existente com mesma product + mesma variant (null tratado)
        const exists = cart.items.find((i) => i.product_id === productId && (i.variant_id ?? null) === (variantId ?? null));
        let items: CartItem[];

        if (exists) {
          // se já existe item com mesmo product+variant, apenas atualiza qty
          items = cart.items.map((i) =>
            i.product_id === productId && (i.variant_id ?? null) === (variantId ?? null)
              ? { ...i, quantity: i.quantity + quantity }
              : i
          );
        } else {
          // buscar product com variantes completas
          const { data: prod } = await productAPI.get<any>(`/product/unique/data?product_id=${productId}`);

          // se passarem variantId, tentar encontrar os dados da variante
          let chosenVariant: any = null;
          if (variantId && Array.isArray(prod?.variants)) {
            chosenVariant = prod.variants.find((v: any) => v.id === variantId) ?? null;
          }

          const imageUrl =
            chosenVariant?.productVariantImage?.[0]?.url ||
            prod?.images?.[0]?.url ||
            "";

          const price = chosenVariant?.price_per ?? prod?.price_per ?? 0;

          const newItem: CartItem = {
            id: crypto.randomUUID(),
            product_id: productId,
            name: prod?.name ?? "Produto",
            images: imageUrl,
            price,
            quantity,
            weight: prod?.weight ?? 0,
            length: prod?.length ?? 0,
            width: prod?.width ?? 0,
            height: prod?.height ?? 0,
            // mantemos variant_id como null se não houver variante
            variant_id: chosenVariant?.id ?? null,
          };

          items = [...cart.items, newItem];
        }
        setCart(recalc(items));
      }
    } finally {
      setLoading(false);
    }
  };

  // UPDATE
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

  // REMOVE
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

  // CLEAR
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