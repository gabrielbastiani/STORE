"use client";

import React, { useEffect, useMemo, useState } from "react";
import { X, Info, Tag, Clock } from "lucide-react";
import { Promotion } from "Types/types";
import { toast } from "react-toastify";
import { collectPromotionIds, lookupCatalog } from "@/services/catalogLookup";
import Image from "next/image";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface AppliedPromotionsResult {
    discountTotal?: number;
    freeGifts?: Array<{ variantId: string; quantity: number }>;
    badgeMap?: Record<string, { title: string; imageUrl: string }>;
    descriptions?: string[];
    promotions?: Array<{ id: string; name: string; description?: string }>;
    loading?: boolean;
    error?: any;
}

type PreloadedLookupIncoming = {
    products?: Record<string, string | null | undefined>;
    variants?: Record<string, { sku?: string | null | undefined; name?: string | null | undefined }>;
} | null | undefined;

interface Props {
    open: boolean;
    onClose: () => void;
    promo: any | null | undefined;
    appliedPromotionsResult?: AppliedPromotionsResult | null;
    preloadedLookup?: PreloadedLookupIncoming;
    variantName?: string;
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

const OperatorLabel: Record<string, string> = {
    EQUAL: "Igual",
    NOT_EQUAL: "Diferente",
    GREATER: "Maior",
    GREATER_EQUAL: "Maior ou igual",
    LESS: "Menor",
    LESS_EQUAL: "Menor ou igual",
    CONTAINS: "Está contido",
    NOT_CONTAINS: "Não está contido",
    EVERY: "A cada",
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

const normalizeProductsMap = (m?: Record<string, string | null | undefined>) => {
    const out: Record<string, string | undefined> = {};
    if (!m) return out;
    Object.entries(m).forEach(([k, v]) => {
        out[k] = v ?? undefined;
    });
    return out;
};

const normalizeVariantsMap = (m?: Record<string, { sku?: string | null | undefined; name?: string | null | undefined }>) => {
    const out: Record<string, { sku?: string | undefined; name?: string | undefined }> = {};
    if (!m) return out;
    Object.entries(m).forEach(([k, v]) => {
        out[k] = { sku: v?.sku ?? undefined, name: v?.name ?? undefined };
    });
    return out;
};

const safeParse = (value: any): any => {
    if (typeof value === "string") {
        try {
            return JSON.parse(value);
        } catch {
            return value;
        }
    }
    return value;
};

/**
 * interpretIncomingPromo:
 * tratado para aceitar formatos diversos (promo standalone, promo override, variant object, etc).
 */
const interpretIncomingPromo = (promo: any): { merged: Promotion | null; base: any | null; variant: any | null; variantSourceName?: string | null; sourceIsVariantObject?: boolean } => {
    if (!promo) return { merged: null, base: null, variant: null, variantSourceName: null, sourceIsVariantObject: false };

    const looksLikeVariantObject =
        !!(promo.productVariantImage || promo.variantAttribute || promo.productVariantVideo) ||
        (!!promo.product_id && !!promo.sku && (promo.hasOwnProperty("price_of") || promo.hasOwnProperty("price_per")));

    if (looksLikeVariantObject) {
        // Se há variantPromotions array (antigo formato)
        if (Array.isArray(promo.variantPromotions) && promo.variantPromotions.length > 0) {
            const vp = promo.variantPromotions[0];
            const base = vp?.mainPromotion ?? null;
            if (base) {
                const merged: Promotion = {
                    ...base,
                    ...vp,
                    conditions: Array.isArray(vp.conditions) && vp.conditions.length ? vp.conditions : (Array.isArray(base.conditions) ? base.conditions : []),
                    actions: Array.isArray(vp.actions) && vp.actions.length ? vp.actions : (Array.isArray(base.actions) ? base.actions : []),
                    displays: Array.isArray(vp.displays) && vp.displays.length ? vp.displays : (Array.isArray(base.displays) ? base.displays : []),
                    coupons: Array.isArray(vp.coupons) && vp.coupons.length ? vp.coupons : (Array.isArray(base.coupons) ? base.coupons : []),
                    badges: Array.isArray(vp.badges) && vp.badges.length ? vp.badges : (Array.isArray(base.badges) ? base.badges : []),
                } as Promotion;
                return { merged, base, variant: vp, variantSourceName: promo.sku || promo.name || null, sourceIsVariantObject: true };
            } else {
                const direct: Promotion = {
                    ...vp,
                    conditions: Array.isArray(vp.conditions) ? vp.conditions : [],
                    actions: Array.isArray(vp.actions) ? vp.actions : [],
                    displays: Array.isArray(vp.displays) ? vp.displays : [],
                    coupons: Array.isArray(vp.coupons) ? vp.coupons : [],
                    badges: Array.isArray(vp.badges) ? vp.badges : [],
                } as Promotion;
                return { merged: direct, base: null, variant: vp, variantSourceName: promo.sku || promo.name || null, sourceIsVariantObject: true };
            }
        }

        // se a variante guarda um mainPromotion objeto (novo formato)
        if (promo.mainPromotion) {
            const vp = promo.mainPromotion;
            const direct: Promotion = {
                ...vp,
                conditions: Array.isArray(vp.conditions) ? vp.conditions : [],
                actions: Array.isArray(vp.actions) ? vp.actions : [],
                displays: Array.isArray(vp.displays) ? vp.displays : [],
                coupons: Array.isArray(vp.coupons) ? vp.coupons : [],
                badges: Array.isArray(vp.badges) ? vp.badges : [],
            } as Promotion;
            return { merged: direct, base: null, variant: vp, variantSourceName: promo.sku || promo.name || null, sourceIsVariantObject: true };
        }

        // variante sem promo
        return { merged: null, base: null, variant: null, variantSourceName: promo.sku || promo.name || null, sourceIsVariantObject: true };
    }

    if (promo.mainPromotion) {
        const base = promo.mainPromotion;
        const merged: Promotion = {
            ...base,
            ...promo,
            conditions: Array.isArray(promo.conditions) && promo.conditions.length ? promo.conditions : (Array.isArray(base.conditions) ? base.conditions : []),
            actions: Array.isArray(promo.actions) && promo.actions.length ? promo.actions : (Array.isArray(base.actions) ? base.actions : []),
            displays: Array.isArray(promo.displays) && promo.displays.length ? promo.displays : (Array.isArray(base.displays) ? base.displays : []),
            coupons: Array.isArray(promo.coupons) && promo.coupons.length ? promo.coupons : (Array.isArray(base.coupons) ? base.coupons : []),
            badges: Array.isArray(promo.badges) && promo.badges.length ? promo.badges : (Array.isArray(base.badges) ? base.badges : []),
        } as Promotion;
        return { merged, base, variant: promo, variantSourceName: promo.variantName || promo.sku || null, sourceIsVariantObject: false };
    }

    const looksLikePromotion = !!(promo && (promo.conditions || promo.actions || promo.displays || promo.coupons || promo.startDate || promo.endDate || promo.name));
    if (looksLikePromotion) {
        const direct: Promotion = {
            ...promo,
            conditions: Array.isArray(promo.conditions) ? promo.conditions : [],
            actions: Array.isArray(promo.actions) ? promo.actions : [],
            displays: Array.isArray(promo.displays) ? promo.displays : [],
            coupons: Array.isArray(promo.coupons) ? promo.coupons : [],
            badges: Array.isArray(promo.badges) ? promo.badges : [],
        } as Promotion;
        return { merged: direct, base: promo, variant: null, variantSourceName: null, sourceIsVariantObject: false };
    }

    return { merged: null, base: null, variant: null, variantSourceName: null, sourceIsVariantObject: false };
};

export default function PromotionRulesModal({
    open,
    onClose,
    promo,
    appliedPromotionsResult = null,
    preloadedLookup = null,
    variantName = ""
}: Props) {
    const [loadingLookup, setLoadingLookup] = useState(false);
    const [lookupProducts, setLookupProducts] = useState<Record<string, string | undefined>>({});
    const [lookupVariants, setLookupVariants] = useState<Record<string, { sku?: string | undefined; name?: string | undefined }>>({});
    const [timeLeft, setTimeLeft] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"main" | "variant">("main");
    const [showMainTab, setShowMainTab] = useState<boolean>(true);

    const { merged: normalizedPromo, base: basePromo, variant: variantPromo, variantSourceName, sourceIsVariantObject } = useMemo(
        () => interpretIncomingPromo(promo),
        [promo]
    );

    // controlar aba inicial / visibilidade dependendo de quem foi passado
    useEffect(() => {
        if (sourceIsVariantObject) {
            setShowMainTab(false);
            setActiveTab(variantPromo ? "variant" : "main");
        } else {
            setShowMainTab(!!basePromo);
            setActiveTab(variantPromo ? "variant" : "main");
        }
    }, [sourceIsVariantObject, basePromo, variantPromo, normalizedPromo?.id]);

    const { productIds, variantIds } = useMemo(() => {
        if (!normalizedPromo) return { productIds: [], variantIds: [] };
        try {
            return collectPromotionIds(normalizedPromo);
        } catch {
            return { productIds: [], variantIds: [] };
        }
    }, [normalizedPromo]);

    useEffect(() => {
        if (!normalizedPromo?.endDate) {
            setTimeLeft(null);
            return;
        }

        const updateTimeLeft = () => {
            // @ts-ignore
            const end = new Date(normalizedPromo.endDate);
            const now = new Date();
            const diffMs = end.getTime() - now.getTime();

            if (diffMs <= 0) {
                setTimeLeft("Expirado");
                return;
            }

            const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            setTimeLeft(days > 0 ? `${days}d ${hours}h` : `${hours}h ${minutes}m`);
        };

        updateTimeLeft();
        const interval = setInterval(updateTimeLeft, 60000);

        return () => clearInterval(interval);
    }, [normalizedPromo?.endDate]);

    useEffect(() => {
        if (!open) return;

        const hasAllProducts = productIds.every(id => preloadedLookup?.products?.[id] !== undefined);
        const hasAllVariants = variantIds.every(id => preloadedLookup?.variants?.[id] !== undefined);

        if (hasAllProducts && hasAllVariants) {
            setLookupProducts(normalizeProductsMap(preloadedLookup?.products));
            setLookupVariants(normalizeVariantsMap(preloadedLookup?.variants));
            return;
        }

        if (productIds.length === 0 && variantIds.length === 0) {
            setLookupProducts({});
            setLookupVariants({});
            return;
        }

        let mounted = true;
        setLoadingLookup(true);

        const missingProductIds = hasAllProducts ? [] : productIds;
        const missingVariantIds = hasAllVariants ? [] : variantIds;

        (async () => {
            try {
                const res = await lookupCatalog({
                    productIds: missingProductIds,
                    variantIds: missingVariantIds
                });

                if (!mounted) return;

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

                setLookupProducts(prev => ({ ...(preloadedLookup ? normalizeProductsMap(preloadedLookup.products) : {}), ...prev, ...productsMap }));
                setLookupVariants(prev => ({ ...(preloadedLookup ? normalizeVariantsMap(preloadedLookup.variants) : {}), ...prev, ...variantsMap }));
            } catch (err) {
                console.warn("PromotionRulesModal lookupCatalog failed:", err);
                if (mounted && preloadedLookup) {
                    setLookupProducts(normalizeProductsMap(preloadedLookup.products));
                    setLookupVariants(normalizeVariantsMap(preloadedLookup.variants));
                }
            } finally {
                if (mounted) setLoadingLookup(false);
            }
        })();

        return () => { mounted = false; };
    }, [open, productIds.join(","), variantIds.join(","), preloadedLookup]);

    const mapProduct = (id?: string) => {
        if (!id) return "Desconhecido";
        return lookupProducts[id] || `Produto ${id.slice(0, 8)}`;
    };

    const mapVariant = (id?: string) => {
        if (!id) return "Desconhecido";
        const v = lookupVariants[id];
        if (!v) return `Variante ${id.slice(0, 8)}`;
        return v.name || v.sku || `Variante ${id.slice(0, 8)}`;
    };

    const copyCoupon = (code?: string) => {
        if (!code) { toast.error("Cupom inválido"); return; }
        navigator.clipboard.writeText(code).then(
            () => toast.success(`Cupom copiado: ${code}`),
            () => toast.error("Não foi possível copiar o cupom")
        );
    };

    const humanizeCondition = (c: any) => {
        if (!c || !c.type) return "Condição desconhecida";

        const rawVal = c.value ?? c.params ?? {};
        const val = safeParse(rawVal);
        const operator = c.operator ? ` (${OperatorLabel[c.operator] || c.operator})` : "";

        const baseText = ConditionLabel[c.type] || c.type;

        switch (c.type) {
            case "PRODUCT_CODE":
                if (val?.productIds && Array.isArray(val.productIds)) {
                    return `${baseText}: ${val.productIds.map(mapProduct).join(", ")}`;
                }
                return `${baseText}${operator}`;

            case "VARIANT_CODE":
                if (val?.variantIds && Array.isArray(val.variantIds)) {
                    return `${baseText}: ${val.variantIds.map(mapVariant).join(", ")}`;
                }
                return `${baseText}${operator}`;

            case "STATE":
                if (val?.states && Array.isArray(val.states)) {
                    return `${baseText}: ${val.states.join(", ")}`;
                }
                return `${baseText}${operator}`;

            case "FIRST_ORDER":
                return `${baseText}`;

            case "CATEGORY":
            case "CATEGORY_ITEM_COUNT":
            case "CATEGORY_VALUE":
                if (val?.categoryIds && Array.isArray(val.categoryIds)) {
                    return `${baseText}${operator}: ${val.categoryIds.join(", ")}`;
                }
                return `${baseText}${operator}`;

            case "BRAND_VALUE":
                if (val?.brandIds && Array.isArray(val.brandIds)) {
                    return `${baseText}${operator}: ${val.brandIds.join(", ")}`;
                }
                return `${baseText}${operator}`;

            case "USER":
                if (val?.userIds && Array.isArray(val.userIds)) {
                    return `${baseText}${operator}: ${val.userIds.join(", ")}`;
                }
                return `${baseText}${operator}`;

            case "ZIP_CODE":
                if (val?.zipCodes && Array.isArray(val.zipCodes)) {
                    return `${baseText}${operator}: ${val.zipCodes.join(", ")}`;
                }
                return `${baseText}${operator}`;

            default:
                return `${baseText}${operator}`;
        }
    };

    const humanizeAction = (a: any) => {
        if (!a || !a.type) return "Ação desconhecida";

        const rawP = a.params ?? a.value ?? {};
        const p = safeParse(rawP);

        let baseText = ActionLabel[a.type] || a.type;

        baseText = baseText
            .replace("{percent}", p.percent ?? "?")
            .replace("{amount}", p.amount ?? "?")
            .replace("{qty}", p.qty ?? "?");

        switch (a.type) {
            case "PERCENT_PRODUCT":
            case "FIXED_PRODUCT_DISCOUNT":
            case "FREE_PRODUCT_ITEM":
                if (p.productIds && Array.isArray(p.productIds)) {
                    return baseText.replace("{target}", p.productIds.map(mapProduct).join(", "));
                }
                return baseText.replace("{target}", "produtos selecionados");

            case "PERCENT_VARIANT":
            case "FIXED_VARIANT_DISCOUNT":
            case "FREE_VARIANT_ITEM":
                if (p.variantIds && Array.isArray(p.variantIds)) {
                    return baseText.replace("{target}", p.variantIds.map(mapVariant).join(", "));
                }
                return baseText.replace("{target}", "variantes selecionadas");

            case "PERCENT_CATEGORY":
            case "PERCENT_ITEM_COUNT":
                if (p.categoryIds && Array.isArray(p.categoryIds)) {
                    return baseText.replace("{target}", p.categoryIds.join(", "));
                }
                return baseText.replace("{target}", "categorias selecionadas");

            case "PERCENT_BRAND_ITEMS":
            case "FIXED_BRAND_ITEMS":
                if (p.brandIds && Array.isArray(p.brandIds)) {
                    return baseText.replace("{target}", p.brandIds.join(", "));
                }
                return baseText.replace("{target}", "marcas selecionadas");

            case "FIXED_SHIPPING":
                return `${baseText}: R$ ${p.amount ?? "?"}`;

            case "MAX_SHIPPING_DISCOUNT":
                return `${baseText}: R$ ${p.maxAmount ?? "?"}`;

            default:
                return baseText;
        }
    };

    const variantHasOverrides = !!variantPromo && (
        (Array.isArray(variantPromo.conditions) && variantPromo.conditions.length > 0) ||
        (Array.isArray(variantPromo.actions) && variantPromo.actions.length > 0) ||
        (Array.isArray(variantPromo.displays) && variantPromo.displays.length > 0) ||
        (Array.isArray(variantPromo.coupons) && variantPromo.coupons.length > 0) ||
        (Array.isArray(variantPromo.badges) && variantPromo.badges.length > 0)
    );

    if (!open) return null;

    const startDate = normalizedPromo?.startDate ? new Date(normalizedPromo.startDate) : null;
    const endDate = normalizedPromo?.endDate ? new Date(normalizedPromo.endDate) : null;

    const conditions = Array.isArray(normalizedPromo?.conditions) ? normalizedPromo!.conditions : [];
    const actions = Array.isArray(normalizedPromo?.actions) ? normalizedPromo!.actions : [];
    const displays = Array.isArray(normalizedPromo?.displays) ? normalizedPromo!.displays : [];

    // headerScope: texto que explica se é promoção da variante ou do produto principal
    const headerScope = (() => {
        if (variantPromo && basePromo) return `Variante: ${variantName || variantSourceName || "—"} (override)`;
        if (variantPromo && !basePromo) return `Promoção da Variante: ${variantName || variantSourceName || "—"}`;
        if (basePromo && !variantPromo) return "Promoção Principal";
        return "Promoção";
    })();

    // badges da variante: podem estar em variantPromo.badges ou (quando veio o objeto variant como promo) em normalizedPromo.badges
    const variantBadges = (variantPromo && Array.isArray(variantPromo.badges) && variantPromo.badges.length) ? variantPromo.badges
        : (sourceIsVariantObject && Array.isArray(normalizedPromo?.badges) && normalizedPromo!.badges.length ? normalizedPromo!.badges : undefined);

    // badges da promoção principal (base)
    const baseBadges = (basePromo && Array.isArray(basePromo.badges) && basePromo.badges.length) ? basePromo.badges : undefined;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            aria-modal="true"
            role="dialog"
        >
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
                aria-hidden="true"
            />

            <div className="relative w-full max-w-4xl bg-white rounded-lg shadow-lg overflow-hidden max-h-[90vh] flex flex-col">
                <div className="flex items-start justify-between p-4 border-b bg-amber-50">
                    <div className="flex items-start gap-3 w-full">
                        <Info className="w-5 h-5 text-amber-600 mt-1 flex-shrink-0" />
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-amber-800">
                                {displays[0]?.title || normalizedPromo?.name || "Detalhes da promoção"}
                            </h3>
                            <div className="text-sm text-amber-700 mt-1">{headerScope}</div>

                            {/* BADGES NO CABEÇALHO: variante (roxo) primeiro, depois principal (âmbar) */}
                            {(variantBadges || baseBadges) && (
                                <div className="mt-3 flex flex-wrap gap-2 items-center">
                                    {variantBadges && variantBadges.length > 0 && variantBadges.map((b: any, i: number) => (
                                        <div key={b.id || `vb-${i}`} className="p-2 bg-white border rounded flex items-center gap-2 border-purple-200">
                                            {b.imageUrl ? (
                                                <Image
                                                    src={b.imageUrl.startsWith("http") ? b.imageUrl : `${API_URL}/files/${b.imageUrl}`}
                                                    alt={b.title}
                                                    width={120}
                                                    height={120}
                                                    className="w-10 h-10 object-contain"
                                                />
                                            ) : <div className="w-10 h-10 bg-purple-50" />}
                                            <div className="text-xs text-purple-700 font-medium">{b.title}</div>
                                        </div>
                                    ))}

                                    {baseBadges && baseBadges.length > 0 && baseBadges.map((b: any, i: number) => (
                                        <div key={b.id || `bb-${i}`} className="p-2 bg-white border rounded flex items-center gap-2 border-amber-200">
                                            {b.imageUrl ? (
                                                <Image
                                                    src={b.imageUrl.startsWith("http") ? b.imageUrl : `${API_URL}/files/${b.imageUrl}`}
                                                    alt={b.title}
                                                    width={120}
                                                    height={120}
                                                    className="w-10 h-10 object-contain"
                                                />
                                            ) : <div className="w-10 h-10 bg-amber-100" />}
                                            <div className="text-xs text-amber-700">{b.title}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <button
                        aria-label="Fechar"
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-amber-100 text-amber-700"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="overflow-y-auto flex-1 p-4 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3 bg-amber-50 rounded-lg">
                        <div className="flex items-start gap-2">
                            <Clock className="w-5 h-5 text-amber-600 mt-1 flex-shrink-0" />
                            <div>
                                <div className="text-xs text-amber-800 font-medium">Início</div>
                                <div className="text-sm text-black">
                                    {startDate ? startDate.toLocaleString("pt-BR") : "Não definido"}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-start gap-2">
                            <Clock className="w-5 h-5 text-amber-600 mt-1 flex-shrink-0" />
                            <div>
                                <div className="text-xs text-amber-800 font-medium">Término</div>
                                <div className="text-sm text-black">
                                    {endDate ? endDate.toLocaleString("pt-BR") : "Não definido"}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-start gap-2">
                            <Tag className="w-5 h-5 text-amber-600 mt-1 flex-shrink-0" />
                            <div>
                                <div className="text-xs text-amber-800 font-medium">Tempo restante</div>
                                <div className="text-sm font-medium text-black">
                                    {timeLeft || "—"}
                                </div>
                            </div>
                        </div>
                    </div>

                    <section>
                        <h4 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                            <Info className="w-4 h-4 text-blue-600" />
                            Visão rápida (o que será aplicado)
                        </h4>

                        <div className="p-4 bg-white rounded-lg border">
                            <div className="text-sm text-gray-700">
                                {normalizedPromo?.description ? (
                                    <div dangerouslySetInnerHTML={{ __html: normalizedPromo.description }} />
                                ) : (
                                    <div className="text-xs text-gray-500">Sem descrição</div>
                                )}
                            </div>

                            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <div className="text-xs text-gray-500">Condições</div>
                                    <div className="text-sm mt-1 text-black">
                                        {conditions.length ? conditions.slice(0, 3).map((c: any, i) => (<div key={i}>• {humanizeCondition(c)}</div>)) : <div className="text-xs text-gray-500">Nenhuma</div>}
                                        {conditions.length > 3 && <div className="text-xs text-gray-400 mt-1">+ {conditions.length - 3} condições...</div>}
                                    </div>
                                </div>

                                <div>
                                    <div className="text-xs text-gray-500">Benefícios</div>
                                    <div className="text-sm mt-1 text-black">
                                        {actions.length ? actions.slice(0, 3).map((a: any, i) => (<div key={i}>• {humanizeAction(a)}</div>)) : <div className="text-xs text-gray-500">Nenhuma</div>}
                                        {actions.length > 3 && <div className="text-xs text-gray-400 mt-1">+ {actions.length - 3} benefícios...</div>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Abas */}
                    <div className="border-b mb-4">
                        <div className="flex -mb-px">
                            {showMainTab && basePromo && (
                                <button
                                    className={`py-2 px-4 font-medium text-sm ${activeTab === 'main' ? 'border-b-2 border-amber-500 text-amber-600' : 'text-gray-500'}`}
                                    onClick={() => setActiveTab('main')}
                                >
                                    Promoção Principal
                                </button>
                            )}

                            {variantHasOverrides && (
                                <button
                                    className={`py-2 px-4 font-medium text-sm ${activeTab === 'variant' ? 'border-b-2 border-purple-500 text-purple-600' : 'text-gray-500'}`}
                                    onClick={() => setActiveTab('variant')}
                                >
                                    {variantPromo && !basePromo ? `Promoção da Variante` : `Promoções da Variante`}
                                </button>
                            )}

                            {!showMainTab && !variantHasOverrides && (
                                <div className="py-2 px-4 font-medium text-sm text-gray-600">Informações</div>
                            )}
                        </div>
                    </div>

                    {/* Aba: principal */}
                    {activeTab === 'main' && showMainTab && basePromo && (
                        <section>
                            <h4 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                                <Info className="w-4 h-4 text-amber-600" />
                                Regras da promoção principal
                            </h4>

                            <div className="space-y-3">
                                {(Array.isArray(basePromo.displays) && basePromo.displays.length > 0) && (
                                    <div className="p-3 bg-white border rounded">
                                        {basePromo.displays.map((d: any, idx: number) => (
                                            <div key={d.id || idx} className="mb-2">
                                                {d.title && <div className="font-medium text-amber-800">{d.title}</div>}
                                                <div className="text-sm text-gray-700" dangerouslySetInnerHTML={{ __html: d.content || "" }} />
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div>
                                    <div className="text-xs text-gray-500 mb-2">Condições ({(Array.isArray(basePromo.conditions) ? basePromo.conditions.length : 0)})</div>
                                    {loadingLookup ? (
                                        <div className="text-xs text-gray-500">Carregando...</div>
                                    ) : (Array.isArray(basePromo.conditions) && basePromo.conditions.length > 0) ? (
                                        <ul className="space-y-2 text-black">
                                            {basePromo.conditions.map((c: any, i: number) => (
                                                <li key={c.id || i} className="p-3 bg-white border rounded-lg">{humanizeCondition(c)}</li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <div className="text-xs text-gray-500">Sem condições</div>
                                    )}
                                </div>

                                <div>
                                    <div className="text-xs text-gray-500 mb-2">Benefícios ({(Array.isArray(basePromo.actions) ? basePromo.actions.length : 0)})</div>
                                    {loadingLookup ? (
                                        <div className="text-xs text-gray-500">Carregando...</div>
                                    ) : (Array.isArray(basePromo.actions) && basePromo.actions.length > 0) ? (
                                        <ul className="space-y-2 text-black">
                                            {basePromo.actions.map((a: any, i: number) => (
                                                <li key={a.id || i} className="p-3 bg-white border rounded-lg">{humanizeAction(a)}</li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <div className="text-xs text-gray-500">Sem benefícios</div>
                                    )}
                                </div>

                                {Array.isArray(basePromo.coupons) && basePromo.coupons.length > 0 && (
                                    <div className="p-3 bg-amber-50 border rounded">
                                        <div className="text-xs text-amber-700 font-medium mb-2">Cupons</div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                            {basePromo.coupons.map((c: any, i: number) => (
                                                <div key={c.id || i} className="p-2 bg-white border rounded flex justify-between items-center">
                                                    <div className="font-mono text-black">{c.code}</div>
                                                    <div className="flex gap-2">
                                                        <button onClick={() => copyCoupon(c.code)} className="p-1 rounded border text-gray-500">Copiar</button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* NOTA: basePromo.badges já renderizadas no cabeçalho para destaque; removido daqui para evitar duplicação */}
                            </div>
                        </section>
                    )}

                    {/* Aba: variante */}
                    {activeTab === 'variant' && variantHasOverrides && variantPromo && (
                        <section>
                            <h4 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                                <Tag className="w-4 h-4 text-purple-600" />
                                Regras da variante {variantName ? `- ${variantName}` : variantSourceName ? `- ${variantSourceName}` : ""}
                            </h4>

                            <div className="space-y-3">
                                {(Array.isArray(variantPromo.displays) && variantPromo.displays.length > 0) && (
                                    <div className="p-3 bg-white border rounded">
                                        {variantPromo.displays.map((d: any, idx: number) => (
                                            <div key={d.id || idx} className="mb-2">
                                                {d.title && <div className="font-medium text-amber-800">{d.title}</div>}
                                                <div className="text-sm text-gray-700" dangerouslySetInnerHTML={{ __html: d.content || "" }} />
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div>
                                    <div className="text-xs text-gray-500 mb-2">Condições ({(Array.isArray(variantPromo.conditions) ? variantPromo.conditions.length : 0)})</div>
                                    {loadingLookup ? (
                                        <div className="text-xs text-gray-500">Carregando...</div>
                                    ) : (Array.isArray(variantPromo.conditions) && variantPromo.conditions.length > 0) ? (
                                        <ul className="space-y-2">
                                            {variantPromo.conditions.map((c: any, i: number) => (
                                                <li key={c.id || i} className="p-3 bg-white border rounded-lg">{humanizeCondition(c)}</li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <div className="text-xs text-gray-500">Sem condições específicas</div>
                                    )}
                                </div>

                                <div>
                                    <div className="text-xs text-gray-500 mb-2">Benefícios ({(Array.isArray(variantPromo.actions) ? variantPromo.actions.length : 0)})</div>
                                    {loadingLookup ? (
                                        <div className="text-xs text-gray-500">Carregando...</div>
                                    ) : (Array.isArray(variantPromo.actions) && variantPromo.actions.length > 0) ? (
                                        <ul className="space-y-2">
                                            {variantPromo.actions.map((a: any, i: number) => (
                                                <li key={a.id || i} className="p-3 bg-white border rounded-lg">{humanizeAction(a)}</li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <div className="text-xs text-gray-500">Sem benefícios específicos</div>
                                    )}
                                </div>

                                {Array.isArray(variantPromo.coupons) && variantPromo.coupons.length > 0 && (
                                    <div className="p-3 bg-amber-50 border rounded">
                                        <div className="text-xs text-amber-700 font-medium mb-2">Cupons (variante)</div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                            {variantPromo.coupons.map((c: any, i: number) => (
                                                <div key={c.id || i} className="p-2 bg-white border rounded flex justify-between items-center">
                                                    <div className="font-mono">{c.code}</div>
                                                    <div className="flex gap-2">
                                                        <button onClick={() => copyCoupon(c.code)} className="p-1 rounded border">Copiar</button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* badges da variante já renderizadas no cabeçalho para destaque */}
                            </div>
                        </section>
                    )}

                    {!showMainTab && !variantHasOverrides && (
                        <>
                            {displays.length > 0 && (
                                <section>
                                    <h4 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                                        <Info className="w-4 h-4 text-amber-600" />
                                        Informações promocionais
                                    </h4>

                                    <div className="space-y-3">
                                        {displays.map((d: any, index: number) => (
                                            <div key={d.id || index} className="p-4 border rounded-lg bg-white shadow-sm">
                                                <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: d.content || "" }} />
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}
                        </>
                    )}

                    {appliedPromotionsResult && (
                        <section className="p-4 bg-blue-50 rounded-lg">
                            <h4 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                                <Info className="w-4 h-4 text-blue-600" />
                                Simulação de aplicação
                            </h4>

                            <div className="bg-white p-3 rounded border">
                                <div className="flex justify-between text-sm mb-2">
                                    <div>Desconto total estimado:</div>
                                    <div className="font-medium text-green-700">
                                        R$ {Number(appliedPromotionsResult.discountTotal || 0).toFixed(2)}
                                    </div>
                                </div>

                                {appliedPromotionsResult.freeGifts && appliedPromotionsResult.freeGifts.length > 0 && (
                                    <div className="mt-3">
                                        <div className="text-xs text-gray-500 font-medium">Brindes incluídos:</div>
                                        <ul className="mt-1 space-y-1">
                                            {appliedPromotionsResult.freeGifts.map((g, i) => (
                                                <li key={i} className="text-sm">
                                                    {g.quantity}x {mapVariant(g.variantId)}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {appliedPromotionsResult.descriptions && appliedPromotionsResult.descriptions.length > 0 && (
                                    <div className="mt-3">
                                        <div className="text-xs text-gray-500 font-medium">Promoções aplicadas:</div>
                                        <ul className="mt-1 space-y-1">
                                            {appliedPromotionsResult.descriptions.map((d, i) => (
                                                <li key={i} className="text-sm">• {d}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </section>
                    )}

                </div>

                <div className="p-4 border-t flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
}