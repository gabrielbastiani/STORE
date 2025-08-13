// services/catalogLookup.ts
import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;
if (!API_BASE) throw new Error("NEXT_PUBLIC_API_URL não configurado");

export interface CatalogLookupRequest {
    productIds?: string[];
    variantIds?: string[];
}

export type ProductEntry = { id: string; name?: string | null };
export type VariantEntry = { id: string; sku?: string | null; name?: string | null };

interface LookupResponse {
    products: ProductEntry[];
    variants: VariantEntry[];
}

// Cache em memória otimizado (valores podem ser null para indicar "conhecido sem nome")
const MEM_CACHE: {
    products: Record<string, string | null>;
    variants: Record<string, { sku?: string | null; name?: string | null }>;
} = {
    products: {},
    variants: {},
};

// Função robusta para coletar IDs profundamente (arrays, singulares, chaves com sufixo)
const deepCollectIds = (obj: any, pSet: Set<string>, vSet: Set<string>): void => {
    if (obj == null || typeof obj !== 'object') return;

    if (Array.isArray(obj)) {
        obj.forEach(item => deepCollectIds(item, pSet, vSet));
        return;
    }

    Object.entries(obj).forEach(([key, value]) => {
        // Arrays de strings nomeadas 'productIds' / 'variantIds'
        if (Array.isArray(value) && value.every(v => typeof v === 'string')) {
            if (/productIds?$/i.test(key)) {
                (value as string[]).forEach(id => id && pSet.add(id));
                return;
            }
            if (/variantIds?$/i.test(key)) {
                (value as string[]).forEach(id => id && vSet.add(id));
                return;
            }
        }

        // Strings singulares 'productId' / 'variantId' ou chaves que terminem em ProductId/VariantId
        if (typeof value === 'string') {
            if (/productId$/i.test(key)) {
                pSet.add(value);
                return;
            }
            if (/variantId$/i.test(key)) {
                vSet.add(value);
                return;
            }
        }

        // Recurse em objetos aninhados
        if (value && typeof value === 'object') {
            deepCollectIds(value, pSet, vSet);
        }
    });
};

export async function lookupCatalog(
    payload: CatalogLookupRequest,
    options?: { force?: boolean }
): Promise<LookupResponse> {
    const base = API_BASE?.replace(/\/$/, "");
    const url = `${base}/catalog/lookup`;

    const productIds = Array.isArray(payload.productIds) ? payload.productIds.filter(Boolean) : [];
    const variantIds = Array.isArray(payload.variantIds) ? payload.variantIds.filter(Boolean) : [];

    // Determinar quais realmente faltam no cache (ou se forçar)
    const missingProductIds = (options?.force ? productIds : productIds.filter(id => {
        // faltante se não existir no cache ou se o valor é undefined/null (sem nome útil)
        return !(Object.prototype.hasOwnProperty.call(MEM_CACHE.products, id) && MEM_CACHE.products[id] != null);
    }));

    const missingVariantIds = (options?.force ? variantIds : variantIds.filter(id => {
        if (!Object.prototype.hasOwnProperty.call(MEM_CACHE.variants, id)) return true;
        const v = MEM_CACHE.variants[id];
        // se tanto sku quanto name são undefined/null, consideramos faltante
        if (!v) return true;
        if ((v.name === undefined || v.name === null) && (v.sku === undefined || v.sku === null)) return true;
        return false;
    }));

    // Se todos já estão no cache e não estamos forçando, retorna imediatamente
    if (missingProductIds.length === 0 && missingVariantIds.length === 0) {
        return {
            products: productIds.map(id => ({ id, name: MEM_CACHE.products[id] ?? null })),
            variants: variantIds.map(id => ({ id, ...(MEM_CACHE.variants[id] || { sku: null, name: null }) })),
        };
    }

    // Preparar corpo apenas com IDs faltantes
    const body: CatalogLookupRequest = {};
    if (missingProductIds.length > 0) body.productIds = missingProductIds;
    if (missingVariantIds.length > 0) body.variantIds = missingVariantIds;

    try {
        const res = await axios.post<LookupResponse>(url, body, {
            headers: { "Content-Type": "application/json" },
            timeout: 10000,
        });

        // Atualizar cache com os valores retornados (usar null quando não houver nome)
        (res.data.products || []).forEach(p => {
            MEM_CACHE.products[p.id] = typeof p.name === 'string' ? p.name : null;
        });

        (res.data.variants || []).forEach(v => {
            MEM_CACHE.variants[v.id] = {
                sku: v.sku ?? null,
                name: v.name ?? null
            };
        });

        // Garantir que qualquer missingId que NÃO veio no response seja gravado como null (evita reconsulta imediata)
        missingProductIds.forEach(id => {
            if (!Object.prototype.hasOwnProperty.call(MEM_CACHE.products, id)) {
                MEM_CACHE.products[id] = null;
            }
        });
        missingVariantIds.forEach(id => {
            if (!Object.prototype.hasOwnProperty.call(MEM_CACHE.variants, id)) {
                MEM_CACHE.variants[id] = { sku: null, name: null };
            }
        });

        return {
            products: productIds.map(id => ({ id, name: MEM_CACHE.products[id] ?? null })),
            variants: variantIds.map(id => ({ id, ...(MEM_CACHE.variants[id] || { sku: null, name: null }) })),
        };
    } catch (err: any) {
        console.warn("lookupCatalog error:", err?.message ?? err, { url, body });
        // Fallback: retornar dados do cache (null quando não existir)
        return {
            products: productIds.map(id => ({ id, name: MEM_CACHE.products[id] ?? null })),
            variants: variantIds.map(id => ({ id, ...(MEM_CACHE.variants[id] || { sku: null, name: null }) })),
        };
    }
}

// Função auxiliar para coleta de IDs de promoções
export function collectPromotionIds(promo: any): { productIds: string[]; variantIds: string[] } {
    const pSet = new Set<string>();
    const vSet = new Set<string>();

    if (!promo) return { productIds: [], variantIds: [] };

    // Coletar de todas as partes mais comuns da promoção
    deepCollectIds(promo.conditions ?? [], pSet, vSet);
    deepCollectIds(promo.actions ?? [], pSet, vSet);
    deepCollectIds(promo.displays ?? [], pSet, vSet);

    // Também inspecionar o próprio objeto promo (por segurança)
    deepCollectIds(promo, pSet, vSet);

    return {
        productIds: Array.from(pSet),
        variantIds: Array.from(vSet)
    };
}