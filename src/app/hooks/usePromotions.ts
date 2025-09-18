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
  productDiscount?: number; // novo
  shippingDiscount?: number; // novo
  freeGifts: FreeGift[];
  badgeMap: Record<string, { title: string; imageUrl: string }>;
  descriptions: string[];
  promotions: PromotionDetail[];
  skippedPromotions?: Array<{ id: string; reason: string }>; // <-- novo
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
    productDiscount: 0,
    shippingDiscount: 0,
    freeGifts: [],
    badgeMap: {},
    descriptions: [],
    promotions: [],
    skippedPromotions: [],
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // se não tiver items, limpa e retorna
    if (!cart?.items || cart.items.length === 0) {
      setPromo({
        discountTotal: 0,
        productDiscount: 0,
        shippingDiscount: 0,
        freeGifts: [],
        badgeMap: {},
        descriptions: [],
        promotions: [],
        skippedPromotions: [],
      });
      setError(null);
      return;
    }

    const controller = new AbortController();
    const signal = controller.signal;

    async function run() {
      setLoading(true);
      setError(null);

      try {
        const payload = {
          cartItems: cart.items.map((i) => ({
            variantId: i.variant_id ?? null,
            sku: i.variant_sku ?? null,
            productId: i.product_id,
            quantity: i.quantity,
            unitPrice: i.price,
          })),
          customer_id: customerId ?? null,
          cep: cep || null,
          couponCode: appliedCoupon || null,
          shippingCost,
        };

        const res = await axios.post<PromotionResult & { skippedPromotions?: Array<{ id: string; reason: string }> }>(
          `${process.env.NEXT_PUBLIC_API_URL}/promotions/apply`,
          payload,
          { signal }
        );

        const data = res.data ?? {
          discountTotal: 0,
          productDiscount: 0,
          shippingDiscount: 0,
          freeGifts: [],
          badgeMap: {},
          descriptions: [],
          promotions: [],
          skippedPromotions: [],
        };

        // Normalizar / arredondar
        const discountTotal = Number((data.discountTotal ?? 0).toFixed(2));

        // shippingDiscount fallback: prefer o que veio do backend, senão derive a partir de promotions
        let shippingDiscountRaw: number;
        if (typeof (data as any).shippingDiscount === 'number') {
          shippingDiscountRaw = (data as any).shippingDiscount;
        } else {
          shippingDiscountRaw = (data.promotions ?? []).filter(p => p.type === 'shipping').reduce((s, p) => s + (p.discount ?? 0), 0);
        }
        const shippingDiscount = Number((shippingDiscountRaw || 0).toFixed(2));

        // productDiscount fallback: prefer backend, senão discountTotal - shippingDiscount
        let productDiscountRaw: number;
        if (typeof (data as any).productDiscount === 'number') {
          productDiscountRaw = (data as any).productDiscount;
        } else {
          productDiscountRaw = (discountTotal - shippingDiscount);
        }
        const productDiscount = Number((productDiscountRaw || 0).toFixed(2));

        // montar novo estado coerente
        const normalized: PromotionResult = {
          discountTotal,
          productDiscount,
          shippingDiscount,
          freeGifts: data.freeGifts ?? [],
          badgeMap: data.badgeMap ?? {},
          descriptions: data.descriptions ?? [],
          promotions: (data.promotions ?? []).map(p => ({ ...p, discount: Number((p.discount ?? 0).toFixed(2)) })),
          skippedPromotions: (data as any).skippedPromotions ?? [],
        };

        setPromo(normalized);

        // lógica de cupom inválido mantida — usa valores normalizados
        if (appliedCoupon && normalized.discountTotal === 0 && (!normalized.promotions || normalized.promotions.length === 0)) {
          setError('Cupom inválido ou não aplicável.');
        } else {
          setError(null);
        }
      } catch (err: any) {
        if (axios.isCancel?.(err) || err?.name === 'CanceledError' || err?.name === 'AbortError') {
          // requisição cancelada - não setar estado
          return;
        }
        console.error('usePromotions error:', err);
        setError('Erro ao aplicar promoções.');
        setPromo({
          discountTotal: 0,
          productDiscount: 0,
          shippingDiscount: 0,
          freeGifts: [],
          badgeMap: {},
          descriptions: [],
          promotions: [],
          skippedPromotions: [],
        });
      } finally {
        setLoading(false);
      }
    }

    run();

    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    // dependência robusta apenas no que importa dos items para evitar re-renders excessivos
    JSON.stringify(cart.items.map((i) => ({ id: i.id, q: i.quantity, p: i.product_id, v: i.variant_id, price: i.price }))),
    cep,
    appliedCoupon,
    shippingCost,
    customerId,
  ]);

  return {
    discountTotal: promo.discountTotal,
    productDiscount: promo.productDiscount ?? 0,
    shippingDiscount: promo.shippingDiscount ?? 0,
    freeGifts: promo.freeGifts,
    badgeMap: promo.badgeMap,
    descriptions: promo.descriptions,
    promotions: promo.promotions,
    skippedPromotions: promo.skippedPromotions ?? [],
    loading,
    error,
  };
}