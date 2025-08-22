'use client';

import { Metadata, ResolvingMetadata } from "next";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { FiShoppingCart, FiFilter, FiX } from "react-icons/fi";
import { setupAPIClient } from "@/services/api";
import CategoryFilters from "@/app/components/categoryFilters";
import { NavbarStore } from "@/app/components/navbar/navbarStore";
import { FooterStore } from "@/app/components/footer/footerStore";
import { ProductFormData } from "Types/types";
import { useTheme } from "@/app/contexts/ThemeContext";
import { useCart } from "@/app/contexts/CartContext";
import StoreLayout from "@/app/components/layouts/storeLayout";
import { SlideBannerClient } from "@/app/components/slideBannerClient";
import { PublicationSidebarClient } from "@/app/components/publicationSidebarClient";
import MarketingPopup from "@/app/components/popups/marketingPopup";


const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
const STORE_URL = process.env.NEXT_PUBLIC_URL_STORE;

/* export async function generateMetadata(
    parent: ResolvingMetadata
): Promise<Metadata> {
    try {
        const apiClient = setupAPIClient();
        const response = await apiClient.get('/configuration_ecommerce/get_configs');
        const { data } = await apiClient.get(`/seo/get_page?page=Produtos em uma determinada categoria`);

        const previousImages = (await parent).openGraph?.images || [];

        const ogImages = data?.ogImages?.map((image: string) => ({
            url: new URL(`/files/${image}`, API_URL).toString(),
            width: Number(data.ogImageWidth) || 1200,
            height: data.ogImageHeight || 630,
            alt: data.ogImageAlt || 'Produtos em uma determinada categoria da loja',
        })) || [];

        const twitterImages = data?.twitterImages?.map((image: string) => ({
            url: new URL(`/files/${image}`, API_URL).toString(),
            width: Number(data.ogImageWidth) || 1200,
            height: data.ogImageHeight || 630,
            alt: data.ogImageAlt || 'Produtos em uma determinada categoria da loja',
        })) || [];

        const faviconUrl = response.data.favicon
            ? new URL(`/files/${response.data.favicon}`, API_URL).toString()
            : "../../../favicon.ico";

        return {
            title: data?.title || 'Produtos em uma determinada categoria da loja',
            description: data?.description || 'Conheça as categorias da nossa loja',
            metadataBase: new URL(STORE_URL!),
            robots: {
                follow: true,
                index: true
            },
            icons: {
                icon: faviconUrl
            },
            openGraph: {
                title: data?.ogTitle || 'Produtos em uma determinada categoria da loja',
                description: data?.ogDescription || 'Conheça os artigos da nossa loja...',
                images: [
                    ...ogImages,
                    ...previousImages,
                ],
                locale: 'pt_BR',
                siteName: response.data.name_blog || 'Produtos em uma determinada categoria da loja',
                type: "website"
            },
            twitter: {
                card: 'summary_large_image',
                title: data?.twitterTitle || 'Produtos em uma determinada categoria da loja',
                description: data?.twitterDescription || 'Categorias da nossa loja...',
                images: [
                    ...twitterImages,
                    ...previousImages,
                ],
                creator: data?.twitterCreator || '@perfil_twitter',
            },
            keywords: data?.keywords || [],
        };
    } catch (error) {
        console.error('Erro ao gerar metadados:', error);
        return {
            title: "Loja",
            description: "Conheça a loja",
        };
    }
} */

export default function CategoryPageClient() {

    const paramsAny = useParams() as any;
    const searchParams = useSearchParams();
    const { colors } = useTheme();
    const router = useRouter();

    const rawSlug =
        paramsAny?.slug ?? paramsAny?.slugCategory ?? paramsAny?.slugCategoria ?? null;
    const clientFallbackSlug =
        typeof window !== "undefined"
            ? window.location.pathname.split("/").filter(Boolean).pop()
            : null;
    const slug = rawSlug ?? clientFallbackSlug ?? undefined;

    const apiClient = setupAPIClient();

    const [nameCategory, setNameCategory] = useState("");
    const [loading, setLoading] = useState(false);
    const [products, setProducts] = useState<ProductFormData[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState<number>(
        Number(searchParams.get("page") ?? 1)
    );
    const [perPage] = useState<number>(
        Number(searchParams.get("perPage") ?? 12)
    );
    const [sort, setSort] = useState<string>(
        searchParams.get("sort") ?? "maisVendidos"
    );
    const [q, setQ] = useState<string>(searchParams.get("q") ?? "");
    const [brand, setBrand] = useState<string | null>(
        searchParams.get("brand") ?? null
    );
    const [minPrice, setMinPrice] = useState<number | "">(
        searchParams.get("minPrice") ? Number(searchParams.get("minPrice")) : ""
    );
    const [maxPrice, setMaxPrice] = useState<number | "">(
        searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : ""
    );
    const [isFiltersOpen, setIsFiltersOpen] = useState(false);

    const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>(
        () => {
            const raw = searchParams.get("filters");
            if (raw) {
                try {
                    const decoded = decodeURIComponent(raw);
                    return JSON.parse(decoded);
                } catch {
                    try {
                        return JSON.parse(raw);
                    } catch {
                        return {};
                    }
                }
            }
            return {};
        }
    );

    const handleFiltersChange = useCallback((next: Record<string, string[]>) => {
        setSelectedFilters(next);
    }, []);

    const loadProducts = useCallback(
        async (opts?: { page?: number }) => {
            if (!slug) return;
            setLoading(true);
            try {
                const params: any = {
                    page: opts?.page ?? page,
                    perPage,
                    sort,
                };
                if (q) params.q = q;
                if (brand) params.brand = brand;
                if (minPrice !== "") params.minPrice = minPrice;
                if (maxPrice !== "") params.maxPrice = maxPrice;
                if (Object.keys(selectedFilters).length > 0) {
                    params.filters = JSON.stringify(selectedFilters);
                }

                const resp = await apiClient.get(
                    `/categories/${encodeURIComponent(slug)}/products`,
                    { params }
                );
                const data = resp.data;
                setProducts(data.products ?? []);
                setTotal(data.total ?? 0);
                if (opts?.page) setPage(opts.page);
            } catch (err) {
                console.error("[CategoryPage] loadProducts error:", err);
                setProducts([]);
                setTotal(0);
            } finally {
                setLoading(false);
            }
        },
        [slug, page, perPage, sort, q, brand, minPrice, maxPrice, selectedFilters, apiClient]
    );

    function updateUrlParams(newParams: Record<string, any>) {
        const sp = new URLSearchParams(Array.from(searchParams.entries()));
        Object.keys(newParams).forEach((k) => {
            const v = newParams[k];
            if (v === null || v === undefined || v === "") sp.delete(k);
            else sp.set(k, String(v));
        });
        if (newParams.filters && typeof newParams.filters !== "string") {
            sp.set("filters", encodeURIComponent(JSON.stringify(newParams.filters)));
        }
        const query = sp.toString();
        if (typeof window !== "undefined") {
            router.push(`${window.location.pathname}${query ? `?${query}` : ""}`);
        }
    }

    useEffect(() => {
        try {
            const apiClient = setupAPIClient();
            async function loadName() {
                const response = await apiClient.get(`/category/name?slug=${slug}`);
                setNameCategory(response.data?.name);
            }
            loadName();
        } catch (error) {
            console.error("Erro ao carregar categoria.");
        }
    }, [slug]);

    useEffect(() => {
        const rawFilters = searchParams.get("filters");
        if (rawFilters) {
            try {
                const parsed = JSON.parse(decodeURIComponent(rawFilters));
                setSelectedFilters(parsed);
            } catch {
                try {
                    setSelectedFilters(JSON.parse(rawFilters));
                } catch { }
            }
        }
        setPage(Number(searchParams.get("page") ?? 1));
        setSort(searchParams.get("sort") ?? "maisVendidos");
        setQ(searchParams.get("q") ?? "");
        setBrand(searchParams.get("brand") ?? null);
        setMinPrice(
            searchParams.get("minPrice") ? Number(searchParams.get("minPrice")) : ""
        );
        setMaxPrice(
            searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : ""
        );

        if (slug) loadProducts({ page: Number(searchParams.get("page") ?? 1) });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [slug]);

    useEffect(() => {
        updateUrlParams({
            filters: Object.keys(selectedFilters).length ? selectedFilters : null,
            page: 1,
        });
        setPage(1);
        if (slug) loadProducts({ page: 1 });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedFilters]);

    const pagesCount = Math.ceil(total / perPage);

    return (
        <StoreLayout
            navbar={<NavbarStore />}
            bannersSlide={<SlideBannerClient position="SLIDER" local='Pagina_produtos_categoria' local_site='Pagina_produtos_categoria' />}
            footer={<FooterStore />}
            local='Pagina_produtos_categoria'
            sidebar_publication={<PublicationSidebarClient local='Pagina_produtos_categoria' />}
        >
            <div
                className={`fixed inset-0 z-50 transform transition-transform duration-300 ease-in-out lg:hidden ${isFiltersOpen ? "translate-x-0" : "-translate-x-full"
                    }`}
            >
                <div
                    className="absolute inset-0 bg-black bg-opacity-50"
                    onClick={() => setIsFiltersOpen(false)}
                />
                <div className="absolute left-0 top-0 h-full w-4/5 max-w-sm bg-white z-50 shadow-lg overflow-y-auto">
                    <div className="sticky top-0 bg-white z-10 p-4 border-b flex justify-between items-center">
                        <h3 className="font-semibold text-lg text-black"></h3>
                        <button
                            onClick={() => setIsFiltersOpen(false)}
                            className="p-1 rounded-full hover:bg-gray-100"
                        >
                            <FiX className="text-xl text-black" />
                        </button>
                    </div>
                    <div className="p-4">
                        <CategoryFilters
                            slug={slug ?? ""}
                            selectedFilters={selectedFilters}
                            onChange={handleFiltersChange}
                        />
                    </div>
                </div>
            </div>

            <div className="flex gap-6">
                <aside className="w-72 hidden lg:block">
                    <CategoryFilters
                        slug={slug ?? ""}
                        selectedFilters={selectedFilters}
                        onChange={handleFiltersChange}
                    />
                </aside>

                <section className="flex-1">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
                        <div>
                            <p className="text-sm text-gray-600">
                                Foram encontrados <strong>{total}</strong> produtos
                            </p>
                            <h1 className="text-2xl font-bold mt-1 text-black">
                                {nameCategory}
                            </h1>
                        </div>

                        <div className="flex items-center gap-3 text-black">
                            <div className="hidden sm:flex items-center border rounded px-2 py-1 gap-2">
                                <label className="text-sm text-black">Ordenar por:</label>
                                <select
                                    value={sort}
                                    onChange={(e) => {
                                        setSort(e.target.value);
                                        updateUrlParams({ sort: e.target.value, page: 1 });
                                        if (slug) loadProducts({ page: 1 });
                                    }}
                                    className="text-sm p-3"
                                >
                                    <option value="maisVendidos">Mais Vendidos</option>
                                    <option value="nomeAsc">Nome A-Z</option>
                                    <option value="nomeDesc">Nome Z-A</option>
                                    <option value="menor">Menor Preço</option>
                                    <option value="maior">Maior Preço</option>
                                    <option value="maiorDesconto">Maiores Descontos</option>
                                </select>
                            </div>

                            <button
                                className="sm:hidden flex items-center gap-2 px-3 py-2 border rounded"
                                onClick={() => setIsFiltersOpen(true)}
                            >
                                <FiFilter /> Filtrar
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {loading && (
                            <div className="col-span-full text-red-400">Carregando produtos...</div>
                        )}
                        {!loading && products.length === 0 && (
                            <div className="col-span-full">Nenhum produto encontrado.</div>
                        )}

                        {products.map((product) => (
                            <CardsProductsCategory key={product.id} product={product} colors={colors} />
                        ))}
                    </div>

                    <div className="mt-6 flex items-center justify-center gap-2 text-black">
                        <button
                            onClick={() => {
                                if (page > 1) {
                                    setPage(page - 1);
                                    updateUrlParams({ page: page - 1 });
                                    if (slug) loadProducts({ page: page - 1 });
                                }
                            }}
                            className="px-3 py-2 border rounded disabled:opacity-50 bg-orange-500 text-white"
                            disabled={page === 1}
                        >
                            Anterior
                        </button>
                        <span className="px-3 py-2">
                            {page} / {pagesCount || 1}
                        </span>
                        <button
                            onClick={() => {
                                if (page < pagesCount) {
                                    setPage(page + 1);
                                    updateUrlParams({ page: page + 1 });
                                    if (slug) loadProducts({ page: page + 1 });
                                }
                            }}
                            className="px-3 py-2 border rounded bg-orange-500 text-white"
                            disabled={page >= pagesCount}
                        >
                            Próxima
                        </button>
                    </div>
                </section>
            </div>

            <MarketingPopup position="POPUP" local="Pagina_produtos_categoria" />
        </StoreLayout>
    );
}

function CardsProductsCategory({
    product,
    colors,
}: {
    product: ProductFormData;
    colors: any;
}) {
    const API = API_URL;
    const { addItem } = useCart();
    const [quantity, setQuantity] = useState<number>(1);
    const [adding, setAdding] = useState(false);

    // modal state
    const [isModalOpen, setIsModalOpen] = useState(false);

    const toSrc = (raw: string | null | undefined) => {
        if (!raw) return "/placeholder.png";
        if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
        if (raw.startsWith("/files/") || raw.startsWith("/"))
            return `${process.env.NEXT_PUBLIC_API_URL || ""}${raw.startsWith("/") ? raw : `/${raw}`}`;
        return `${API}/files/${raw}`;
    };

    // primary image
    const primaryImage =
        product.primaryImage ?? product.images?.[0]?.url ?? product.images?.[0] ?? "/placeholder.png";
    const imagePath = toSrc(primaryImage as string);

    const hasOffer = product.price_per! < (product.price_of ?? product.price_per!);
    const discountPercentage = hasOffer
        ? Math.round((1 - product.price_per! / (product.price_of ?? product.price_per!)) * 100)
        : 0;

    function handleDecrease() {
        setQuantity((q) => Math.max(1, q - 1));
    }
    function handleIncrease() {
        setQuantity((q) => q + 1);
    }

    async function handleAddSimple() {
        // used when there are no variants
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

    return (
        <>
            <div
                className="relative rounded shadow p-4 hover:shadow-lg transition flex flex-col h-[420px]"
                style={{ background: colors?.fundo_posts_mais_vizualizados || "#e5e9ee" }}
            >
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
                        style={{ color: colors?.texto_posts_mais_vizualizados || "#000000" }}
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
                            <span className="text-xl font-bold text-red-600">{product.price_per!.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                            {product.price_of && (
                                <span className="text-sm text-gray-500 line-through ml-2">
                                    {product.price_of!.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-gray-600 mb-4">
                            12x de {(product.price_per! / 12).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} sem juros no cartão
                        </p>

                        <div className="flex items-center">
                            <div className="flex items-center border rounded border-gray-400">
                                <button onClick={handleDecrease} disabled={quantity <= 1} className="px-2 py-1 disabled:opacity-50 text-gray-400">–</button>
                                <span className="px-4 text-gray-500">{quantity}</span>
                                <button onClick={handleIncrease} className="px-2 py-1 text-gray-400">+</button>
                            </div>

                            {/* if product has variants -> open modal to choose */}
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

            {/* Modal: full product variant chooser */}
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

/* =========================
   VariantModal - exibe variantes, atributos, SKU, imagens das variantes e atributos,
   preços, estoque, e adiciona a variante selecionada ao carrinho.
   É responsivo: full-screen mobile, centered box desktop.
   ========================= */

function VariantModal({
    product,
    defaultQuantity = 1,
    onClose,
}: {
    product: ProductFormData;
    defaultQuantity?: number;
    onClose: () => void;
}) {
    const { addItem } = useCart();
    const [quantity, setQuantity] = useState<number>(defaultQuantity);
    const [adding, setAdding] = useState<boolean>(false);
    const [selectedVariant, setSelectedVariant] = useState<any | null>(null);
    const [attributeSelection, setAttributeSelection] = useState<Record<string, string>>({});
    const [mainImage, setMainImage] = useState<string | null>(null);
    const [activeThumbIndex, setActiveThumbIndex] = useState(0);

    // helpers
    const extractUrl = (maybe: any): string | null => {
        if (!maybe && maybe !== 0) return null;
        if (typeof maybe === "string") return maybe;
        if (maybe?.url) return maybe.url;
        return null;
    };
    const toSrc = (raw: string | null | undefined) => {
        if (!raw) return "../../../../../public/no-image.png";
        if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
        if (raw.startsWith("/files/") || raw.startsWith("/")) return `${process.env.NEXT_PUBLIC_API_URL || ""}${raw.startsWith("/") ? raw : `/${raw}`}`;
        return `${API_URL}/files/${raw}`;
    };

    const variants = Array.isArray(product.variants) ? product.variants : [];

    // build attribute options map
    const attributeOptions = useMemo(() => {
        const map: Record<string, string[]> = {};
        variants.forEach((v: any) => {
            const attrs = v.attributes ?? v.variantAttribute ?? v.variantAttributes ?? [];
            if (Array.isArray(attrs)) {
                attrs.forEach((a: any) => {
                    const k = a.key ?? a.name ?? "Opção";
                    const val = a.value ?? a.val ?? String(a.value ?? "");
                    if (!map[k]) map[k] = [];
                    if (!map[k].includes(val)) map[k].push(val);
                });
            }
        });
        return map;
    }, [variants]);

    // build attribute images map (key -> value -> [urls])
    const attributeImagesMap = useMemo(() => {
        const map: Record<string, Record<string, string[]>> = {};
        variants.forEach((v: any) => {
            const attrs = v.attributes ?? v.variantAttribute ?? v.variantAttributes ?? [];
            if (Array.isArray(attrs)) {
                attrs.forEach((a: any) => {
                    const k = a.key ?? a.name ?? "Opção";
                    const val = a.value ?? a.val ?? String(a.value ?? "");
                    if (!map[k]) map[k] = {};
                    if (!map[k][val]) map[k][val] = [];
                    if (Array.isArray(a.existingImages)) {
                        a.existingImages.forEach((ei: any) => {
                            const u = extractUrl(ei) || extractUrl(ei?.url);
                            if (u && !map[k][val].includes(u)) map[k][val].push(u);
                        });
                    }
                    if (a.image) {
                        const u = extractUrl(a.image);
                        if (u && !map[k][val].includes(u)) map[k][val].push(u);
                    }
                });
            }
        });
        return map;
    }, [variants]);

    // helper to find variant from selection
    function findVariantBySelection(sel: Record<string, string>) {
        if (!variants.length) return null;
        return variants.find((v: any) => {
            const attrs = v.attributes ?? v.variantAttribute ?? v.variantAttributes ?? [];
            if (!Array.isArray(attrs)) return false;
            return Object.entries(sel).every(([k, val]) => attrs.some((a: any) => String(a.key ?? a.name ?? "Opção") === String(k) && String(a.value ?? a.val ?? "") === String(val)));
        }) ?? null;
    }

    // thumbnails builder: variant images + attribute images from selection + product images
    function buildThumbnails(forVariant?: any) {
        const set = new Set<string>();
        if (forVariant) {
            if (Array.isArray(forVariant.images)) {
                forVariant.images.forEach((im: any) => {
                    const u = extractUrl(im) || extractUrl(im?.url);
                    if (u) set.add(u);
                });
            }
            if (Array.isArray(forVariant.productVariantImage)) {
                forVariant.productVariantImage.forEach((im: any) => {
                    const u = extractUrl(im) || extractUrl(im?.url);
                    if (u) set.add(u);
                });
            }
        }
        // attribute images based on current selection
        Object.entries(attributeSelection).forEach(([k, v]) => {
            const arr = attributeImagesMap?.[k]?.[v] ?? [];
            arr.forEach((u) => set.add(u));
        });

        if (Array.isArray(product.images)) {
            product.images.forEach((im: any) => {
                const u = extractUrl(im) || extractUrl(im?.url);
                if (u) set.add(u);
            });
        }
        if (product.primaryImage) set.add(product.primaryImage);
        return Array.from(set).filter(Boolean);
    }

    // initial pre-selection when modal opens
    useEffect(() => {
        // default quantity reset
        setQuantity(defaultQuantity ?? 1);

        if (!variants || variants.length === 0) {
            const fallback = extractUrl(product.primaryImage) ?? extractUrl(product.images?.[0]) ?? null;
            setMainImage(fallback ? toSrc(fallback) : null);
            return;
        }

        // try initial by first option of each attribute
        const initSel: Record<string, string> = {};
        Object.keys(attributeOptions).forEach((k) => {
            initSel[k] = attributeOptions[k][0];
        });

        let found = findVariantBySelection(initSel);
        if (found) {
            setAttributeSelection(initSel);
            setSelectedVariant(found);
            const thumb = extractUrl(found.images?.[0]) ?? extractUrl(found.productVariantImage?.[0]) ?? null;
            setMainImage(thumb ? toSrc(thumb) : null);
            setActiveThumbIndex(0);
            return;
        }

        // fallback first variant
        const first = variants[0];
        if (first) {
            const selFromFirst: Record<string, string> = {};
            const attrs = first.attributes ?? first.variantAttribute ?? first.variantAttributes ?? [];
            if (Array.isArray(attrs)) {
                attrs.forEach((a: any) => {
                    selFromFirst[a.key ?? a.name ?? "Opção"] = a.value ?? a.val ?? String(a.value ?? "");
                });
            }
            setAttributeSelection(selFromFirst);
            setSelectedVariant(first);
            const thumb = extractUrl(first.images?.[0]) ?? extractUrl(first.productVariantImage?.[0]) ?? null;
            setMainImage(thumb ? toSrc(thumb) : null);
            setActiveThumbIndex(0);
            return;
        }

        const fallback = extractUrl(product.primaryImage) ?? extractUrl(product.images?.[0]) ?? null;
        setMainImage(fallback ? toSrc(fallback) : null);
        setActiveThumbIndex(0);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // when attributeSelection changes, try to resolve variant & main image
    useEffect(() => {
        if (!variants || variants.length === 0) return;
        const found = findVariantBySelection(attributeSelection);
        if (found) {
            setSelectedVariant(found);
            const thumb = extractUrl(found.images?.[0]) ?? extractUrl(found.productVariantImage?.[0]) ?? null;
            if (thumb) setMainImage(toSrc(thumb));
        } else {
            setSelectedVariant(null);
            const fallback = extractUrl(product.primaryImage) ?? extractUrl(product.images?.[0]) ?? null;
            if (fallback) setMainImage(toSrc(fallback));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(attributeSelection)]);

    // esc key closes modal
    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if (e.key === "Escape") onClose();
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    const thumbnails = buildThumbnails(selectedVariant ?? undefined);

    const displayPrice = Number(selectedVariant?.price_per ?? product.price_per ?? 0);
    const displayPriceOf = selectedVariant?.price_of ?? product.price_of ?? null;

    const formatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
    const formattedPricePer = formatter.format(displayPrice ?? 0);
    const formattedPriceOf = displayPriceOf ? formatter.format(displayPriceOf) : null;
    const formattedInstallment = formatter.format((displayPrice ?? 0) / 12);

    async function handleAddVariantToCart() {
        if (variants.length > 0 && !selectedVariant) return;
        try {
            setAdding(true);
            await addItem(String(product.id), quantity, selectedVariant?.id ?? null);
            setAdding(false);
            onClose();
        } catch (err) {
            console.error("addItem modal error", err);
            setAdding(false);
        }
    }

    function handleAttributePick(k: string, v: string) {
        setAttributeSelection((prev) => ({ ...prev, [k]: v }));
    }

    function onThumbClick(idx: number) {
        setActiveThumbIndex(idx);
        const raw = thumbnails[idx];
        setMainImage(toSrc(raw));
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* backdrop */}
            <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />

            {/* modal panel */}
            <div className="text-black relative bg-white w-full h-full md:h-auto md:max-w-4xl md:rounded-lg md:shadow-lg overflow-auto m-0 md:m-6">
                {/* header */}
                <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
                    <div>
                        <div className="font-semibold">{product.name}</div>
                        <div className="text-xs text-gray-600">Escolha opções e adicione ao carrinho</div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={onClose} className="p-2 rounded hover:bg-gray-100">
                            <FiX />
                        </button>
                    </div>
                </div>

                {/* body */}
                <div className="p-4 grid grid-cols-1 md:grid-cols-12 gap-4">
                    {/* left: images (md: col-span 7) */}
                    <div className="md:col-span-7 flex flex-col gap-3">
                        <div className="w-full bg-gray-50 rounded overflow-hidden flex items-center justify-center" style={{ minHeight: 260 }}>
                            {mainImage ? (
                                // eslint-disable-next-line jsx-a11y/alt-text
                                <Image src={mainImage} alt={product.name} width={800} height={600} className="object-contain w-full h-full" />
                            ) : (
                                <div className="w-full h-60 bg-gray-100 flex items-center justify-center text-gray-400">Sem imagem</div>
                            )}
                        </div>

                        {/* thumbnails row */}
                        <div className="flex gap-2 overflow-x-auto">
                            {thumbnails.length > 0 ? thumbnails.map((t, i) => (
                                <button key={i} onClick={() => onThumbClick(i)} className={`w-20 h-20 rounded overflow-hidden border ${i === activeThumbIndex ? "border-red-600" : "border-gray-200"}`}>
                                    <Image src={toSrc(t)} alt={`thumb-${i}`} width={80} height={80} className="object-cover w-full h-full" />
                                </button>
                            )) : <div className="text-sm text-gray-500">Sem imagens</div>}
                        </div>
                    </div>

                    {/* right: variant selectors & info (md: col-span 5) */}
                    <div className="md:col-span-5 flex flex-col gap-3">
                        {/* sku / price */}
                        <div>
                            <div className="text-sm text-gray-600 mb-1">SKU: {selectedVariant?.sku ?? "-"}</div>
                            <div className="flex items-baseline gap-3">
                                <div className="text-2xl font-bold text-red-600">{formattedPricePer}</div>
                                {displayPriceOf && (
                                    <div className="text-sm line-through text-gray-500">{formattedPriceOf}</div>
                                )}
                            </div>
                            <div className="text-xs text-gray-600">12x de {formattedInstallment} sem juros no cartão</div>
                        </div>

                        {/* attributes */}
                        <div>
                            {Object.keys(attributeOptions).length > 0 ? (
                                Object.entries(attributeOptions).map(([k, vals]) => (
                                    <div key={k} className="mb-3">
                                        <div className="text-xs text-gray-600 mb-1">{k}</div>
                                        <div className="flex gap-2 flex-wrap">
                                            {vals.map((val) => {
                                                const imgs = attributeImagesMap?.[k]?.[val] ?? [];
                                                const selected = attributeSelection[k] === val;
                                                return (
                                                    <button
                                                        key={val}
                                                        onClick={() => handleAttributePick(k, val)}
                                                        className={`flex items-center gap-2 px-2 py-1 rounded border ${selected ? "border-red-600 bg-red-50" : "border-gray-200 bg-white"}`}
                                                    >
                                                        {imgs.length > 0 ? (
                                                            <div className="w-6 h-6 rounded overflow-hidden">
                                                                <Image src={toSrc(imgs[0])} alt={`${val}-sw`} width={24} height={24} className="object-cover w-full h-full" />
                                                            </div>
                                                        ) : null}
                                                        <span className="text-sm">{val}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-sm text-gray-500">Sem opções</div>
                            )}
                        </div>

                        {/* stock and quantity */}
                        <div className="flex items-center justify-between">
                            <div className="text-sm text-gray-600">Estoque: {selectedVariant?.stock ?? product.stock ?? "-"}</div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="px-3 py-1 border rounded disabled:opacity-50">-</button>
                                <div className="px-3">{quantity}</div>
                                <button onClick={() => setQuantity(q => q + 1)} className="px-3 py-1 border rounded">+</button>
                            </div>
                        </div>

                        {/* action */}
                        <div className="mt-2">
                            <button
                                onClick={handleAddVariantToCart}
                                disabled={adding || (variants.length > 0 && !selectedVariant)}
                                className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                <FiShoppingCart />
                                {adding ? "Adicionando…" : "Adicionar ao carrinho"}
                            </button>
                        </div>

                        {/* small footer note */}
                        <div className="text-xs text-gray-500 mt-2">
                            Detalhes e todas as imagens estão disponíveis na página do produto.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}