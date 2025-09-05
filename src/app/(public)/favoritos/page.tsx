"use client"

import React, { JSX, useEffect, useState } from "react";
import { setupAPIClient } from "@/services/api";
import StoreLayout from "@/app/components/layouts/storeLayout";
import { FooterStore } from "@/app/components/footer/footerStore";
import { NavbarStore } from "@/app/components/navbar/navbarStore";
import { SlideBannerClient } from "@/app/components/slideBannerClient";
import { PublicationSidebarClient } from "@/app/components/publicationSidebarClient";
import MarketingPopup from "@/app/components/popups/marketingPopup";
import Link from "next/link";
import { useCart } from "@/app/contexts/CartContext";
import { useFavorites } from "@/app/contexts/FavoritesContext";
import { useTheme } from "@/app/contexts/ThemeContext";
import { AttrMap, Product } from "@/app/components/favorites/types";
import { computePrimaryImage } from "@/app/components/favorites/utils";
import FavoriteItem from "@/app/components/favorites/FavoriteItem";

export default function Favoritos(): JSX.Element {
  
  const api = setupAPIClient();
  const { colors } = useTheme();
  const { addItem } = useCart();
  const { favorites, remove: removeFavorite, reloadFromLocal, forceSyncWithServer } = useFavorites();

  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [selectedVariant, setSelectedVariant] = useState<Record<string, string | null>>({});
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, AttrMap>>({});
  const [primaryImageByProduct, setPrimaryImageByProduct] = useState<Record<string, string | null>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProductsFromFavorites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favorites]);

  async function loadProductsFromFavorites() {
    setLoading(true);
    setError(null);
    try {
      const ids = Array.isArray(favorites) ? favorites.filter(Boolean) : [];
      if (!ids.length) {
        setProducts([]);
        setQuantities({});
        setSelectedVariant({});
        setSelectedAttributes({});
        setPrimaryImageByProduct({});
        setLoading(false);
        return;
      }

      let fetched: Product[] = [];

      try {
        const res = await api.get("/productsFavorites", { params: { ids: ids.join(",") } });
        let data = res?.data ?? null;
        if (data && typeof data === "object" && Array.isArray((data as any).data)) data = (data as any).data;
        if (Array.isArray(data)) fetched = data as Product[];
      } catch {
        const promises = ids.map((id) =>
          api
            .get(`/productsById/favoritesPage/${encodeURIComponent(id)}`)
            .then((r: any) => r?.data ?? null)
            .catch(() => null)
        );
        const results = await Promise.all(promises);
        fetched = results.filter(Boolean) as Product[];
      }

      const idsOrder = Array.isArray(favorites) ? favorites.filter(Boolean) : [];
      if (idsOrder.length) {
        const mapById = new Map<string, Product>();
        fetched.forEach((p: Product) => p?.id && mapById.set(String(p.id), p));
        const ordered = idsOrder.map((id) => mapById.get(id)).filter(Boolean) as Product[];
        fetched = ordered.length ? ordered : fetched;
      }

      // init states
      const q: Record<string, number> = {};
      const sv: Record<string, string | null> = {};
      const sa: Record<string, AttrMap> = {};
      const pi: Record<string, string | null> = {};

      fetched.forEach((p) => {
        q[p.id] = 1;
        const firstVariant = p?.variants?.[0] ?? null;
        sv[p.id] = firstVariant?.id ?? null;

        const attrMap: AttrMap = {};
        if (firstVariant?.variantAttribute && Array.isArray(firstVariant.variantAttribute)) {
          firstVariant.variantAttribute.forEach((a: any) => {
            const key = a.key ?? String(a.name ?? "");
            attrMap[key] = a.value ?? String(a.val ?? "");
          });
        }
        sa[p.id] = attrMap;
        pi[p.id] = computePrimaryImage(p, firstVariant, attrMap);
      });

      setProducts(fetched);
      setQuantities(q);
      setSelectedVariant(sv);
      setSelectedAttributes(sa);
      setPrimaryImageByProduct(pi);
    } catch (err) {
      console.error("Erro ao carregar favoritos:", err);
      setError("Erro ao carregar favoritos. Tente novamente mais tarde.");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }

  const handleAddToCart = async (product: Product) => {
    try {
      const variantId = selectedVariant[product.id] ?? product?.variants?.[0]?.id ?? null;
      const qty = quantities[product.id] ?? 1;
      await addItem(product.id, qty, variantId);
      setQuantities((q) => ({ ...q, [product.id]: 1 }));
    } catch (err) {
      console.error("Erro ao adicionar ao carrinho:", err);
      setError("Erro ao adicionar ao carrinho.");
    }
  };

  const handleRemoveFavorite = async (productId: string) => {
    try {
      await removeFavorite(productId);
    } catch (err) {
      console.error("Erro ao remover favorito:", err);
      setError("Não foi possível remover favorito.");
    }
  };

  return (
    <StoreLayout
      navbar={<NavbarStore />}
      bannersSlide={<SlideBannerClient position="SLIDER" local={'Pagina_favoritos'} local_site={'Pagina_favoritos'} />}
      footer={<FooterStore />}
      local={'Pagina_favoritos'}
      sidebar_publication={<PublicationSidebarClient local={'Pagina_favoritos'} />}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8" style={{ background: colors?.segundo_fundo_layout_site || "#f3f4f6" }}>
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-black">Meus Favoritos</h1>
            <p className="text-sm text-gray-500 mt-1">
              Você tem <strong className="text-orange-500">{products.length}</strong> favoritos.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              className="text-white px-3 py-2 rounded-lg border border-gray-200 bg-green-600 text-sm hover:shadow-sm"
              onClick={() => {
                reloadFromLocal?.();
                forceSyncWithServer?.();
                loadProductsFromFavorites();
              }}
            >
              Recarregar favoritos
            </button>
          </div>
        </header>

        {loading ? (
          <div className="py-20 text-center text-gray-500">Carregando favoritos...</div>
        ) : (
          <section className="space-y-6">
            {error && <div className="mb-4 text-sm text-red-600">{error}</div>}

            {products.length === 0 ? (
              <div className="py-24 text-center">
                <h2 className="text-2xl font-semibold text-black">Nenhum favorito ainda</h2>
                <p className="mt-2 text-sm text-gray-500">Adicione produtos aos seus favoritos para vê-los aqui.</p>
                <Link href="/" className="inline-block mt-6 px-6 py-3 rounded-2xl border border-transparent font-medium shadow-sm text-white bg-red-600 hover:bg-red-700">
                  Continuar comprando
                </Link>
              </div>
            ) : (
              products.map((product) => (
                <FavoriteItem
                  key={product.id}
                  product={product}
                  quantity={quantities[product.id] ?? 1}
                  setQuantity={(q) => setQuantities((s) => ({ ...s, [product.id]: q }))}
                  selectedVariantId={selectedVariant[product.id] ?? null}
                  setSelectedVariantId={(v) => setSelectedVariant((s) => ({ ...s, [product.id]: v }))}
                  selectedAttributes={selectedAttributes[product.id] ?? {}}
                  setSelectedAttributes={(attrs) => setSelectedAttributes((s) => ({ ...s, [product.id]: attrs }))}
                  primaryImage={primaryImageByProduct[product.id] ?? null}
                  setPrimaryImage={(u) => setPrimaryImageByProduct((s) => ({ ...s, [product.id]: u }))}
                  onAddToCart={() => handleAddToCart(product)}
                  onRemoveFavorite={() => handleRemoveFavorite(product.id)}
                />
              ))
            )}
          </section>
        )}
      </div>
      <MarketingPopup position="POPUP" local="Pagina_favoritos" />
    </StoreLayout>
  );
}