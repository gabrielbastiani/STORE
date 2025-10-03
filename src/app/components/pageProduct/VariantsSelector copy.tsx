"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Info } from "lucide-react";
import PromotionRulesModal from "./PromotionRulesModal";
import { lookupCatalog } from "@/services/catalogLookup";
import { Promotion, VariantFormData, ProductFormData } from "Types/types";

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

  // ---------- mergeVariantPromotion: cria a promoção efetiva para a variante ----------
  const mergeVariantPromotion = (variant: any): Promotion | null => {
    if (!variant) return null;

    const base = variant.mainPromotion ?? null;

    if (!base) {
      // Se a própria variante já carrega a promoção
      const direct: Promotion = {
        ...variant,
        conditions: Array.isArray(variant.conditions) ? variant.conditions : [],
        actions: Array.isArray(variant.actions) ? variant.actions : [],
        displays: Array.isArray(variant.displays) ? variant.displays : [],
        coupons: Array.isArray(variant.coupons) ? variant.coupons : [],
        badges: Array.isArray(variant.badges) ? variant.badges : [],
      } as Promotion;
      return direct;
    }

    // Mesclar: valores/arrays da variante têm prioridade quando presentes
    const merged: Promotion = {
      ...base,
      ...variant,
      conditions: Array.isArray(variant.conditions) && variant.conditions.length ? variant.conditions : (Array.isArray(base.conditions) ? base.conditions : []),
      actions: Array.isArray(variant.actions) && variant.actions.length ? variant.actions : (Array.isArray(base.actions) ? base.actions : []),
      displays: Array.isArray(variant.displays) && variant.displays.length ? variant.displays : (Array.isArray(base.displays) ? base.displays : []),
      coupons: Array.isArray(variant.coupons) && variant.coupons.length ? variant.coupons : (Array.isArray(base.coupons) ? base.coupons : []),
      badges: Array.isArray(variant.badges) && variant.badges.length ? variant.badges : (Array.isArray(base.badges) ? base.badges : []),
    } as Promotion;

    return merged;
  };
  // -------------------------------------------------------------------------------

  const mergedVariantPromo = useMemo(() => mergeVariantPromotion(selectedVariant), [selectedVariant]);

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

  // Função para calcular tempo restante de uma promoção
  const getTimeLeft = (endDate?: string) => {
    if (!endDate) return null;
    const end = new Date(endDate);
    const now = new Date();
    const diffMs = end.getTime() - now.getTime();
    if (diffMs <= 0) return "Expirado";
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return (days > 0) ? `${days}d ${hours}h` : `${hours}h ${minutes}m`;
  };

  // Atualizar tempo restante periodicamente baseado na promoção mesclada
  useEffect(() => {
    if (!mergedVariantPromo?.endDate) {
      setTimeLeft(null);
      return;
    }

    const updateTimeLeft = () => {
      // @ts-ignore
      setTimeLeft(getTimeLeft(mergedVariantPromo.endDate));
    };

    updateTimeLeft();
    const intervalId = setInterval(updateTimeLeft, 60000); // Atualiza a cada minuto

    return () => clearInterval(intervalId);
  }, [mergedVariantPromo?.endDate]);

  // Displays da promoção (merge)
  const displays = useMemo(() => {
    if (!mergedVariantPromo) return [];
    return Array.isArray((mergedVariantPromo as any).displays) ? (mergedVariantPromo as any).displays : [];
  }, [mergedVariantPromo]);

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

  console.log(mergedVariantPromo)

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

                  {/* NOVA ETIQUETA: mostra SKU/nome da variante e destaca que é promoção de variante */}
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

      {/* Se há promoção mas sem displays: card compacto */}
      {mergedVariantPromo && displays.length === null && (
        <div className="bg-amber-50 border rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-amber-100 flex items-center justify-center border border-amber-200">
              <Info className="w-5 h-5 text-amber-700" />
            </div>
            <div>
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

      {/* Nota quando não há promoção */}
      {!mergedVariantPromo && (
        <div className="text-sm text-gray-600">
          Selecionando opções você verá promoções específicas da variante (se houver).
        </div>
      )}

      {/* Seletor de atributos */}
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
                  className={`
                    relative flex items-center justify-center 
                    border rounded-lg text-sm font-medium transition-colors
                    ${isSelected
                      ? "border-blue-600 bg-blue-50 text-blue-600 shadow-sm"
                      : isAvailable
                        ? "border-gray-300 hover:border-gray-400 bg-white hover:bg-gray-50"
                        : "border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed"
                    }
                    ${attrImage ? "p-0 w-12 h-12" : "px-4 py-2"}
                  `}
                >
                  {attrImage ? (
                    <img
                      src={attrImage}
                      alt={value}
                      className={`w-full h-full object-cover rounded-md ${!isAvailable ? "opacity-40" : ""}`}
                    />
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
        promo={selectedVariant ?? mergedVariantPromo ?? null}
        preloadedLookup={preLookup ?? undefined}
        variantName={selectedVariant?.sku ?? undefined}
      />
    </div>
  );
}