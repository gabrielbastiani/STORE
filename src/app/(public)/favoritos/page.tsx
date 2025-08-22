// app/favoritos/page.tsx
"use client";

import React, { JSX, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { setupAPIClient } from "@/services/api";
import { FooterStore } from "@/app/components/footer/footerStore";
import { NavbarStore } from "@/app/components/navbar/navbarStore";
import { useCart } from "@/app/contexts/CartContext";
import { useFavorites } from "@/app/contexts/FavoritesContext";
import { useTheme } from "@/app/contexts/ThemeContext";
import StoreLayout from "@/app/components/layouts/storeLayout";
import { SlideBannerClient } from "@/app/components/slideBannerClient";
import { PublicationSidebarClient } from "@/app/components/publicationSidebarClient";
import MarketingPopup from "@/app/components/popups/marketingPopup";
import Link from "next/link";

type Product = any;
type AttrMap = Record<string, string | null>;

export default function Favoritos(): JSX.Element {

  const api = setupAPIClient();

  const { colors } = useTheme();
  const { addItem } = useCart();
  const { favorites, favoritesCount, remove: removeFavorite, reloadFromLocal, forceSyncWithServer } = useFavorites();

  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [selectedVariant, setSelectedVariant] = useState<Record<string, string | null>>({});
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, AttrMap>>({});
  const [primaryImageByProduct, setPrimaryImageByProduct] = useState<Record<string, string | null>>({});
  const [error, setError] = useState<string | null>(null);

  // refs para os containers de thumbnails (um por produto)
  const thumbsContainersRef = useRef<Record<string, HTMLDivElement | null>>({});
  // estado para mostrar se tem overflow (controla setas)
  const [thumbsOverflow, setThumbsOverflow] = useState<Record<string, boolean>>({});

  const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

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
        setThumbsOverflow({});
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
        // fallback individual
        const promises = ids.map((id) =>
          api
            .get(`/productsById/favoritesPage/${encodeURIComponent(id)}`)
            .then((r: any) => r?.data ?? null)
            .catch(() => null)
        );
        const results = await Promise.all(promises);
        fetched = results.filter(Boolean) as Product[];
      }

      // preserve order of favorites
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

      // depois de renderizar, checar overflow thumbnails (delay para garantir DOM)
      requestAnimationFrame(() => {
        setTimeout(() => checkAllThumbsOverflow(fetched), 80);
      });
    } catch (err) {
      console.error("Erro ao carregar favoritos:", err);
      setError("Erro ao carregar favoritos. Tente novamente mais tarde.");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }

  // Checka overflow para cada produto (se content wider than container)
  function checkAllThumbsOverflow(fetched: Product[]) {
    const next: Record<string, boolean> = {};
    fetched.forEach((p) => {
      const el = thumbsContainersRef.current[p.id];
      if (el) next[p.id] = el.scrollWidth > el.clientWidth + 2;
      else next[p.id] = false;
    });
    setThumbsOverflow(next);
  }

  // formato moeda
  const formatCurrency = (n: number) =>
    n?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) ?? "R$ 0,00";

  // Garante URL válida de imagem
  const safeUrl = (maybe: string | null) => {
    if (!maybe) return null;
    const s = String(maybe).trim();
    if (!s) return null;
    if (/^https?:\/\//.test(s)) return s;
    const filename = s.replace(/^\/+/, "");
    return `${API_URL.replace(/\/+$/, "")}/files/${filename}`;
  };

  // lógica para escolher imagem (atributo > variante > produto)
  function computePrimaryImage(product: Product, variant: any, attrMap: AttrMap): string | null {
    // 1) atributo da variante (matching)
    if (variant?.variantAttribute && Array.isArray(variant.variantAttribute)) {
      for (const a of variant.variantAttribute) {
        const key = a.key ?? a.name ?? null;
        const val = a.value ?? String(a.val ?? "") ?? null;
        if (key && attrMap[key] && attrMap[key] === val) {
          const vImages = a.variantAttributeImage ?? a.variantAttributeImage;
          if (Array.isArray(vImages) && vImages.length) {
            const primary = vImages.find((vi: any) => vi.isPrimary) ?? vImages[0];
            const candidate = primary?.url ?? primary ?? null;
            if (candidate) return safeUrl(candidate);
          }
        }
      }
    }

    // 2) imagens do variant
    if (variant?.productVariantImage && Array.isArray(variant.productVariantImage) && variant.productVariantImage.length) {
      const primary = variant.productVariantImage.find((i: any) => i.isPrimary) ?? variant.productVariantImage[0];
      const candidate = primary?.url ?? primary ?? null;
      if (candidate) return safeUrl(candidate);
    }

    // 3) imagem do produto
    const productImg = product?.images?.find((i: any) => i.isPrimary) ?? product?.images?.[0];
    if (productImg) {
      const candidate = typeof productImg === "string" ? productImg : productImg.url ?? null;
      if (candidate) return safeUrl(candidate);
    }

    return null;
  }

  // attribute pick -> tenta encontrar variante que bata com os atributos
  const handleAttributePick = (product: Product, key: string, value: string) => {
    setSelectedAttributes((prev) => {
      const next = { ...(prev || {}) };
      next[product.id] = { ...(next[product.id] || {}), [key]: value };

      const attrs = next[product.id];
      const found = product.variants?.find((v: any) => {
        if (!v.variantAttribute || !Array.isArray(v.variantAttribute)) return false;
        return Object.entries(attrs).every(([k, val]) =>
          v.variantAttribute.some((a: any) => (a.key ?? a.name) === k && String(a.value ?? a.val) === String(val))
        );
      });

      if (found) {
        setSelectedVariant((sv) => ({ ...sv, [product.id]: found.id }));
        setPrimaryImageByProduct((pi) => ({ ...pi, [product.id]: computePrimaryImage(product, found, attrs) }));
      } else {
        const currentVariantId = selectedVariant[product.id] ?? product?.variants?.[0]?.id ?? null;
        const currentVariant = product.variants?.find((v: any) => v.id === currentVariantId) ?? null;
        setPrimaryImageByProduct((pi) => ({ ...pi, [product.id]: computePrimaryImage(product, currentVariant, attrs) }));
      }

      return next;
    });
  };

  // selecionar variante
  const handleVariantSelect = (product: Product, variantId: string) => {
    const variant = product.variants?.find((v: any) => v.id === variantId) ?? null;
    setSelectedVariant((s) => ({ ...s, [product.id]: variantId }));

    const attrMap: AttrMap = {};
    if (variant?.variantAttribute && Array.isArray(variant.variantAttribute)) {
      variant.variantAttribute.forEach((a: any) => {
        const key = a.key ?? a.name ?? "";
        attrMap[key] = a.value ?? String(a.val ?? "");
      });
    }
    setSelectedAttributes((prev) => ({ ...(prev || {}), [product.id]: attrMap }));
    setPrimaryImageByProduct((pi) => ({ ...pi, [product.id]: computePrimaryImage(product, variant, attrMap) }));
  };

  const handleThumbClick = (productId: string, url: string) => {
    setPrimaryImageByProduct((p) => ({ ...p, [productId]: safeUrl(url) }));
  };

  // scroll do carrossel de thumbs
  const scrollThumbs = (productId: string, dir: "left" | "right") => {
    const el = thumbsContainersRef.current[productId];
    if (!el) return;
    const amount = Math.max(120, Math.floor(el.clientWidth * 0.7)); // rola 70% da largura do container (ou min 120px)
    el.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  // após scroll, atualiza estado de overflow (setas)
  const onThumbsScroll = (productId: string) => {
    const el = thumbsContainersRef.current[productId];
    if (!el) return;
    const hasLeft = el.scrollLeft > 5;
    const hasRight = el.scrollLeft + el.clientWidth < el.scrollWidth - 5;
    setThumbsOverflow((prev) => ({ ...prev, [productId]: hasLeft || hasRight }));
    // guardando se tem overflow completo (compare scrollWidth > clientWidth)
    setThumbsOverflow((prev) => ({ ...prev, [productId]: el.scrollWidth > el.clientWidth + 2 }));
  };

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

  // helper para registrar ref do container de thumbs
  const registerThumbsRef = (productId: string) => (el: HTMLDivElement | null) => {
    thumbsContainersRef.current[productId] = el;
    // check overflow sempre que o ref for setado
    if (el) {
      setTimeout(() => {
        setThumbsOverflow((prev) => ({ ...prev, [productId]: el.scrollWidth > el.clientWidth + 2 }));
      }, 80);
      // escuta mudança de tamanho (responsivo)
      const ro = new ResizeObserver(() => {
        setThumbsOverflow((prev) => ({ ...prev, [productId]: el.scrollWidth > el.clientWidth + 2 }));
      });
      ro.observe(el);
      // guardar observer no dataset para limpar se necessário
      (el as any).__thumbsResizeObserver = ro;
    }
  };

  // limpa observers quando componente desmonta
  useEffect(() => {
    return () => {
      Object.values(thumbsContainersRef.current).forEach((el) => {
        if (el && (el as any).__thumbsResizeObserver) {
          try {
            (el as any).__thumbsResizeObserver.disconnect();
          } catch { }
        }
      });
    };
  }, []);

  return (
    <StoreLayout
      navbar={<NavbarStore />}
      bannersSlide={<SlideBannerClient position="SLIDER" local='Pagina_favoritos' local_site='Pagina_favoritos' />}
      footer={<FooterStore />}
      local='Pagina_favoritos'
      sidebar_publication={<PublicationSidebarClient local='Pagina_favoritos' />}
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
              products.map((product) => {
                const img = primaryImageByProduct[product.id] ?? null;
                const availableVariants = product?.variants ?? [];
                const selVariantId = selectedVariant[product.id] ?? availableVariants?.[0]?.id ?? null;
                const selVariant = availableVariants.find((v: any) => v.id === selVariantId) ?? null;
                const price = selVariant?.price_per ?? selVariant?.price_of ?? product?.price_per ?? product?.price_of;

                // attributes aggregated
                const attrsMap: Record<string, string[]> = {};
                (product.variants || []).forEach((v: any) => {
                  (v.variantAttribute || []).forEach((a: any) => {
                    const k = a.key ?? a.name ?? "";
                    const val = a.value ?? String(a.val ?? "");
                    attrsMap[k] = attrsMap[k] ?? [];
                    if (!attrsMap[k].includes(val)) attrsMap[k].push(val);
                  });
                });

                // thumbs (unique)
                const thumbsSet = new Set<string>();
                (product.images || []).forEach((it: any) => thumbsSet.add(typeof it === "string" ? it : it.url));
                (selVariant?.productVariantImage || []).forEach((it: any) => thumbsSet.add(it?.url ?? it));
                (selVariant?.variantAttribute || []).forEach((a: any) => {
                  (a.variantAttributeImage || []).forEach((ai: any) => thumbsSet.add(ai?.url ?? ai));
                });
                const thumbs = Array.from(thumbsSet).map((t) => safeUrl(t)).filter(Boolean) as string[];

                return (
                  <article key={product.id} className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                    <div className="flex flex-col sm:flex-row gap-4 p-4">
                      {/* IMAGEM PRINCIPAL */}
                      <div className="w-full sm:w-44 flex-shrink-0">
                        <div className="w-full h-56 sm:h-40 bg-gray-50 rounded-lg overflow-hidden flex items-center justify-center">
                          {img ? (
                            <Image
                              src={img}
                              alt={product.name ?? "Produto"}
                              width={600}
                              height={600}
                              style={{ width: "100%", height: "100%", objectFit: "contain" }}
                              priority={false}
                              unoptimized
                            />
                          ) : (
                            <div className="text-gray-400">Sem imagem</div>
                          )}
                        </div>

                        {/* CARROSSEL DE THUMBNAILS */}
                        <div className="mt-3 relative">
                          {/* esquerda: seta */}
                          {thumbsOverflow[product.id] ? (
                            <button
                              onClick={() => scrollThumbs(product.id, "left")}
                              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 p-1 rounded-full shadow-sm hidden sm:flex"
                              aria-label="Anterior"
                              title="Anterior"
                              style={{ transform: "translateY(-50%)" }}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M12.293 15.293a1 1 0 010-1.414L15.586 10l-3.293-3.879a1 1 0 111.414-1.414l4 4.707a1 1 0 010 1.414l-4 4.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                <path fillRule="evenodd" d="M4 10a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1z" clipRule="evenodd" />
                              </svg>
                            </button>
                          ) : null}

                          {/* container scrollável */}
                          <div
                            ref={registerThumbsRef(product.id)}
                            onScroll={() => onThumbsScroll(product.id)}
                            className="flex gap-2 overflow-x-auto no-scrollbar py-1"
                            style={{ scrollbarWidth: "none" }}
                            role="list"
                            aria-label="Miniaturas"
                          >
                            {thumbs.length === 0 ? (
                              <div className="w-14 h-14 rounded border bg-white flex items-center justify-center text-gray-400">—</div>
                            ) : (
                              thumbs.map((t) => (
                                <button
                                  key={t}
                                  onClick={() => handleThumbClick(product.id, t)}
                                  className="w-14 h-14 flex-shrink-0 rounded border overflow-hidden bg-white"
                                  aria-label="Ver imagem"
                                  title="Ver imagem"
                                >
                                  <Image src={t} alt="thumb" width={64} height={64} style={{ objectFit: "contain", width: "100%", height: "100%" }} unoptimized />
                                </button>
                              ))
                            )}
                          </div>

                          {/* direita: seta */}
                          {thumbsOverflow[product.id] ? (
                            <button
                              onClick={() => scrollThumbs(product.id, "right")}
                              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 p-1 rounded-full shadow-sm hidden sm:flex"
                              aria-label="Próximo"
                              title="Próximo"
                              style={{ transform: "translateY(-50%)" }}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M7.707 4.707a1 1 0 010 1.414L4.414 10l3.293 3.879a1 1 0 11-1.414 1.414l-4-4.707a1 1 0 010-1.414l4-4.707a1 1 0 011.414 0z" clipRule="evenodd" />
                                <path fillRule="evenodd" d="M16 10a1 1 0 00-1-1H5a1 1 0 100 2h10a1 1 0 001-1z" clipRule="evenodd" />
                              </svg>
                            </button>
                          ) : null}
                        </div>
                      </div>

                      {/* DETALHES */}
                      <div className="flex-1 flex flex-col">
                        <div className="flex items-start justify-between">
                          <div className="pr-2">
                            <h3 className="text-base sm:text-lg font-semibold text-black">{product.name}</h3>
                            {product.brand && <p className="text-sm text-gray-500 mt-1">{product.brand}</p>}
                          </div>

                          <div className="text-right">
                            <div className="text-lg sm:text-xl font-bold text-red-600">{formatCurrency(price)}</div>
                            {product.price_of && product.price_of !== price && <div className="text-sm text-gray-500 line-through">{formatCurrency(product.price_of)}</div>}
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                          <div>
                            {/* atributos */}
                            {Object.entries(attrsMap).map(([key, values]) => (
                              <div key={key} className="mb-3">
                                <div className="text-sm text-gray-600 mb-2">{key}</div>
                                <div className="flex flex-wrap gap-2">
                                  {values.map((val) => {
                                    const active = (selectedAttributes[product.id] || {})[key] === val;
                                    return (
                                      <button
                                        key={val}
                                        onClick={() => handleAttributePick(product, key, val)}
                                        className={`px-3 py-1 rounded-full border text-sm transition ${active ? "bg-orange-500 text-black border-orange-600" : "bg-white text-gray-700 border-gray-200"}`}
                                      >
                                        {val}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}

                            {/* variant select */}
                            {availableVariants.length > 1 && (
                              <div>
                                <label className="text-sm text-black">Variantes: </label>
                                <select value={selVariantId ?? ""} onChange={(e) => handleVariantSelect(product, e.target.value)} className="p-2 mt-1 w-full sm:w-auto rounded border-gray-200 text-sm text-black">
                                  {availableVariants.map((v: any) => (
                                    <option className="text-black" key={v.id} value={v.id}>
                                      {v.sku} — {v.price_per ? formatCurrency(v.price_per) : formatCurrency(v.price_of)} — estoque: {v.stock}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col items-stretch sm:items-end gap-3 text-black">
                            <div className="flex items-center rounded-lg border border-gray-200 overflow-hidden">
                              <button className="px-3 py-2 text-lg" onClick={() => setQuantities((s) => ({ ...s, [product.id]: Math.max(1, (s[product.id] ?? 1) - 1) }))} aria-label="Diminuir quantidade">
                                -
                              </button>
                              <div className="px-4 py-2 text-sm w-14 text-center">{quantities[product.id] ?? 1}</div>
                              <button className="px-3 py-2 text-lg" onClick={() => setQuantities((s) => ({ ...s, [product.id]: (s[product.id] ?? 1) + 1 }))} aria-label="Aumentar quantidade">
                                +
                              </button>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-2 w-full">
                              <button onClick={() => handleAddToCart(product)} className="w-full sm:w-auto px-4 py-2 rounded-2xl bg-red-500 text-white font-medium text-sm">
                                Adicionar ao carrinho
                              </button>
                              <button onClick={() => handleRemoveFavorite(product.id)} className="w-full sm:w-auto px-4 py-2 rounded-2xl border text-sm bg-gray-500 text-white">
                                Excluir
                              </button>
                            </div>

                            <div className="text-xs text-gray-500 mt-2">SKU: {product.skuMaster}</div>
                            <div className="text-xs text-gray-500">Visualizações: {product.view ?? 0}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </section>
        )}
      </div>
      <MarketingPopup position="POPUP" local="Pagina_favoritos" />
    </StoreLayout>
  );
}