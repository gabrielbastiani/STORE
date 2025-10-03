"use client";

import { useEffect, useState } from "react";
import { setupAPIClient } from "@/services/api";

export default function usePromotionsForProduct(productId?: string, variantId?: string, variantSku?: string) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<any>(null);

    const [all, setAll] = useState<any[]>([]);
    const [productPromotions, setProductPromotions] = useState<any[]>([]);
    const [productMainPromotion, setProductMainPromotion] = useState<any | null>(null);
    const [variantPromotions, setVariantPromotions] = useState<Record<string, any[]>>({});
    const [variantMainPromotions, setVariantMainPromotions] = useState<Record<string, any | null>>({});

    useEffect(() => {
        if (!productId && !variantId && !variantSku) {
            setAll([]); setProductPromotions([]); setProductMainPromotion(null);
            setVariantPromotions({}); setVariantMainPromotions({}); setError(null); setLoading(false);
            return;
        }

        let mounted = true;
        const api = setupAPIClient();

        (async () => {
            setLoading(true);
            setError(null);
            try {
                const params: any = {};
                if (productId) params.product_id = productId;
                if (variantId) params.variant_id = variantId;
                if (variantSku) params.variant_sku = variantSku;

                const resp = await api.get("/store/promotions", { params });
                if (!mounted) return;

                const data = resp.data || {};
                setAll(Array.isArray(data.all) ? data.all : []);
                setProductPromotions(Array.isArray(data.productPromotions) ? data.productPromotions : []);
                setProductMainPromotion(data.productMainPromotion ?? null);
                setVariantPromotions(typeof data.variantPromotions === "object" && data.variantPromotions ? data.variantPromotions : {});
                setVariantMainPromotions(typeof data.variantMainPromotions === "object" && data.variantMainPromotions ? data.variantMainPromotions : {});
            } catch (err) {
                console.error("usePromotionsForProduct error:", err);
                setError(err);
                setAll([]); setProductPromotions([]); setProductMainPromotion(null);
                setVariantPromotions({}); setVariantMainPromotions({});
            } finally {
                if (mounted) setLoading(false);
            }
        })();

        return () => { mounted = false; };
    }, [productId, variantId, variantSku]);

    return { loading, error, all, productPromotions, productMainPromotion, variantPromotions, variantMainPromotions };
}