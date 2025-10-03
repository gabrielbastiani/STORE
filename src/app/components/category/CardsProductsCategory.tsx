"use client";

import React, { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { FiShoppingCart } from "react-icons/fi";
import { ProductFormData } from "Types/types";
import { useCart } from "@/app/contexts/CartContext";
import { toSrc } from "./utilsProduct";
import { useTheme } from "@/app/contexts/ThemeContext";
import VariantModal from "./VariantModal";
import SpotBadgeCarousel from "./SpotBadgeCarousel";
import { setupAPIClient } from "@/services/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

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

export default function CardsProductsCategory({
  product,
  colorsProp,
}: {
  product: ProductFormData;
  colors?: any;
  colorsProp?: any;
}) {
  const { addItem } = useCart();
  const { colors } = useTheme();
  const localColors = colorsProp ?? colors;
  const [quantity, setQuantity] = useState<number>(1);
  const [adding, setAdding] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const primaryImage =
    product.primaryImage ?? product.images?.[0]?.url ?? product.images?.[0] ?? "/placeholder.png";
  const imagePath = toSrc(primaryImage as string);

  const hasOffer = (product.price_per ?? 0) < (product.price_of ?? product.price_per ?? 0);
  const discountPercentage = hasOffer
    ? Math.round((1 - (product.price_per ?? 0) / (product.price_of ?? product.price_per ?? 1)) * 100)
    : 0;

  function handleDecrease() { setQuantity((q) => Math.max(1, q - 1)); }
  function handleIncrease() { setQuantity((q) => q + 1); }

  async function handleAddSimple() {
    try {
      setAdding(true);
      await addItem(String(product.id), quantity);
      setQuantity(1);
    } catch (err) {
      console.error(err);
    } finally {
      setAdding(false);
    }
  }

  // Gather SPOT badges only:
  const gatherSpotBadgesFromProduct = useMemo(() => {
    const badges: Array<{ id?: string; imageUrl?: string; title?: string }> = [];

    // Helper to collect from promo object only if promo includes SPOT displays
    const tryCollectFromPromo = (p: any) => {
      if (!p) return;
      // Determine if promotion has SPOT display
      const hasSpot = Array.isArray(p.displays) && p.displays.some((d: any) => (d?.type ?? "").toString().toUpperCase() === "SPOT");
      if (!hasSpot) return;

      // include explicit badges (if any)
      if (Array.isArray(p.badges)) {
        p.badges.forEach((b: any) => {
          const img = ensureFullImageUrl(b?.imageUrl ?? b?.image ?? b?.img ?? undefined);
          badges.push({ id: b?.id, imageUrl: img, title: b?.title ?? b?.name ?? undefined });
        });
      }

      // collect images from SPOT displays
      if (Array.isArray(p.displays)) {
        p.displays.forEach((d: any) => {
          if ((d?.type ?? "").toString().toUpperCase() !== "SPOT") return;
          const explicit = d?.imageUrl ?? d?.image ?? d?.img ?? null;
          let src = explicit ?? null;
          if (!src) src = extractImgSrcFromHtml(d?.content ?? d?.html ?? "");
          const normalized = ensureFullImageUrl(src ?? undefined);
          if (normalized) badges.push({ id: d?.id, imageUrl: normalized, title: d?.title ?? undefined });
        });
      }
    };

    try {
      // mainPromotion (embedded)
      tryCollectFromPromo((product as any)?.mainPromotion);
    } catch { /* ignore */ }

    try {
      if (Array.isArray((product as any)?.promotions)) {
        (product as any).promotions.forEach((p: any) => {
          tryCollectFromPromo(p);
        });
      }
    } catch { /* ignore */ }

    // dedupe by imageUrl / id / title
    const map = new Map<string, { id?: string; imageUrl?: string; title?: string }>();
    for (const b of badges) {
      const key = b.imageUrl ?? b.id ?? b.title ?? JSON.stringify(b);
      if (!map.has(key)) map.set(key, b);
    }

    return Array.from(map.values());
  }, [product]);

  // If product didn't include embedded promos, fetch /store/promotions as fallback (only product-related promos, and only SPOT ones)
  const [spotBadges, setSpotBadges] = useState<Array<{ id?: string; imageUrl?: string; title?: string }>>(gatherSpotBadgesFromProduct);

  useEffect(() => {
    let mounted = true;

    (async () => {
      // if we already have badges from embedded product, keep them (no extra call)
      if (gatherSpotBadgesFromProduct && gatherSpotBadgesFromProduct.length > 0) {
        setSpotBadges(gatherSpotBadgesFromProduct);
        return;
      }

      // otherwise try calling API for product promos (fallback)
      if (!product?.id) return;

      try {
        const api = setupAPIClient();
        const resp = await api.get("/store/promotions", { params: { product_id: product.id } });
        const data = resp.data ?? {};
        const collected: Array<{ id?: string; imageUrl?: string; title?: string }> = [];

        // productMainPromotion: only collect if that promo has SPOT displays
        if (data.productMainPromotion) {
          const p = data.productMainPromotion;
          const hasSpot = Array.isArray(p.displays) && p.displays.some((d: any) => (d?.type ?? "").toString().toUpperCase() === "SPOT");
          if (hasSpot) {
            // badges and displays SPOT
            if (Array.isArray(p.badges)) {
              p.badges.forEach((b: any) => collected.push({ id: b?.id, imageUrl: ensureFullImageUrl(b?.imageUrl ?? b?.image ?? b?.img), title: b?.title }));
            }
            if (Array.isArray(p.displays)) {
              p.displays.forEach((d: any) => {
                if ((d?.type ?? "").toString().toUpperCase() !== "SPOT") return;
                const explicit = d?.imageUrl ?? d?.image ?? d?.img ?? null;
                let src = explicit ?? null;
                if (!src) src = extractImgSrcFromHtml(d?.content ?? d?.html ?? "");
                const normalized = ensureFullImageUrl(src ?? undefined);
                if (normalized) collected.push({ id: d?.id, imageUrl: normalized, title: d?.title });
              });
            }
          }
        }

        // productPromotions array
        if (Array.isArray(data.productPromotions)) {
          data.productPromotions.forEach((p: any) => {
            const hasSpot = Array.isArray(p.displays) && p.displays.some((d: any) => (d?.type ?? "").toString().toUpperCase() === "SPOT");
            if (!hasSpot) return;
            if (Array.isArray(p.badges)) {
              p.badges.forEach((b: any) => collected.push({ id: b?.id, imageUrl: ensureFullImageUrl(b?.imageUrl ?? b?.image ?? b?.img), title: b?.title }));
            }
            if (Array.isArray(p.displays)) {
              p.displays.forEach((d: any) => {
                if ((d?.type ?? "").toString().toUpperCase() !== "SPOT") return;
                const explicit = d?.imageUrl ?? d?.image ?? d?.img ?? null;
                let src = explicit ?? null;
                if (!src) src = extractImgSrcFromHtml(d?.content ?? d?.html ?? "");
                const normalized = ensureFullImageUrl(src ?? undefined);
                if (normalized) collected.push({ id: d?.id, imageUrl: normalized, title: d?.title });
              });
            }
          });
        }

        // dedupe
        const map = new Map<string, { id?: string; imageUrl?: string; title?: string }>();
        for (const b of collected) {
          const key = b.imageUrl ?? b.id ?? b.title ?? JSON.stringify(b);
          if (!map.has(key)) map.set(key, b);
        }
        const final = Array.from(map.values());
        if (mounted) setSpotBadges(final);
      } catch (err) {
        console.warn("[CardsProductsCategory] fetch promos fallback failed for product", product?.id, err);
      }
    })();

    return () => { mounted = false; };
  }, [product?.id, gatherSpotBadgesFromProduct]);

  return (
    <>
      <div
        className="relative rounded shadow p-4 hover:shadow-lg transition flex flex-col h-[420px]"
        style={{ background: localColors?.fundo_posts_mais_vizualizados || "#e5e9ee" }}
      >
        {/* badges SPOT (canto superior direito) */}
        {spotBadges && spotBadges.length > 0 && (
          spotBadges.length > 1 ? (
            <SpotBadgeCarousel badges={spotBadges} size={56} intervalMs={3000} />
          ) : (
            <div className="absolute top-3 right-3 flex items-end gap-2 z-20">
              <div className="w-12 h-12 bg-white p-1 rounded shadow flex items-center justify-center">
                {spotBadges[0].imageUrl ? (
                  <Image
                    src={spotBadges[0].imageUrl}
                    alt={spotBadges[0].title ?? "badge"}
                    width={48}
                    height={48}
                    className="object-contain"
                  />
                ) : (
                  <div className="text-xs text-amber-700 px-1">{spotBadges[0].title ?? "Selo"}</div>
                )}
              </div>
            </div>
          )
        )}

        {hasOffer && (
          <div className="absolute top-2 left-2 bg-red-600 text-white text-xs uppercase font-bold px-2 py-1 rounded">
            -{discountPercentage}% OFF
          </div>
        )}

        <Link href={`/produto/${product.slug}`} className="block">
          <Image
            src={imagePath}
            alt={product.name}
            width={280}
            height={200}
            quality={100}
            className="w-full h-48 object-cover rounded mb-2"
          />
          <h3
            className="text-lg font-semibold mb-2"
            style={{ color: localColors?.texto_posts_mais_vizualizados || "#000000" }}
          >
            {product.name}
          </h3>
        </Link>

        {product?.stock === 0 ? (
          <div className="flex items-center justify-center flex-1 bg-white disabled:opacity-50 text-red-600 font-semibold rounded transition">
            Produto Indisponível
          </div>
        ) : (
          <div className="mt-auto">
            <div className="flex items-baseline">
              <span className="text-xl font-bold text-red-600">
                {(product.price_per ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </span>
              {product.price_of && (
                <span className="text-sm text-gray-500 line-through ml-2">
                  {(product.price_of ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-600 mb-4">
              12x de {((product.price_per ?? 0) / 12).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} sem juros no cartão
            </p>

            <div className="flex items-center">
              <div className="flex items-center border rounded border-gray-400">
                <button onClick={handleDecrease} disabled={quantity <= 1} className="px-2 py-1 disabled:opacity-50 text-gray-400">–</button>
                <span className="px-4 text-gray-500">{quantity}</span>
                <button onClick={handleIncrease} className="px-2 py-1 text-gray-400">+</button>
              </div>

              {Array.isArray(product.variants) && product.variants.length > 0 ? (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="ml-2 flex items-center justify-center flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2 rounded transition"
                >
                  <FiShoppingCart className="mr-2 text-lg" />
                  Ver opções
                </button>
              ) : (
                <button
                  onClick={handleAddSimple}
                  disabled={adding}
                  className="ml-2 flex items-center justify-center flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold py-2 rounded transition"
                >
                  <FiShoppingCart className="mr-2 text-lg" />
                  {adding ? "Adicionando…" : "Adicionar"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <VariantModal
          product={product}
          defaultQuantity={quantity}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
}
