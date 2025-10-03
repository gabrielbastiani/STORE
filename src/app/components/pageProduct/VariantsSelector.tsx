"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Info } from "lucide-react";
import PromotionRulesModal from "./PromotionRulesModal";
import { lookupCatalog } from "@/services/catalogLookup";
import { Promotion, VariantFormData, ProductFormData } from "Types/types";
import usePromotionsForProduct from "./hooksPromotions/usePromotionsForProduct";

interface AttributeImage {
  value: string;
  imageUrl?: string;
}

interface VariantsSelectorProps {
  allOptions: Record<string, Set<string>>;
  availableOptions: Record<string, Set<string>>;
  selectedAttributes: Record<string, string>;
  handleAttributeSelect: (key: string, value: string) => void;
  attributeImages?: Record<string, AttributeImage[]>;
  onImageChange?: (imageUrl: string | null) => void;

  // Props adicionais para promoções
  selectedVariant?: VariantFormData | null;
  product?: ProductFormData | null;
  formatPrice?: (v: number) => string;
}

type PreloadedLookupNormalized = {
  products?: Record<string, string | undefined>;
  variants?: Record<string, { sku?: string | undefined; name?: string | undefined }>;
} | undefined;

export default function VariantsSelector({
  allOptions,
  availableOptions,
  selectedAttributes,
  handleAttributeSelect,
  attributeImages = {},
  onImageChange,
  selectedVariant = null,
  product = null,
  formatPrice = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v)
}: VariantsSelectorProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [preLookup, setPreLookup] = useState<PreloadedLookupNormalized>(undefined);
  const [timeLeft, setTimeLeft] = useState<string | null>(null);

  // Hook: traz promoções da API (merge já feito no hook)
  const {
    loading: promosLoading,
    productPromotions,
    variantPromotions,
    variantMainPromotions,
    apiFetched
  } = usePromotionsForProduct(product?.id, selectedVariant?.id, selectedVariant?.sku);

  // Prefetch catalog names (evita requests extras dentro do modal)
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const productIds = product ? [(product as any)?.id].filter(Boolean) as string[] : [];
        const variantIds = selectedVariant ? [selectedVariant.id].filter(Boolean) as string[] : [];

        if (productIds.length === 0 && variantIds.length === 0) {
          if (mounted) setPreLookup(undefined);
          return;
        }

        const res = await lookupCatalog({ productIds, variantIds });
        const productsMap = (res.products ?? []).reduce((acc: Record<string, string | undefined>, p: any) => {
          acc[p.id] = p.name ?? undefined;
          return acc;
        }, {} as Record<string, string | undefined>);

        const variantsMap = (res.variants ?? []).reduce(
          (acc: Record<string, { sku?: string | undefined; name?: string | undefined }>, v: any) => {
            acc[v.id] = { sku: v.sku ?? undefined, name: v.name ?? undefined };
            return acc;
          },
          {}
        );

        if (mounted) setPreLookup({ products: productsMap, variants: variantsMap });
      } catch (err) {
        console.warn("VariantsSelector prelookup failed", err);
        if (mounted) setPreLookup(undefined);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [selectedVariant?.id, product?.id]);

  // util: checa se uma promoção é útil (tem displays/actions/badges ou id)
  const isUsefulPromotion = (p: any) => {
    if (!p) return false;
    if (typeof p.id === "string" && p.id) return true;
    if (Array.isArray(p.displays) && p.displays.length > 0) return true;
    if (Array.isArray(p.actions) && p.actions.length > 0) return true;
    if (Array.isArray(p.badges) && p.badges.length > 0) return true;
    return false;
  };

  // mergedVariantPromo: preferir (na ordem):
  // 1) variantMainPromotions[selectedVariant.id] (API, quando apiFetched e útil)
  // 2) variantPromotions[selectedVariant.id][0] (API)
  // 3) selectedVariant.mainPromotion (embedded)
  // 4) selectedVariant.variantPromotions[0] (embedded)
  // 5) null
  const mergedVariantPromo: Promotion | null = useMemo(() => {
    if (!selectedVariant) return null;

    // 1) if API fetched and variantMainPromotions has a useful item, return it
    if (apiFetched) {
      const apiMain = variantMainPromotions?.[selectedVariant.id];
      if (isUsefulPromotion(apiMain)) return apiMain as Promotion;

      // 2) check variantPromotions map from API
      const apiVarProms = variantPromotions?.[selectedVariant.id] ?? [];
      if (Array.isArray(apiVarProms) && apiVarProms.length > 0) {
        return apiVarProms[0] as Promotion;
      }
    }

    // 3) fallback to embedded mainPromotion on the selectedVariant (if present)
    // @ts-ignore
    if ((selectedVariant as any).mainPromotion && isUsefulPromotion((selectedVariant as any).mainPromotion)) {
      // @ts-ignore
      return (selectedVariant as any).mainPromotion as Promotion;
    }

    // 4) fallback to embedded variantPromotions array on the selectedVariant
    // @ts-ignore
    if (Array.isArray((selectedVariant as any).variantPromotions) && (selectedVariant as any).variantPromotions.length) {
      // @ts-ignore
      return (selectedVariant as any).variantPromotions[0] as Promotion;
    }

    return null;
  }, [apiFetched, variantMainPromotions, variantPromotions, selectedVariant]);

  // obtenção de displays (segura)
  const displays = useMemo(() => {
    if (!mergedVariantPromo) return [];
    try {
      const d = (mergedVariantPromo as any).displays;
      if (Array.isArray(d)) return d;
      if (typeof d === "string") return JSON.parse(d);
      return [];
    } catch {
      return [];
    }
  }, [mergedVariantPromo]);

  // Atualizar tempo restante periodicamente baseado na promoção mesclada
  useEffect(() => {
    if (!mergedVariantPromo?.endDate) {
      setTimeLeft(null);
      return;
    }

    const getTimeLeft = () => {
      const end = new Date(mergedVariantPromo.endDate || '');
      const now = new Date();
      const diffMs = end.getTime() - now.getTime();
      if (diffMs <= 0) return "Expirado";
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      return (days > 0) ? `${days}d ${hours}h` : `${hours}h ${minutes}m`;
    };

    setTimeLeft(getTimeLeft());
    const intervalId = setInterval(() => setTimeLeft(getTimeLeft()), 60000);
    return () => clearInterval(intervalId);
  }, [mergedVariantPromo?.endDate]);

  // Cálculo simples de savings entre price_of e price_per (opcional)
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

  // Helper para mostrar SKU / nome da variante no badge
  const variantLabel = useMemo(() => {
    if (!selectedVariant) return null;
    const pre = preLookup?.variants?.[selectedVariant.id];
    const sku = selectedVariant.sku ?? pre?.sku ?? null;
    const name = pre?.name ?? null;
    if (sku && name) return `${sku} — ${name}`;
    if (sku) return sku;
    if (name) return name;
    return selectedVariant.id?.slice(0, 8) ?? "Variante";
  }, [selectedVariant, preLookup]);

  return (
    <div className="space-y-4 text-black">
      {/* Promoção da variante selecionada (se existir) */}
      {mergedVariantPromo && displays.length > 0 && (
        <div className="bg-amber-50 border rounded-lg p-4 flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-md bg-amber-100 flex items-center justify-center border border-amber-200">
                  <Info className="w-6 h-6 text-amber-700" />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <div className="font-semibold text-amber-900 text-lg">
                    {displays[0].title ?? "Promoção da variante"}
                  </div>

                  {/* ETIQUETA: mostra SKU/nome da variante */}
                  {selectedVariant && (
                    <div className="ml-2 inline-flex items-center gap-2">
                      <span className="text-xs bg-purple-600 text-white px-2 py-1 rounded-full font-medium">
                        Variante
                      </span>
                      <span className="text-xs bg-white border border-purple-200 text-purple-800 px-2 py-1 rounded">
                        {variantLabel}
                      </span>
                    </div>
                  )}
                </div>

                <div className="text-sm text-slate-700 mt-1 line-clamp-2" dangerouslySetInnerHTML={{ __html: displays[0].content ?? "" }} />
                {savings && (
                  <div className="mt-2 text-sm text-green-700 font-medium">
                    Você economiza {formatPrice(savings.value)} ({savings.pct}%)
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-3">
            <div className="text-xs text-gray-600 text-right">Acaba em</div>
            <div className="text-sm font-semibold text-amber-800">{timeLeft ?? "—"}</div>
            <div className="flex gap-2 mt-1">
              <button
                onClick={() => setModalOpen(true)}
                className="text-xs bg-amber-600 text-white px-3 py-1 rounded"
              >
                Ver regras
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Se não há displays, mas existe promo -> card compacto */}
      {mergedVariantPromo && displays.length === 0 && (
        <div className="bg-amber-50 border rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 mt-1">
              <Info className="w-5 h-5 text-amber-600" />
            </div>
            <div className="ml-3 flex-1">
              <div className="flex items-center gap-2">
                <div className="font-medium text-amber-900">Promoção aplicável</div>
                {selectedVariant && (
                  <div className="text-xs bg-white border border-purple-200 text-purple-800 px-2 py-0.5 rounded">
                    {variantLabel}
                  </div>
                )}
              </div>
              <div className="text-sm text-slate-700">Ver regras para mais detalhes</div>
            </div>
          </div>

          <div className="flex flex-col items-end">
            <div className="text-xs text-gray-600">Acaba em</div>
            <div className="text-sm font-semibold text-amber-800">{timeLeft ?? "—"}</div>
            <button
              onClick={() => setModalOpen(true)}
              className="mt-2 text-xs bg-amber-600 text-white px-3 py-1 rounded"
            >
              Ver regras
            </button>
          </div>
        </div>
      )}

      {/* Seletor de atributos (renderização original inalterada) */}
      {Object.entries(allOptions).map(([key, values]) => (
        <div key={key} className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">
              {key}:
            </label>
            <span className="text-xs text-gray-500">
              {selectedAttributes[key] || "Selecione"}
            </span>
          </div>

          <div className="flex flex-wrap gap-2 text-black">
            {Array.from(values).map(value => {
              const isSelected = selectedAttributes[key] === value;
              const isAvailable = availableOptions[key]?.has(value) ?? false;
              const attrImage = attributeImages[key]?.find(i => i.value === value)?.imageUrl;

              return (
                <button
                  key={value}
                  onClick={() => {
                    handleAttributeSelect(key, value);
                    if (onImageChange) onImageChange(attrImage ?? null);
                  }}
                  disabled={!isAvailable}
                  aria-pressed={isSelected}
                  className={`relative flex items-center justify-center border rounded-lg text-sm font-medium transition-colors
                    ${isSelected
                      ? "border-blue-600 bg-blue-50 text-blue-600 shadow-sm"
                      : isAvailable
                        ? "border-gray-300 hover:border-gray-400 bg-white hover:bg-gray-50"
                        : "border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed"
                    }
                    ${attrImage ? "p-0 w-12 h-12" : "px-4 py-2"}`}
                >
                  {attrImage ? (
                    <img src={attrImage} alt={value} className={`w-full h-full object-cover rounded-md ${!isAvailable ? "opacity-40" : ""}`} />
                  ) : (
                    <>
                      {value}
                      {!isAvailable && <span className="ml-1 text-xs">Indisp.</span>}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Modal de regras da promoção (agora exclusivo aqui) */}
      <PromotionRulesModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        promo={mergedVariantPromo ?? null}
        preloadedLookup={preLookup ?? undefined}
        variantName={selectedVariant?.sku ?? undefined}
      />
    </div>
  );
}