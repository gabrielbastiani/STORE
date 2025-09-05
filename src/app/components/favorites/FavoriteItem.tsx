"use client"

import React, { useMemo } from "react";
import Image from "next/image";
import ThumbsCarousel from "./ThumbsCarousel";
import VariantSelector from "./VariantSelector";
import QuantityControl from "./QuantityControl";
import { safeUrl, computePrimaryImage, formatCurrency } from "./utils";
import type { Product, AttrMap } from "./types";

type Props = {
    product: Product;
    quantity: number;
    setQuantity: (q: number) => void;
    selectedVariantId: string | null;
    setSelectedVariantId: (id: string | null) => void;
    selectedAttributes: AttrMap;
    setSelectedAttributes: (attrs: AttrMap) => void;
    primaryImage: string | null;
    setPrimaryImage: (u: string | null) => void;
    onAddToCart: () => void;
    onRemoveFavorite: () => void;
};

export default function FavoriteItem({
    product,
    quantity,
    setQuantity,
    selectedVariantId,
    setSelectedVariantId,
    selectedAttributes,
    setSelectedAttributes,
    primaryImage,
    setPrimaryImage,
    onAddToCart,
    onRemoveFavorite,
}: Props) {
    const availableVariants = product?.variants ?? [];
    const selVariantId = selectedVariantId ?? availableVariants?.[0]?.id ?? null;
    const selVariant = availableVariants.find((v: any) => v.id === selVariantId) ?? null;
    const price = selVariant?.price_per ?? selVariant?.price_of ?? product?.price_per ?? product?.price_of;

    // attrs aggregated
    const attrsMap: Record<string, string[]> = useMemo(() => {
        const map: Record<string, string[]> = {};
        (product.variants || []).forEach((v: any) => {
            (v.variantAttribute || []).forEach((a: any) => {
                const k = a.key ?? a.name ?? "";
                const val = a.value ?? String(a.val ?? "");
                map[k] = map[k] ?? [];
                if (!map[k].includes(val)) map[k].push(val);
            });
        });
        return map;
    }, [product]);

    // thumbs
    const thumbsSet = new Set<string>();
    (product.images || []).forEach((it: any) => thumbsSet.add(typeof it === "string" ? it : it.url));
    (selVariant?.productVariantImage || []).forEach((it: any) => thumbsSet.add(it?.url ?? it));
    (selVariant?.variantAttribute || []).forEach((a: any) => {
        (a.variantAttributeImage || []).forEach((ai: any) => thumbsSet.add(ai?.url ?? ai));
    });
    const thumbs = Array.from(thumbsSet).map((t) => safeUrl(t)).filter(Boolean) as string[];

    const handleAttributePick = (key: string, value: string) => {
        const next = { ...(selectedAttributes || {}) } as AttrMap;
        next[key] = value;

        // try to find matching variant
        const found = product.variants?.find((v: any) => {
            if (!v.variantAttribute || !Array.isArray(v.variantAttribute)) return false;
            return Object.entries(next).every(([k, val]) =>
                v.variantAttribute.some((a: any) => (a.key ?? a.name) === k && String(a.value ?? a.val) === String(val))
            );
        });

        if (found) {
            setSelectedVariantId(found.id);
            setPrimaryImage(computePrimaryImage(product, found, next));
        } else {
            const currentVariantId = selVariantId ?? product?.variants?.[0]?.id ?? null;
            const currentVariant = product.variants?.find((v: any) => v.id === currentVariantId) ?? null;
            setPrimaryImage(computePrimaryImage(product, currentVariant, next));
        }

        setSelectedAttributes(next);
    };

    const handleVariantSelect = (variantId: string) => {
        const variant = product.variants?.find((v: any) => v.id === variantId) ?? null;
        setSelectedVariantId(variantId);

        const attrMap: AttrMap = {};
        if (variant?.variantAttribute && Array.isArray(variant.variantAttribute)) {
            variant.variantAttribute.forEach((a: any) => {
                const key = a.key ?? a.name ?? "";
                attrMap[key] = a.value ?? String(a.val ?? "");
            });
        }
        setSelectedAttributes(attrMap);
        setPrimaryImage(computePrimaryImage(product, variant, attrMap));
    };

    const handleThumbClick = (productId: string, url: string) => setPrimaryImage(url);

    return (
        <article className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex flex-col sm:flex-row gap-4 p-4">
                <div className="w-full sm:w-44 flex-shrink-0">
                    <div className="w-full h-56 sm:h-40 bg-gray-50 rounded-lg overflow-hidden flex items-center justify-center">
                        {primaryImage ? (
                            <Image src={primaryImage} alt={product.name ?? "Produto"} width={600} height={600} style={{ width: "100%", height: "100%", objectFit: "contain" }} priority={false} unoptimized />
                        ) : (
                            <div className="text-gray-400">Sem imagem</div>
                        )}
                    </div>

                    <ThumbsCarousel productId={product.id} thumbs={thumbs} onThumbClick={handleThumbClick} />
                </div>

                <div className="flex-1 flex flex-col">
                    <div className="flex items-start justify-between">
                        <div className="pr-2">
                            <h3 className="text-base sm:text-lg font-semibold text-black">{product.name}</h3>
                            {product.brand && <p className="text-sm text-gray-500 mt-1">{product.brand}</p>}
                        </div>

                        <div className="text-right">
                            <div className="text-lg sm:text-xl font-bold text-red-600">{formatCurrency(price)}</div>
                            {product.price_of && product.price_of !== price && <div className="text-sm text-gray-500 line-through">{formatCurrency(product.price_of)}</div>}
                        </div>
                    </div>

                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                        <div>
                            {Object.entries(attrsMap).map(([key, values]) => (
                                <div key={key} className="mb-3">
                                    <div className="text-sm text-gray-600 mb-2">{key}</div>
                                    <div className="flex flex-wrap gap-2">
                                        {values.map((val) => {
                                            const active = (selectedAttributes || {})[key] === val;
                                            return (
                                                <button key={val} onClick={() => handleAttributePick(key, val)} className={`px-3 py-1 rounded-full border text-sm transition ${active ? "bg-orange-500 text-black border-orange-600" : "bg-white text-gray-700 border-gray-200"}`}>
                                                    {val}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}

                            <VariantSelector availableVariants={availableVariants} selectedVariantId={selVariantId} onSelect={handleVariantSelect} />
                        </div>

                        <div className="flex flex-col items-stretch sm:items-end gap-3 text-black">
                            <QuantityControl quantity={quantity} setQuantity={setQuantity} />

                            <div className="flex flex-col sm:flex-row gap-2 w-full">
                                <button onClick={onAddToCart} className="w-full sm:w-auto px-4 py-2 rounded-2xl bg-red-500 text-white font-medium text-sm">Adicionar ao carrinho</button>
                                <button onClick={onRemoveFavorite} className="w-full sm:w-auto px-4 py-2 rounded-2xl border text-sm bg-gray-500 text-white">Excluir</button>
                            </div>

                            <div className="text-xs text-gray-500 mt-2">SKU: {product.skuMaster}</div>
                            <div className="text-xs text-gray-500">Visualizações: {product.view ?? 0}</div>
                        </div>
                    </div>
                </div>
            </div>
        </article>
    );
}