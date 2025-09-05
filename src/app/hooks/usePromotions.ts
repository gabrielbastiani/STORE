'use client'

import { useEffect, useState } from 'react';
import { useCart } from '@/app/contexts/CartContext';
import axios from 'axios';

export interface PromotionDetail {
  id: string;
  name: string;
  description: string;
  discount: number;
  type: 'product' | 'shipping' | 'mixed';
  display?: { kind: 'percent'; percent: number; amount: number } | { kind: 'currency'; amount: number } | { kind: 'none' };
}

export interface FreeGift {
  productId?: string;
  variantId?: string;
  sku?: string;
  quantity: number;
  isVariant: boolean;
  name?: string;
  unitPrice?: number | null;
}

export interface PromotionResult {
  discountTotal: number;
  freeGifts: FreeGift[];
  badgeMap: Record<string, { title: string; imageUrl: string }>;
  descriptions: string[];
  promotions: PromotionDetail[];
}

export function usePromotions(
  cep: string,
  appliedCoupon: string | null,
  shippingCost: number,
  customerId: string | null
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
    if (!cart.items || cart.items.length === 0) {
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
      .post<PromotionResult>(`${process.env.NEXT_PUBLIC_API_URL}/promotions/apply`, {
        cartItems: cart.items.map((i) => ({
          variantId: i.variant_id,
          sku: i.variant_sku,
          productId: i.product_id,
          quantity: i.quantity,
          unitPrice: i.price,
        })),
        customer_id: customerId ?? null,
        cep: cep || null,
        couponCode: appliedCoupon || null,
        shippingCost,
      })
      .then((res) => {
        setPromo(res.data);
        if (appliedCoupon && res.data.discountTotal === 0 && (!res.data.promotions || res.data.promotions.length === 0)) {
          setError('Cupom inválido ou não aplicável.');
        } else {
          setError(null);
        }
      })
      .catch((err) => {
        console.error('usePromotions error:', err);
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
    JSON.stringify(cart.items.map((i) => ({ id: i.id, q: i.quantity, p: i.product_id, v: i.variant_id }))),
    cep,
    appliedCoupon,
    shippingCost,
    customerId,
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