"use client";

import { setupAPIClient } from "@/services/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export type SpotBadge = { id?: string; imageUrl?: string; title?: string };

/**
 * Garantir URL absoluta para uma imagem (aceita http/https, /files/ ou apenas nome de arquivo).
 */
export function ensureFullImageUrl(src?: string | null | undefined): string | undefined {
  if (!src) return undefined;
  const s = String(src).trim();
  if (!s) return undefined;
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  const cleaned = s.replace(/^\/+/, "");
  // se já vier com files/ ou arquivos completos
  if (cleaned.startsWith("files/")) return `${API_URL}/${cleaned}`;
  return `${API_URL}/files/${cleaned}`;
}

/** Extrai src do primeiro <img src="..."> encontrado no HTML */
export function extractImgSrcFromHtml(html?: string | null): string | null {
  if (!html || typeof html !== "string") return null;
  const m = html.match(/<img[^>]+src=(?:'|")([^'"]+)(?:'|")/i);
  return m ? m[1] : null;
}

/**
 * Coleta badges SPOT já presentes no objeto product (mainPromotion, promotions, displays tipo SPOT, badges top-level).
 * Retorna array normalizado com imageUrl absoluto (se possível).
 */
export function collectSpotBadgesFromProductObject(product: any): SpotBadge[] {
  const out: SpotBadge[] = [];
  if (!product) return [];

  const pushBadge = (b: any) => {
    if (!b) return;
    const img = ensureFullImageUrl(b.imageUrl ?? b.image ?? b.img ?? undefined);
    out.push({ id: b.id, imageUrl: img, title: b.title ?? b.name ?? undefined });
  };

  const collectFromPromo = (p: any) => {
    if (!p) return;
    const displays = Array.isArray(p.displays) ? p.displays : [];
    // se não houver displays do tipo SPOT, ignoramos (pois queremos apenas SPOT)
    const hasSpot = displays.some((d: any) => (d?.type ?? "").toString().toUpperCase() === "SPOT");
    if (!hasSpot) return;
    if (Array.isArray(p.badges)) p.badges.forEach(pushBadge);

    displays.forEach((d: any) => {
      if ((d?.type ?? "").toString().toUpperCase() !== "SPOT") return;
      const explicit = d.imageUrl ?? d.image ?? d.img ?? null;
      let src = explicit ?? null;
      if (!src) src = extractImgSrcFromHtml(d?.content ?? d?.html ?? "");
      const normalized = ensureFullImageUrl(src ?? undefined);
      if (normalized) out.push({ id: d.id, imageUrl: normalized, title: d.title ?? undefined });
    });
  };

  try { collectFromPromo(product?.mainPromotion); } catch { /* ignore */ }
  try {
    if (Array.isArray(product?.promotions)) {
      product.promotions.forEach((p: any) => collectFromPromo(p));
    }
  } catch { /* ignore */ }

  // fallback: product.badges (top-level) — podem existir em alguns payloads
  try {
    if (Array.isArray(product?.badges)) {
      product.badges.forEach((b: any) => pushBadge(b));
    }
  } catch { /* ignore */ }

  // dedupe por imageUrl/id/title
  const map = new Map<string, SpotBadge>();
  for (const b of out) {
    const key = b.imageUrl ?? b.id ?? b.title ?? JSON.stringify(b);
    if (!map.has(key)) map.set(key, b);
  }
  return Array.from(map.values());
}

/**
 * Consulta a rota store/promotions para coletar SPOT badges relacionados ao product_id.
 * Retorna array de SpotBadge (imageUrl absoluto quando possível).
 */
export async function fetchSpotBadgesFromApi(productId?: string): Promise<SpotBadge[]> {
  if (!productId) return [];
  try {
    const api = setupAPIClient();
    const resp = await api.get("/store/promotions", { params: { product_id: productId } });
    const data = resp.data ?? {};
    const collected: SpotBadge[] = [];

    const pushFromPromo = (p: any) => {
      if (!p) return;
      const displays = Array.isArray(p.displays) ? p.displays : [];
      const hasSpot = displays.some((d: any) => (d?.type ?? "").toString().toUpperCase() === "SPOT");
      if (!hasSpot) return;
      if (Array.isArray(p.badges)) {
        p.badges.forEach((b: any) => {
          const img = ensureFullImageUrl(b?.imageUrl ?? b?.image ?? b?.img ?? undefined);
          collected.push({ id: b?.id, imageUrl: img, title: b?.title ?? b?.name ?? undefined });
        });
      }
      displays.forEach((d: any) => {
        if ((d?.type ?? "").toString().toUpperCase() !== "SPOT") return;
        const explicit = d?.imageUrl ?? d?.image ?? d?.img ?? null;
        let src = explicit ?? null;
        if (!src) src = extractImgSrcFromHtml(d?.content ?? d?.html ?? "");
        const normalized = ensureFullImageUrl(src ?? undefined);
        if (normalized) collected.push({ id: d.id, imageUrl: normalized, title: d.title ?? undefined });
      });
    };

    if (data.productMainPromotion) pushFromPromo(data.productMainPromotion);
    if (Array.isArray(data.productPromotions)) data.productPromotions.forEach(pushFromPromo);

    // dedupe
    const map = new Map<string, SpotBadge>();
    for (const b of collected) {
      const key = b.imageUrl ?? b.id ?? b.title ?? JSON.stringify(b);
      if (!map.has(key)) map.set(key, b);
    }
    return Array.from(map.values());
  } catch (err) {
    console.warn("fetchSpotBadgesFromApi failed", err);
    return [];
  }
}