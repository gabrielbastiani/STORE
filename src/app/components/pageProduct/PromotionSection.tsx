"use client"

import React, { useEffect, useState } from "react";
import { Clock, Ticket, Gift, Info } from "lucide-react";
import { Promotion } from "Types/types";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { lookupCatalog } from "@/services/catalogLookup";
import PromotionRulesModal from "./PromotionRulesModal";
import Image from "next/image";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface PromotionSectionProps {
  promo: Promotion;
}

const ConditionLabel: Record<string, string> = {
  FIRST_ORDER: "Se 1ª compra",
  CART_ITEM_COUNT: "Se a quantidade de produtos no carrinho for",
  UNIQUE_VARIANT_COUNT: "Se a quantidade de variantes únicas for",
  CATEGORY: "Se a categoria",
  ZIP_CODE: "Se CEP",
  PRODUCT_CODE: "Se código do produto",
  VARIANT_CODE: "Se código do produto variante",
  STATE: "Se o estado no país for",
  CATEGORY_ITEM_COUNT: "Se na categoria X a quantidade de produtos for X",
  CATEGORY_VALUE: "Se para a categoria X o valor for",
  BRAND_VALUE: "Se para a marca X o valor for",
  VARIANT_ITEM_COUNT: "Se para o produto variante X a quantidade for",
  PRODUCT_ITEM_COUNT: "Se para o produto X a quantidade for",
  PERSON_TYPE: "Se tipo de cadastro (pessoa)",
  USER: "Se o usuário for",
  SUBTOTAL_VALUE: "Se valor subtotal",
  TOTAL_VALUE: "Se valor total",
};

const ActionLabel: Record<string, string> = {
  FIXED_VARIANT_DISCOUNT: "Ganhe {amount} R$ de desconto na unidade de cada produto variante {target}",
  FIXED_PRODUCT_DISCOUNT: "Ganhe {amount} R$ de desconto na unidade de cada produto {target}",
  FREE_VARIANT_ITEM: "Ganhe {qty} unidades do produto variante {target} de brinde",
  FREE_PRODUCT_ITEM: "Ganhe {qty} unidades do produto {target} de brinde",
  PERCENT_CATEGORY: "Ganhe {percent}% de desconto nos produtos da categoria {target}",
  PERCENT_VARIANT: "Ganhe {percent}% de desconto nos produtos variantes {target}",
  PERCENT_PRODUCT: "Ganhe {percent}% de desconto nos produtos {target}",
  PERCENT_BRAND_ITEMS: "Percentual de desconto de acordo com marca/fabricante",
  PERCENT_ITEM_COUNT: "Percentual de desconto em {qty} unidades de produtos {target}",
  PERCENT_EXTREME_ITEM: "Percentual de desconto em {qty} unidades do produto de menor ou maior valor",
  PERCENT_SHIPPING: "Percentual de desconto no valor do frete",
  PERCENT_SUBTOTAL: "Percentual de desconto no valor subtotal (soma dos produtos)",
  PERCENT_TOTAL_NO_SHIPPING: "Percentual de desconto no valor total (sem considerar o frete)",
  PERCENT_TOTAL_PER_PRODUCT: "Percentual de desconto no valor total (aplicado por produto)",
  FIXED_BRAND_ITEMS: "Valor de desconto em {qty} produtos de acordo com marca/fabricante",
  FIXED_SHIPPING: "Valor de desconto no valor do frete",
  FIXED_SUBTOTAL: "Valor de desconto no valor subtotal (soma dos produtos)",
  FIXED_TOTAL_NO_SHIPPING: "Valor de desconto no valor total (sem considerar o frete)",
  FIXED_TOTAL_PER_PRODUCT: "Valor de desconto no valor total (aplicado por produto)",
  MAX_SHIPPING_DISCOUNT: "Valor máximo de frete",
};

export default function PromotionSection({ promo }: PromotionSectionProps) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [preLookup, setPreLookup] = useState<any>(undefined);
  const [timeLeft, setTimeLeft] = useState<string | null>(null);

  const getTimeLeft = (endDate?: string) => {
    if (!endDate) return null;

    const end = new Date(endDate);
    const now = new Date();
    const diffMs = end.getTime() - now.getTime();

    if (diffMs <= 0) return "Expirado";

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}h ${minutes}m`;
  };

  useEffect(() => {
    if (!promo?.endDate) {
      setTimeLeft(null);
      return;
    }

    const updateTimeLeft = () => {/* @ts-ignore */
      setTimeLeft(getTimeLeft(promo.endDate));
    };

    updateTimeLeft();
    const intervalId = setInterval(updateTimeLeft, 60000);

    return () => clearInterval(intervalId);
  }, [promo?.endDate]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!promo) return;

      const productIds: string[] = [];
      const variantIds: string[] = [];

      const collectIds = (obj: any) => {
        if (!obj || typeof obj !== 'object') return;

        if (Array.isArray(obj)) {
          obj.forEach(collectIds);
          return;
        }

        if (obj.productIds && Array.isArray(obj.productIds)) {
          productIds.push(...obj.productIds);
        }

        if (obj.variantIds && Array.isArray(obj.variantIds)) {
          variantIds.push(...obj.variantIds);
        }

        Object.values(obj).forEach(collectIds);
      };

      (promo.conditions || []).forEach(collectIds);
      (promo.actions || []).forEach(collectIds);
      (promo.displays || []).forEach(collectIds);

      const uniqueProductIds = [...new Set(productIds)];
      const uniqueVariantIds = [...new Set(variantIds)];

      if (uniqueProductIds.length === 0 && uniqueVariantIds.length === 0) {
        if (mounted) {
          setPreLookup(undefined);
        }
        return;
      }

      try {
        const res = await lookupCatalog({
          productIds: uniqueProductIds,
          variantIds: uniqueVariantIds
        });

        const productsMap: Record<string, string> = {};
        res.products.forEach(p => {
          if (p.name) productsMap[p.id] = p.name;
        });

        const variantsMap: Record<string, { name?: string; sku?: string }> = {};
        res.variants.forEach(v => {
          variantsMap[v.id] = {
            name: v.name || undefined,
            sku: v.sku || undefined
          };
        });

        if (mounted) {
          setPreLookup({
            products: productsMap,
            variants: variantsMap
          });
        }
      } catch (e) {
        console.error("Falha ao carregar nomes de produtos/variantes", e);
        if (mounted) {
          setPreLookup(undefined);
        }
      }
    })();

    return () => { mounted = false; };
  }, [promo]);

  const mapProduct = (id: string) => {
    return preLookup?.products?.[id] || id;
  };

  const mapVariant = (id: string) => {
    const variant = preLookup?.variants?.[id];
    return variant?.name || variant?.sku || id;
  };

  const copyToClipboard = (code?: string) => {
    if (!code) return toast.error("Cupom inválido");
    navigator.clipboard.writeText(code).then(
      () => toast.success(`Cupom copiado: ${code}`),
      () => toast.error("Não foi possível copiar o cupom")
    );
  };

  const humanizeCondition = (condition: any) => {
    const type = condition.type;
    const operator = condition.operator;

    const value = condition.value
      ? typeof condition.value === 'string'
        ? JSON.parse(condition.value)
        : condition.value
      : {};

    const baseText = ConditionLabel[type] || type;

    switch (type) {
      case 'PRODUCT_CODE':
        const productNames = (value.productIds || [])
          .map(mapProduct)
          .join(', ');
        return `${baseText}: ${productNames}`;

      case 'VARIANT_CODE':
        const variantNames = (value.variantIds || [])
          .map(mapVariant)
          .join(', ');
        return `${baseText}: ${variantNames}`;

      case 'STATE':
        return `${baseText}: ${(value.states || []).join(', ')}`;

      default:
        return `${baseText}${operator ? ` (${operator})` : ''}${Object.keys(value).length ? `: ${JSON.stringify(value)}` : ''}`;
    }
  };

  const humanizeAction = (action: any) => {
    const type = action.type;

    const params = action.params
      ? typeof action.params === 'string'
        ? JSON.parse(action.params)
        : action.params
      : {};

    let baseText = ActionLabel[type] || type;

    baseText = baseText
      .replace('{percent}', params.percent || '?')
      .replace('{amount}', params.amount || '?')
      .replace('{qty}', params.qty || '?');

    switch (type) {
      case 'PERCENT_PRODUCT':
      case 'FIXED_PRODUCT_DISCOUNT':
        const productNames = (params.productIds || [])
          .map(mapProduct)
          .join(', ');
        return baseText.replace('{target}', productNames);

      case 'PERCENT_VARIANT':
      case 'FIXED_VARIANT_DISCOUNT':
      case 'FREE_VARIANT_ITEM':
        const variantNames = (params.variantIds || [])
          .map(mapVariant)
          .join(', ');
        return baseText.replace('{target}', variantNames);

      case 'FREE_PRODUCT_ITEM':
        const freeProductNames = (params.productIds || [])
          .map(mapProduct)
          .join(', ');
        return baseText.replace('{target}', freeProductNames);

      default:
        return baseText;
    }
  };

  if (!promo) return null;

  const start = promo.startDate ? new Date(promo.startDate) : null;
  const end = promo.endDate ? new Date(promo.endDate) : null;
  const isActive = timeLeft && timeLeft !== "Expirado";

  const coupons: any[] = Array.isArray(promo.coupons) ? promo.coupons : [];
  const displays: any[] = Array.isArray(promo.displays) ? promo.displays : [];
  const badges: any[] = Array.isArray(promo.badges) ? promo.badges : [];
  const conditions: any[] = Array.isArray(promo.conditions) ? promo.conditions : [];
  const actions: any[] = Array.isArray(promo.actions) ? promo.actions : [];

  return (
    <>
      <section className="bg-gradient-to-r from-amber-50 via-white to-amber-50 border border-amber-200 rounded-lg p-4 shadow-sm mb-6">
        {/* Cabeçalho com etiqueta de promoção do produto */}
        <header className="flex items-center mb-3">
          <div className="bg-amber-500 text-white px-2 py-1 rounded text-xs font-bold mr-2">
            PROMOÇÃO DO PRODUTO PRINCIPAL
          </div>
          <h3 className="text-xl font-extrabold text-amber-800">{promo.name}</h3>
        </header>

        <div className="flex gap-4">
          <div className="flex-shrink-0 w-20">
            <div className="w-16 h-16 rounded-full bg-amber-600 text-white flex items-center justify-center">
              <Ticket className="w-7 h-7" />
            </div>
          </div>

          <div className="flex-1">
            {/* Badges */}
            {badges.length > 0 && (
              <div className="mt-4 flex items-center gap-3 flex-wrap">
                {badges.map((b: any) => (
                  <div key={b.id || b.title} className="flex items-center gap-2 p-2 bg-white border rounded-md">
                    {b.imageUrl ? (
                      <Image
                        src={`${API_URL}/files/${b.imageUrl}`}
                        alt={b.title}
                        width={100}
                        height={100}
                        className="w-10 h-10 object-cover rounded"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded bg-amber-100 flex items-center justify-center text-amber-700">
                        <Gift className="w-4 h-4" />
                      </div>
                    )}
                    <div className="text-sm font-medium text-slate-800">{b.title}</div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-start justify-between">
              <div>
                {promo.description && (
                  <p className="text-sm text-gray-700 mt-1 max-w-prose">{promo.description}</p>
                )}

                <div className="flex flex-wrap gap-2 mt-3">
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${isActive ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                    {isActive ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        Ativa
                      </>
                    ) : (
                      <>
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                        Expirada
                      </>
                    )}
                  </div>

                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
                    <Ticket className="w-4 h-4" />
                    {promo.hasCoupon ? "Requer cupom" : "Promoção automática"}
                  </div>

                  {timeLeft && (
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      <Clock className="w-4 h-4" />
                      {timeLeft}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <button
                  onClick={() => setModalOpen(true)}
                  className="inline-flex items-center gap-1 text-sm text-amber-700 hover:text-amber-900"
                >
                  <Info className="w-4 h-4" /> Detalhes
                </button>
              </div>
            </div>

            {/* Displays */}
            {displays.length > 0 && (
              <div className="mt-4 grid gap-2">
                {displays.slice(0, 2).map((d: any) => (
                  <article key={d.id || d.title} className="p-3 bg-white border rounded">
                    <header className="flex items-center justify-between">
                      <h4 className="font-semibold text-sm text-amber-800">{d.title}</h4>
                    </header>

                    <div className="mt-2 text-sm text-gray-700">
                      {d.content ? (
                        <div dangerouslySetInnerHTML={{ __html: d.content }} />
                      ) : (
                        <em>Sem descrição detalhada</em>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}

            {/* Condições resumidas */}
            {conditions.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-semibold text-gray-800">Condições:</h4>
                <ul className="mt-1 space-y-1">
                  {conditions.slice(0, 3).map((c, i) => (
                    <li key={c.id || i} className="text-xs text-gray-600 flex items-start">
                      <span className="mr-1">•</span>
                      <span className="flex-1">{humanizeCondition(c)}</span>
                    </li>
                  ))}
                  {conditions.length > 3 && (
                    <li className="text-xs text-gray-500">
                      + {conditions.length - 3} condições...
                    </li>
                  )}
                </ul>
              </div>
            )}

            {/* Ações resumidas */}
            {actions.length > 0 && (
              <div className="mt-2">
                <h4 className="text-sm font-semibold text-gray-800">Benefícios:</h4>
                <ul className="mt-1 space-y-1">
                  {actions.slice(0, 3).map((a, i) => (
                    <li key={a.id || i} className="text-xs text-gray-600 flex items-start">
                      <span className="mr-1">•</span>
                      <span className="flex-1">{humanizeAction(a)}</span>
                    </li>
                  ))}
                  {actions.length > 3 && (
                    <li className="text-xs text-gray-500">
                      + {actions.length - 3} benefícios...
                    </li>
                  )}
                </ul>
              </div>
            )}

            {/* Cupons */}
            {coupons.length > 0 && (
              <div className="mt-4 bg-white p-3 border rounded">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-slate-800">Códigos de Cupom</div>
                  <div className="text-xs text-gray-500">Use no carrinho</div>
                </div>

                <div className="mt-3 flex gap-3 flex-wrap">
                  {coupons.map((c: any, i: number) => (
                    <div key={c.id || c.code || i} className="flex items-center gap-3 border rounded p-3 bg-slate-50">
                      <div className="font-mono text-sm text-slate-800">{c.code}</div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => copyToClipboard(c.code)}
                          className="px-3 py-1 text-xs bg-amber-600 text-white rounded"
                        >
                          Copiar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Modal de regras completo */}
      <PromotionRulesModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        promo={promo}
        preloadedLookup={preLookup}
      />
    </>
  );
}