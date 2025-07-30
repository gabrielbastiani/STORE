import { useEffect, useState } from "react";
import { useCart } from "@/app/contexts/CartContext";
import axios from "axios";

export interface PromotionResult {
    discountTotal: number;
    freeGifts: Array<{ variantId: string; quantity: number }>;
    badgeMap: Record<string, { title: string; imageUrl: string }>;
    descriptions: string[];
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
        descriptions: []
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // só chame se houver cupom aplicado OU se mudar frete/cep sem cupom
        if (!cart.items.length) {
            setPromo({ discountTotal: 0, freeGifts: [], badgeMap: {}, descriptions: [] });
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
                    setError("Cupom inválido ou não aplicável.");
                }
            })
            .catch(() => {
                setError("Erro ao aplicar promoções.");
                setPromo({ discountTotal: 0, freeGifts: [], badgeMap: {}, descriptions: [] });
            })
            .finally(() => setLoading(false));
    }, [cart.items, cep, appliedCoupon, shippingCost, isFirstPurchase]);

    return { ...promo, loading, error };
}