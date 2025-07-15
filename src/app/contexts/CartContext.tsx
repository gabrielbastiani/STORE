'use client';

import React, {
    createContext,
    useContext,
    useEffect,
    useState,
    ReactNode,
} from 'react';
import {
    fetchCart,
    apiAddItem,
    apiUpdateItem,
    apiRemoveItem,
    apiClearCart,
} from '@/services/cart';
import { Cart, CartItem } from './types';

interface CartContextValue {
    cart: Cart | null;
    cartCount: number;
    loading: boolean;
    addItem: (productId: string, quantity?: number) => Promise<void>;
    updateItem: (itemId: string, quantity: number) => Promise<void>;
    removeItem: (itemId: string) => Promise<void>;
    clearCart: () => Promise<void>;
}

export const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {

    const [cart, setCart] = useState<Cart | null>(null);
    const [loading, setLoading] = useState(true);

    // Carrega o carrinho (backend ou localStorage)
    useEffect(() => {
        async function load() {
            try {
                const backendCart = await fetchCart();
                setCart(backendCart);
            } catch (err) {
                // guest: tenta carregar do localStorage
                const guest = localStorage.getItem('guest_cart');
                if (guest) {
                    setCart(JSON.parse(guest));
                } else {
                    setCart({ id: '', items: [], subtotal: 0, shippingCost: 0, total: 0 });
                }
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    // Sincroniza guest cart no localStorage sempre que muda
    useEffect(() => {
        if (cart && !cart.id) {
            localStorage.setItem('guest_cart', JSON.stringify(cart));
        }
    }, [cart]);

    // Helpers para recalcular totais
    const recalc = (items: CartItem[], shippingCost = 0): Cart => {
        const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
        return {
            id: cart?.id || '',
            items,
            subtotal,
            shippingCost,
            total: subtotal + shippingCost,
        };
    };

    const addItem = async (productId: string, quantity = 1) => {
        setLoading(true);
        try {
            if (cart?.id) {
                const updated = await apiAddItem(productId, quantity);
                setCart(updated);
            } else {
                // guest
                const exists = cart!.items.find((i) => i.product_id === productId);
                let items: CartItem[];
                if (exists) {
                    items = cart!.items.map((i) =>
                        i.product_id === productId
                            ? { ...i, quantity: i.quantity + quantity }
                            : i
                    );
                } else {
                    // Exemplo mínimo de fetch de dados do produto (pode expandir)
                    items = [
                        ...cart!.items,
                        { id: crypto.randomUUID(), product_id: productId, name: '', price: 0, quantity },
                    ];
                }
                setCart(recalc(items));
            }
        } finally {
            setLoading(false);
        }
    };

    const updateItem = async (itemId: string, quantity: number) => {
        setLoading(true);
        try {
            if (cart?.id) {
                const updated = await apiUpdateItem(itemId, quantity);
                setCart(updated);
            } else {
                const items = cart!.items.map((i) =>
                    i.id === itemId ? { ...i, quantity } : i
                );
                setCart(recalc(items));
            }
        } finally {
            setLoading(false);
        }
    };

    const removeItem = async (itemId: string) => {
        setLoading(true);
        try {
            if (cart?.id) {
                const updated = await apiRemoveItem(itemId);
                setCart(updated);
            } else {
                const items = cart!.items.filter((i) => i.id !== itemId);
                setCart(recalc(items));
            }
        } finally {
            setLoading(false);
        }
    };

    const clearCart = async () => {
        setLoading(true);
        try {
            if (cart?.id) {
                const emptied = await apiClearCart();
                setCart(emptied);
            } else {
                setCart({ id: '', items: [], subtotal: 0, shippingCost: 0, total: 0 });
            }
        } finally {
            setLoading(false);
        }
    };

    const cartCount = cart?.items.reduce((sum, i) => sum + i.quantity, 0) || 0;

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

// Hook auxiliar
export function useCart() {
    const ctx = useContext(CartContext);
    if (!ctx) throw new Error('useCart must be used within CartProvider');
    return ctx;
}