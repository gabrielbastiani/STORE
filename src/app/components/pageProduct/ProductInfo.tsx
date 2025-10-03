"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Star } from "lucide-react";
import { ProductFormData, VariantFormData } from "Types/types";
import PromotionSection from "./PromotionSection";
import usePromotionsForProduct from "./hooksPromotions/usePromotionsForProduct";

interface ProductInfoProps {
  product: ProductFormData;
  selectedVariant: VariantFormData | null;
  formatPrice: (v: number) => string;
  hasDiscount: boolean;
  discount: number;
}

type VariantPromosMap = Record<string, any[]>;
type VariantMainMap = Record<string, any | null>;

export default function ProductInfo({
  product,
  selectedVariant,
  formatPrice,
  hasDiscount,
  discount
}: ProductInfoProps) {
  const [reviewStats, setReviewStats] = useState<{ averageRating: number; totalReviews: number } | null>(null);
  const [loadingReviews, setLoadingReviews] = useState(true);

  // Hook centralizado que consulta /store/promotions
  const {
    loading: hookLoading,
    error: hookError,
    all: hookAll,
    productPromotions: hookProductPromotions,
    productMainPromotion: hookProductMainPromotion,
    variantPromotions: hookVariantPromotions,
    variantMainPromotions: hookVariantMainPromotions,
    apiFetched
  } = usePromotionsForProduct(product?.id, selectedVariant?.id, selectedVariant?.sku);

  // --- UTILS ---
  const dedupeById = <T extends { id?: string }>(arr: T[]) => {
    const map = new Map<string, T>();
    arr.forEach(item => {
      const id = item && typeof item.id === "string" ? item.id : JSON.stringify(item);
      map.set(id, item);
    });
    return Array.from(map.values());
  };

  const isUsefulPromotion = (p: any) => {
    if (!p) return false;
    if (typeof p.id === "string" && p.id) return true;
    if (Array.isArray(p.displays) && p.displays.length > 0) return true;
    if (Array.isArray(p.actions) && p.actions.length > 0) return true;
    if (Array.isArray(p.badges) && p.badges.length > 0) return true;
    return false;
  };

  // --- compute savings shown near price ---
  const savings = useMemo(() => {
    const orig = selectedVariant?.price_of ?? (product as any)?.price_of;
    const nowP = selectedVariant?.price_per ?? (product as any)?.price_per;
    if (typeof orig === "number" && typeof nowP === "number" && orig > nowP) {
      const value = orig - nowP;
      const pct = Math.round((value / orig) * 100);
      return { value, pct };
    }
    return null;
  }, [selectedVariant, product]);

  // --- Load review stats ---
  useEffect(() => {
    const fetchReviewStats = async () => {
      try {
        setLoadingReviews(true);
        // mantive esta fetch de reviews (usa sua API de reviews)
        const resp = await fetch(`/api/review?product_id=${product.id}`);
        if (!resp.ok) {
          setReviewStats(null);
          return;
        }
        const data = await resp.json();
        setReviewStats(data);
      } catch (err) {
        console.error("Failed to fetch review stats:", err);
      } finally {
        setLoadingReviews(false);
      }
    };

    if (product?.id) fetchReviewStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id]);

  // --- Build embedded fallback maps from product object (if backend embedded them) ---
  const embeddedProductPromos: any[] = Array.isArray((product as any)?.promotions) ? (product as any).promotions : [];
  const embeddedProductMain: any | null = (product as any)?.mainPromotion ?? null;

  const embeddedVariantPromotionsMap: VariantPromosMap = {};
  const embeddedVariantMainMap: VariantMainMap = {};
  if (Array.isArray((product as any)?.variants)) {
    (product as any).variants.forEach((v: any) => {
      if (!v) return;
      embeddedVariantPromotionsMap[v.id] = Array.isArray(v.promotions) ? v.promotions : [];
      embeddedVariantMainMap[v.id] = v.mainPromotion ?? null;
    });
  }

  // --- Merge logic: until apiFetched is true, use embedded data; when apiFetched, prefer API but keep embedded as fallback ---
  const productPromotions: any[] = useMemo(() => {
    if (!apiFetched) return dedupeById([...embeddedProductPromos]);
    // api fetched: prefer API entries but keep embedded as fallback
    return dedupeById([...(hookProductPromotions ?? []), ...embeddedProductPromos]);
  }, [apiFetched, hookProductPromotions, embeddedProductPromos]);

  const productMainPromotion = useMemo(() => {
    if (apiFetched) {
      // prefer API's main if useful, otherwise fallback to embedded
      if (isUsefulPromotion(hookProductMainPromotion)) return hookProductMainPromotion;
      return embeddedProductMain ?? (hookProductMainPromotion ?? null);
    } else {
      return embeddedProductMain ?? null;
    }
  }, [apiFetched, hookProductMainPromotion, embeddedProductMain]);

  const variantPromotionsMap: VariantPromosMap = useMemo(() => {
    const merged: VariantPromosMap = { ...embeddedVariantPromotionsMap }; // start with embedded
    if (apiFetched) {
      // merge API entries; API first for each key
      Object.keys(hookVariantPromotions || {}).forEach((k) => {
        const apiArr = Array.isArray(hookVariantPromotions[k]) ? hookVariantPromotions[k] : [];
        merged[k] = dedupeById([...(apiArr ?? []), ...(merged[k] ?? [])]);
      });
    }
    return merged;
  }, [apiFetched, hookVariantPromotions, embeddedVariantPromotionsMap]);

  const variantMainPromotionsMap: VariantMainMap = useMemo(() => {
    const merged: VariantMainMap = { ...embeddedVariantMainMap };
    if (apiFetched) {
      Object.keys(hookVariantMainPromotions || {}).forEach(k => {
        const apiVal = hookVariantMainPromotions[k];
        const useful = isUsefulPromotion(apiVal);
        if (useful) {
          merged[k] = apiVal;
        } else {
          // do not overwrite useful embedded with empty API value
          if (!(k in merged)) merged[k] = null;
        }
      });
    }
    return merged;
  }, [apiFetched, hookVariantMainPromotions, embeddedVariantMainMap]);

  // --- Determine effective promotions to display ---
  const effectiveVariantPromotions = selectedVariant ? (variantPromotionsMap[selectedVariant.id] ?? []) : [];
  const effectiveVariantMain = selectedVariant ? (variantMainPromotionsMap[selectedVariant.id] ?? null) : null;
  const effectiveMain = effectiveVariantMain ?? productMainPromotion ?? ((product as any)?.mainPromotion ?? null);

  // For list of other promotions: prefer variant-specific if exist, else productPromotions
  const effectiveList = (effectiveVariantPromotions && effectiveVariantPromotions.length)
    ? effectiveVariantPromotions
    : (productPromotions && productPromotions.length ? productPromotions : []);

  // Remove main from list if duplicated
  const filteredList = effectiveList.filter((p: any) => !(effectiveMain && p && p.id && effectiveMain.id && p.id === effectiveMain.id));

  // Hide product-level promotions when a variant has main and product has no main
  const selectedVariantHasMain = !!(selectedVariant && effectiveVariantMain && isUsefulPromotion(effectiveVariantMain));
  const productHasMain = !!(productMainPromotion || (product as any)?.mainPromotion);
  const hideProductPromotionsWhenVariantMain = !!(selectedVariant && selectedVariantHasMain && !productHasMain);

  // --- Stars renderer ---
  const renderStars = () => {
    if (!reviewStats || reviewStats.averageRating === 0) return null;
    const fullStars = Math.floor(reviewStats.averageRating);
    const hasHalfStar = reviewStats.averageRating % 1 >= 0.5;
    return (
      <div className="flex text-yellow-400" aria-hidden>
        {[...Array(5)].map((_, i) => {
          if (i < fullStars) return <Star key={i} className="w-5 h-5 fill-current" />;
          if (i === fullStars && hasHalfStar) {
            return (
              <div key={i} className="relative">
                <Star className="w-5 h-5 text-gray-300" />
                <div className="absolute top-0 left-0 overflow-hidden" style={{ width: "50%" }}>
                  <Star className="w-5 h-5 fill-current" />
                </div>
              </div>
            );
          }
          return <Star key={i} className="w-5 h-5 text-gray-300" />;
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Info do produto */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{(product as any)?.name}</h1>
        <div className="flex items-center gap-2 mt-2">
          {loadingReviews ? (
            <div className="flex">
              {[...Array(5)].map((_, i) => (<Star key={i} className="w-5 h-5 text-gray-300" />))}
              <span className="text-sm text-gray-600 ml-2">Carregando...</span>
            </div>
          ) : reviewStats && reviewStats.totalReviews > 0 ? (
            <>
              {renderStars()}
              <span className="text-sm text-gray-600">({reviewStats.averageRating.toFixed(1)}) - {reviewStats.totalReviews} avaliações</span>
            </>
          ) : <span className="text-sm text-gray-600">Sem avaliações ainda</span>}
        </div>
        <p className="text-sm text-gray-600 mt-1">SKU: {selectedVariant?.sku ?? (product as any)?.skuMaster} | Marca: {(product as any)?.brand ?? "—"}</p>
      </div>

      {/* Preço */}
      <div className="bg-white p-6 rounded-lg border grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
        <div className="md:col-span-2">
          {hasDiscount ? (
            <>
              <div className="flex items-center gap-3">
                <span className="text-xl text-gray-400 line-through">{formatPrice((selectedVariant as any)!.price_of!)}</span>
                <span className="bg-red-500 text-white px-2 py-1 rounded-full text-sm font-bold">-{discount}%</span>
              </div>
              <div className="text-3xl font-bold text-green-600 mt-2">{formatPrice((selectedVariant as any)!.price_per!)}</div>
            </>
          ) : (
            <div className="text-3xl font-bold text-gray-900">{formatPrice(selectedVariant?.price_per ?? (product as any)?.price_per)}</div>
          )}

          {savings && <div className="mt-2 text-sm text-green-700 font-medium">Você economiza {formatPrice(savings.value)} ({savings.pct}%)</div>}

          <p className="text-sm text-gray-600 mt-2">À vista no PIX ou em até 12x sem juros no cartão</p>
        </div>
      </div>

      {/* Promoções */}
      <div className="space-y-4">
        {/* Promoção principal (destaque). Passa isMain=true para o PromotionSection */}
        {effectiveMain && !hideProductPromotionsWhenVariantMain && (
          <PromotionSection
            promo={effectiveMain}
            scope={selectedVariant ? "variant" : "product"}
            variantName={selectedVariant ? (selectedVariant.sku ?? undefined) : undefined}
            isMain={true}
            preloadedLookup={undefined}
          />
        )}

        {/* Outras promoções (exclui a main caso duplicada) */}
        {!hideProductPromotionsWhenVariantMain && filteredList && filteredList.length > 0 && filteredList.map((p: any) => (
          <div key={p.id ?? JSON.stringify(p)} className="mt-4">
            <PromotionSection
              promo={p}
              scope={selectedVariant ? "variant" : "product"}
              variantName={selectedVariant ? (selectedVariant.sku ?? undefined) : undefined}
              isMain={false}
              preloadedLookup={undefined}
            />
          </div>
        ))}

        {!hideProductPromotionsWhenVariantMain && !apiFetched && ( // if waiting for API and no effectiveMain yet, show hint
          <div className="text-sm text-gray-600">Carregando promoções...</div>
        )}

        {hideProductPromotionsWhenVariantMain && (
          // If we're explicitly hiding product promotions because variant main exists, show nothing (or optionally show a small hint)
          <div className="text-sm text-gray-600">Mostrando promoção específica da variante selecionada.</div>
        )}

        {!loadingReviews && !effectiveMain && (!filteredList || filteredList.length === 0) && (
          <div className="text-sm text-gray-600">Selecionando opções você verá promoções específicas da variante (se houver).</div>
        )}
      </div>
    </div>
  );
}