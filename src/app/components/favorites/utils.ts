"use client"

import type { Product, AttrMap } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export const formatCurrency = (n: number) => n?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) ?? "R$ 0,00";

export const safeUrl = (maybe: string | null) => {
    if (!maybe) return null;
    const s = String(maybe).trim();
    if (!s) return null;
    if (/^https?:\/\//.test(s)) return s;
    const filename = s.replace(/^\/+/, "");
    return `${API_URL.replace(/\/+$/, "")}/files/${filename}`;
};

export function computePrimaryImage(product: Product, variant: any, attrMap: AttrMap): string | null {
    if (variant?.variantAttribute && Array.isArray(variant.variantAttribute)) {
        for (const a of variant.variantAttribute) {
            const key = a.key ?? a.name ?? null;
            const val = a.value ?? String(a.val ?? "") ?? null;
            if (key && attrMap[key] && attrMap[key] === val) {
                const vImages = a.variantAttributeImage ?? a.variantAttributeImage;
                if (Array.isArray(vImages) && vImages.length) {
                    const primary = vImages.find((vi: any) => vi.isPrimary) ?? vImages[0];
                    const candidate = primary?.url ?? primary ?? null;
                    if (candidate) return safeUrl(candidate);
                }
            }
        }
    }

    if (variant?.productVariantImage && Array.isArray(variant.productVariantImage) && variant.productVariantImage.length) {
        const primary = variant.productVariantImage.find((i: any) => i.isPrimary) ?? variant.productVariantImage[0];
        const candidate = primary?.url ?? primary ?? null;
        if (candidate) return safeUrl(candidate);
    }

    const productImg = product?.images?.find((i: any) => i.isPrimary) ?? product?.images?.[0];
    if (productImg) {
        const candidate = typeof productImg === "string" ? productImg : productImg.url ?? null;
        if (candidate) return safeUrl(candidate);
    }

    return null;
}