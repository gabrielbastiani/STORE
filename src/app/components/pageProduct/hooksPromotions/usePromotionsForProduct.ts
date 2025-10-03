"use client";

import { useEffect, useState } from "react";
import { setupAPIClient } from "@/services/api";

type VariantMap = Record<string, any[]>;
type VariantMainMap = Record<string, any | null>;

function isUsefulPromotion(p: any) {
  if (!p) return false;
  if (typeof p.id === "string" && p.id.length > 0) return true;
  if (Array.isArray(p.displays) && p.displays.length > 0) return true;
  if (Array.isArray(p.actions) && p.actions.length > 0) return true;
  if (Array.isArray(p.badges) && p.badges.length > 0) return true;
  if (Array.isArray(p.coupons) && p.coupons.length > 0) return true;
  return false;
}

export default function usePromotionsForProduct(productId?: string, variantId?: string, variantSku?: string) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<any>(null);

    const [all, setAll] = useState<any[]>([]);
    const [productPromotions, setProductPromotions] = useState<any[]>([]);
    const [productMainPromotion, setProductMainPromotion] = useState<any | null>(null);
    const [variantPromotions, setVariantPromotions] = useState<VariantMap>({});
    const [variantMainPromotions, setVariantMainPromotions] = useState<VariantMainMap>({});
    const [apiFetched, setApiFetched] = useState<boolean>(false);

    useEffect(() => {
        // reset when no context
        if (!productId && !variantId && !variantSku) {
            setAll([]); setProductPromotions([]); setProductMainPromotion(null);
            setVariantPromotions({}); setVariantMainPromotions({}); setError(null); setLoading(false); setApiFetched(false);
            return;
        }

        let mounted = true;
        const api = setupAPIClient();

        (async () => {
            setLoading(true);
            setError(null);
            setApiFetched(false);
            try {
                const params: any = {};
                if (productId) params.product_id = productId;
                if (variantId) params.variant_id = variantId;
                if (variantSku) params.variant_sku = variantSku;

                const resp = await api.get("/store/promotions", { params });
                if (!mounted) return;

                const data = resp.data || {};

                const allArr: any[] = Array.isArray(data.all) ? data.all : [];
                const prodProms: any[] = Array.isArray(data.productPromotions) ? data.productPromotions : [];
                const prodMain = data.productMainPromotion ?? null;
                const varProms = (typeof data.variantPromotions === "object" && data.variantPromotions) ? data.variantPromotions : {};
                const varMain = (typeof data.variantMainPromotions === "object" && data.variantMainPromotions) ? data.variantMainPromotions : {};

                // Basic assignments
                setAll(allArr);
                setProductPromotions(prodProms);
                setProductMainPromotion(prodMain);

                // We will now "enrich" variantMainPromotions: if API returned a minimal object (or arrays empty),
                // try to find the full promo in variantPromotions[v] or in all[] by id.
                const enrichedVariantMain: VariantMainMap = {};

                // helper: find by id in given source arrays
                const findPromoById = (id?: string) => {
                    if (!id) return null;
                    // search in variantPromotions values
                    for (const k of Object.keys(varProms)) {
                        const arr = varProms[k] || [];
                        const found = arr.find((p: any) => p && p.id === id);
                        if (found) return found;
                    }
                    // search in allArr
                    const foundAll = allArr.find((p: any) => p && p.id === id);
                    if (foundAll) return foundAll;
                    return null;
                };

                // iterate keys from varMain + varProms (union of keys)
                const allVariantKeys = new Set<string>([...Object.keys(varMain || {}), ...Object.keys(varProms || {})]);
                for (const k of Array.from(allVariantKeys)) {
                    const apiVal = varMain[k]; // may be null, minimal, or full
                    // if apiVal is useful, keep it
                    if (isUsefulPromotion(apiVal)) {
                        enrichedVariantMain[k] = apiVal;
                        continue;
                    }

                    // if apiVal has an id, try to find a richer object by id
                    if (apiVal && apiVal.id) {
                        const richer = findPromoById(apiVal.id);
                        if (richer) {
                            enrichedVariantMain[k] = richer;
                            continue;
                        }
                    }

                    // otherwise, attempt to pick the first variant-specific promotion (varProms[k][0]) if exists
                    const candidates = Array.isArray(varProms[k]) ? varProms[k] : [];
                    if (candidates.length > 0) {
                        // prefer first candidate that is useful, else the first candidate
                        const usefulCandidate = candidates.find(c => isUsefulPromotion(c));
                        enrichedVariantMain[k] = usefulCandidate ?? candidates[0];
                        continue;
                    }

                    // fallback: keep whatever API provided (could be null) — don't overwrite when undefined
                    enrichedVariantMain[k] = apiVal ?? null;
                }

                // If there are no keys at all but variantId was requested, ensure we have an entry for requested variant
                if (variantId && !(variantId in enrichedVariantMain)) {
                    const apiVal = varMain[variantId] ?? null;
                    if (isUsefulPromotion(apiVal)) {
                        enrichedVariantMain[variantId] = apiVal;
                    } else {
                        // try to search in varProms or all
                        const candidates = Array.isArray(varProms[variantId]) ? varProms[variantId] : [];
                        if (candidates.length) {
                            const usefulCandidate = candidates.find(c => isUsefulPromotion(c));
                            enrichedVariantMain[variantId] = usefulCandidate ?? candidates[0];
                        } else {
                            // try to find by id if apiVal has id
                            if (apiVal && apiVal.id) {
                                const richer = findPromoById(apiVal.id);
                                enrichedVariantMain[variantId] = richer ?? apiVal;
                            } else {
                                enrichedVariantMain[variantId] = apiVal ?? null;
                            }
                        }
                    }
                }

                // Make sure we also include any variantMain keys that came from product.variants embedded previously
                // (frontend may merge embedded data later; here we just set what API returned/enriched)
                setVariantPromotions(varProms);
                setVariantMainPromotions(enrichedVariantMain);

                setApiFetched(true);
            } catch (err) {
                console.error("usePromotionsForProduct error:", err);
                if (!mounted) return;
                setError(err);
                setAll([]); setProductPromotions([]); setProductMainPromotion(null);
                setVariantPromotions({}); setVariantMainPromotions({});
                setApiFetched(true); // fetched but failed — avoid indefinite loading
            } finally {
                if (mounted) setLoading(false);
            }
        })();

        return () => { mounted = false; };
    }, [productId, variantId, variantSku]);

    return { loading, error, all, productPromotions, productMainPromotion, variantPromotions, variantMainPromotions, apiFetched };
}