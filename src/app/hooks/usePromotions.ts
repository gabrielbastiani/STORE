// src/app/hooks/usePromotions.ts
'use client';

import { useEffect, useState } from 'react';
import { useCart } from '@/app/contexts/CartContext';
import axios from 'axios';

export interface PromotionDetail {
    id: string;
    name: string;
    description: string;
    discount: number;
    type: 'product' | 'shipping' | 'mixed';
}

export interface PromotionResult {
    discountTotal: number;
    freeGifts: Array<{ variantId: string; quantity: number }>;
    badgeMap: Record<string, { title: string; imageUrl: string }>;
    descriptions: string[];
    promotions: PromotionDetail[];
}

export function usePromotions(
    cep: string,
    appliedCoupon: string | null,
    shippingCost: number,
    isFirstPurchase: boolean
) {
    const { cart } = useCart();

    const [promo, setPromo] = useState<PromotionResult>({
        discountTotal: 0,
        freeGifts: [],
        badgeMap: {},
        descriptions: [],
        promotions: [],
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!cart.items.length) {
            setPromo({
                discountTotal: 0,
                freeGifts: [],
                badgeMap: {},
                descriptions: [],
                promotions: [],
            });
            setError(null);
            return;
        }

        setLoading(true);
        setError(null);

        axios
            .post<PromotionResult>(
                `${process.env.NEXT_PUBLIC_API_URL}/promotions/apply`,
                {
                    cartItems: cart.items.map((i) => ({
                        variantId: i.variant_id,
                        productId: i.product_id,
                        quantity: i.quantity,
                        unitPrice: i.price,
                    })),
                    customer_id: cart.id || null,
                    isFirstPurchase,
                    cep: cep || null,
                    couponCode: appliedCoupon || null,
                    shippingCost,
                }
            )
            .then((res) => {
                setPromo(res.data);
                if (appliedCoupon && res.data.discountTotal === 0) {
                    setError('Cupom inválido ou não aplicável.');
                }
            })
            .catch(() => {
                setError('Erro ao aplicar promoções.');
                setPromo({
                    discountTotal: 0,
                    freeGifts: [],
                    badgeMap: {},
                    descriptions: [],
                    promotions: [],
                });
            })
            .finally(() => setLoading(false));
    }, [
        cart.items,
        cep,
        appliedCoupon,
        shippingCost,
        isFirstPurchase,
    ]);

    return {
        discountTotal: promo.discountTotal,
        freeGifts: promo.freeGifts,
        badgeMap: promo.badgeMap,
        descriptions: promo.descriptions,
        promotions: promo.promotions,
        loading,
        error,
    };
}