"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { toast } from "react-toastify";
import PromotionRulesModal from "./PromotionRulesModal";
import { Promotion } from "Types/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

/** Helpers **/
const ensureFullImageUrl = (src?: string | null | undefined) => {
  if (!src) return undefined;
  const s = String(src).trim();
  if (!s) return undefined;
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  const cleaned = s.replace(/^\/+/, "");
  if (cleaned.startsWith("files/")) return `${API_URL}/${cleaned}`;
  return `${API_URL}/files/${cleaned}`;
};

const extractImgSrcFromHtml = (html?: string | null) => {
  if (!html || typeof html !== "string") return null;
  const m = html.match(/<img[^>]+src=(?:'|")([^'"]+)(?:'|")/i);
  return m ? m[1] : null;
};

type ScopeType = "product" | "variant";

interface PromotionSectionProps {
  promo: Promotion | any;
  scope?: ScopeType;
  variantName?: string;
  preloadedLookup?: any;
  isMain?: boolean;
}

export default function PromotionSection({
  promo,
  scope = "product",
  variantName,
  preloadedLookup,
  isMain = false,
}: PromotionSectionProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string | null>(null);

  if (!promo) return null;

  // normalize arrays
  const badgesRaw: any[] = Array.isArray(promo?.badges) ? promo.badges : [];
  const displaysRaw: any[] = Array.isArray(promo?.displays) ? promo.displays : [];
  const coupons: any[] = Array.isArray(promo?.coupons) ? promo.coupons : [];

  // Build lists of display images by type
  const spotDisplayImages = useMemo(() => {
    const imgs: string[] = [];
    for (const d of displaysRaw) {
      const type = (d?.type ?? "").toString().toUpperCase();
      if (type !== "SPOT") continue;
      // prefer explicit image field if present, else parse HTML
      const explicit = d?.imageUrl ?? d?.image ?? d?.img ?? null;
      let src = explicit ?? null;
      if (!src) src = extractImgSrcFromHtml(d?.content ?? d?.html ?? "");
      const normalized = ensureFullImageUrl(src ?? undefined);
      if (normalized) imgs.push(normalized);
    }
    return imgs;
  }, [displaysRaw]);

  const productPageDisplayImages = useMemo(() => {
    const imgs: string[] = [];
    for (const d of displaysRaw) {
      const type = (d?.type ?? "").toString().toUpperCase();
      if (type !== "PRODUCT_PAGE") continue;
      const explicit = d?.imageUrl ?? d?.image ?? d?.img ?? null;
      let src = explicit ?? null;
      if (!src) src = extractImgSrcFromHtml(d?.content ?? d?.html ?? "");
      const normalized = ensureFullImageUrl(src ?? undefined);
      if (normalized) imgs.push(normalized);
    }
    return imgs;
  }, [displaysRaw]);

  // Filter badges to show on PRODUCT_PAGE: exclude those that are actually SPOT images
  const productPageBadges = useMemo(() => {
    const out: any[] = [];
    for (const b of badgesRaw) {
      const img = ensureFullImageUrl(b?.imageUrl ?? b?.image ?? b?.img ?? undefined);
      // if badge image equals a SPOT display image -> exclude for product page
      if (img && spotDisplayImages.includes(img)) continue;
      out.push({ ...b, imageUrl: img ?? undefined });
    }
    return out;
  }, [badgesRaw, spotDisplayImages]);

  // For compact "badges displayed on product page", we use productPageBadges.
  // For spots (cards) we'll use displays of type SPOT and badges from promotions ONLY if
  // that promotion contains SPOT displays (handled on Cards component).

  // compute hasProductPageDisplay
  const hasProductPageDisplay = displaysRaw.some((d: any) => (d?.type ?? "").toString().toUpperCase() === "PRODUCT_PAGE");

  useEffect(() => {
    const ed = promo?.endDate ?? promo?.end_date ?? null;
    const getTimeLeft = (endDate?: string | null) => {
      if (!endDate) return null;
      const end = new Date(endDate);
      const now = new Date();
      const diffMs = end.getTime() - now.getTime();
      if (diffMs <= 0) return "Expirado";
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      return days > 0 ? `${days}d ${hours}h` : `${hours}h ${minutes}m`;
    };

    setTimeLeft(getTimeLeft(ed));
    const id = setInterval(() => setTimeLeft(getTimeLeft(ed)), 60_000);
    return () => clearInterval(id);
  }, [promo?.endDate, promo?.end_date]);

  const copyToClipboard = (code?: string) => {
    if (!code) return toast.error("Cupom inválido");
    navigator.clipboard.writeText(code).then(
      () => toast.success(`Cupom copiado: ${code}`),
      () => toast.error("Não foi possível copiar o cupom")
    );
  };

  const headerClass = isMain ? "border-2 border-amber-500 shadow-md" : "border border-amber-200";
  const headerLabel = scope === "variant" ? (variantName ? `VARIANTE — ${variantName}` : "VARIANTE") : "PRODUTO";

  return (
    <>
      <section className={`bg-gradient-to-r from-amber-50 via-white to-amber-50 rounded-lg p-4 ${headerClass}`}>
        <header className="flex items-center mb-3 justify-between">
          <div className="flex items-center gap-3">
            <div className={`px-2 py-1 rounded text-xs font-bold ${scope === "variant" ? "bg-purple-600 text-white" : "bg-amber-500 text-white"}`}>
              {headerLabel}
            </div>

            <div className="flex flex-col">
              <h3 className="text-lg font-extrabold text-amber-800">{promo.name}</h3>
              {promo.description && <div className="text-sm text-slate-700 mt-1 max-w-prose">{promo.description}</div>}
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs text-gray-500">Acaba em</div>
            <div className="text-sm font-semibold text-amber-800">{timeLeft ?? "—"}</div>
            <button
              onClick={() => setModalOpen(true)}
              className="mt-2 inline-flex items-center gap-2 text-sm bg-amber-600 text-white px-3 py-1 rounded"
            >
              Ver regras
            </button>
          </div>
        </header>

        {/* PRODUCT_PAGE: mostrar title/content + badges (imagens) */}
        {hasProductPageDisplay ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
            <div className="md:col-span-2">
              {displaysRaw.map((d: any, idx: number) => {
                if ((d.type ?? "").toString().toUpperCase() !== "PRODUCT_PAGE") return null;
                return (
                  <article key={d.id ?? idx} className="mb-3 bg-white p-3 border rounded">
                    {d.title && <h4 className="font-semibold text-amber-800">{d.title}</h4>}
                    <div className="mt-2 text-sm text-gray-700" dangerouslySetInnerHTML={{ __html: d.content ?? "" }} />
                  </article>
                );
              })}
            </div>

            <div className="flex flex-col gap-2">
              {/* Only show badges relevant to product page (we excluded SPOT images above) */}
              {productPageBadges.length > 0 ? (
                productPageBadges.map((b: any, i: number) => (
                  <div key={b.id ?? i} className="p-2 bg-white border rounded flex items-center gap-2">
                    {b.imageUrl ? (
                      <Image
                        src={b.imageUrl}
                        alt={b.title ?? `badge-${i}`}
                        width={120}
                        height={120}
                        className="w-20 h-20 object-contain"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-amber-100" />
                    )}
                    <div className="text-xs text-amber-700">{b.title}</div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-gray-500">Sem etiquetas</div>
              )}
            </div>
          </div>
        ) : (
          // Resumo e badges compactos (se existirem) — somente productPageBadges aqui também
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              {displaysRaw[0] && (displaysRaw[0].type ?? "").toString().toUpperCase() === "PRODUCT_PAGE" ? (
                <div className="text-sm text-gray-700" dangerouslySetInnerHTML={{ __html: displaysRaw[0].content ?? "" }} />
              ) : (
                <div className="text-sm text-gray-600">Sem conteúdo adicional.</div>
              )}
            </div>

            <div>
              {productPageBadges.length > 0 ? (
                productPageBadges.slice(0, 3).map((b: any, i: number) => (
                  <div key={b.id ?? i} className="mb-2 p-2 bg-white border rounded flex items-center gap-2">
                    {b.imageUrl ? (
                      <Image
                        src={b.imageUrl}
                        alt={b.title ?? `badge-${i}`}
                        width={80}
                        height={80}
                        className="w-14 h-14 object-contain"
                      />
                    ) : (
                      <div className="w-14 h-14 bg-amber-100" />
                    )}
                    <div className="text-xs text-amber-700">{b.title}</div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-gray-500">Sem etiquetas</div>
              )}
            </div>
          </div>
        )}

        {/* Cupons resumidos */}
        {coupons.length > 0 && (
          <div className="mt-4 bg-white p-3 border rounded">
            <div className="text-xs text-amber-700 font-medium mb-2">Cupons</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {coupons.map((c: any, i: number) => (
                <div key={c.id ?? i} className="p-2 bg-slate-50 border rounded flex justify-between items-center">
                  <div className="font-mono text-sm">{c.code}</div>
                  <button onClick={() => copyToClipboard(c.code)} className="px-2 py-1 bg-amber-600 text-white rounded text-xs">Copiar</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <PromotionRulesModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        promo={promo}
        preloadedLookup={preloadedLookup}
        variantName={variantName}
      />
    </>
  );
}