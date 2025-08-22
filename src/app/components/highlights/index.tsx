'use client';

import { setupAPIClient } from "@/services/api";
import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import { FiShoppingCart, FiX } from "react-icons/fi";
import { ProductFormData } from "Types/types";
import { useTheme } from "@/app/contexts/ThemeContext";
import { useCart } from "@/app/contexts/CartContext";
import { createPortal } from "react-dom";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

/* ----------------------------
   HighlightsCard (visual original)
   - se tiver variants -> botão "Ver opções" abre modal (renderizado via portal)
   - se não -> botão "Adicionar" com quantidade
   ---------------------------- */
function HighlightsCard({ product }: { product: ProductFormData }) {
    
    const { colors } = useTheme();
    const { addItem } = useCart();
    const [quantity, setQuantity] = useState<number>(1);
    const [adding, setAdding] = useState<boolean>(false);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // verifica se há desconto
    const hasOffer = !!product.price_of && product.price_per! < product.price_of!;
    const discountPercentage = hasOffer
        ? Math.round((1 - product.price_per! / (product.price_of ?? product.price_per!)) * 100)
        : 0;

    // escolhe imagem principal com segurança (product.images pode ter objetos com url/isPrimary)
    const findPrimary = () => {
        if (!Array.isArray(product.images) || product.images.length === 0) return null;
        const prim = product.images.find((img: any) => img.isPrimary) ?? product.images[0];
        return prim?.url ?? prim ?? null;
    };
    const primary = findPrimary();
    const imageSrc = primary ? (String(primary).startsWith("http") ? String(primary) : `${API_URL}/files/${primary}`) : "/placeholder.png";

    // formatadores
    const formatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
    const formattedPricePer = formatter.format(product.price_per ?? 0);
    const formattedPriceOf = product.price_of ? formatter.format(product.price_of) : null;
    const formattedInstallment = formatter.format((product.price_per ?? 0) / 12);

    function handleDecrease() {
        setQuantity((q) => Math.max(1, q - 1));
    }
    function handleIncrease() {
        setQuantity((q) => q + 1);
    }

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
                        src={imageSrc}
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
                    <div
                        className="flex items-center justify-center flex-1 bg-white disabled:opacity-50 text-red-600 font-semibold rounded transition"
                    >
                        Produto Indisponível
                    </div>
                ) : (
                    <div className="mt-auto">
                        <div className="flex items-baseline">
                            <span className="text-xl font-bold text-red-600">
                                {formattedPricePer}
                            </span>
                            {hasOffer && formattedPriceOf && (
                                <span className="text-sm text-gray-500 line-through ml-2">
                                    {formattedPriceOf}
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-gray-600 mb-4">
                            12x de {formattedInstallment} sem juros no cartão
                        </p>

                        <div className="flex items-center">
                            <div className="flex items-center border rounded border-gray-400">
                                <button
                                    onClick={handleDecrease}
                                    disabled={quantity <= 1}
                                    className="px-2 py-1 disabled:opacity-50 text-gray-400"
                                >
                                    –
                                </button>
                                <span className="px-4 text-gray-500">{quantity}</span>
                                <button
                                    onClick={handleIncrease}
                                    className="px-2 py-1 text-gray-400"
                                >
                                    +
                                </button>
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
                // render modal via portal so it escapes Swiper / slide stacking/transform context
                <VariantModalPortal product={product} onClose={() => setIsModalOpen(false)} />
            )}
        </>
    );
}

/* -------------------------
   VariantModalPortal - monta o modal via createPortal no document.body
   Conteúdo do modal é o mesmo do que já implementamos — responsivo.
   ------------------------- */
function VariantModalPortal({ product, onClose }: { product: ProductFormData; onClose: () => void; }) {
    // We build the modal content here then portal it
    const modalContent = <VariantModalInner product={product} onClose={onClose} />;
    if (typeof document === "undefined") return null;
    return createPortal(modalContent, document.body);
}

/* -------------------------
   VariantModalInner - conteúdo real do modal (não relacionado ao portal)
   ------------------------- */
function VariantModalInner({ product, onClose }: { product: ProductFormData; onClose: () => void; }) {
    const { addItem } = useCart();
    const [quantity, setQuantity] = useState<number>(1);
    const [adding, setAdding] = useState<boolean>(false);
    const [selectedVariant, setSelectedVariant] = useState<any | null>(null);
    const [attributeSelection, setAttributeSelection] = useState<Record<string, string>>({});
    const [mainImage, setMainImage] = useState<string | null>(null);
    const [activeThumbIndex, setActiveThumbIndex] = useState<number>(0);

    // helpers
    const extractUrl = (maybe: any): string | null => {
        if (!maybe && maybe !== 0) return null;
        if (typeof maybe === "string") return maybe;
        if (maybe?.url) return maybe.url;
        return null;
    };
    const toSrc = (raw: string | null | undefined) => {
        if (!raw) return "/placeholder.png";
        if (String(raw).startsWith("http://") || String(raw).startsWith("https://")) return String(raw);
        if (String(raw).startsWith("/files/") || String(raw).startsWith("/")) return `${process.env.NEXT_PUBLIC_API_URL || ""}${String(raw).startsWith("/") ? String(raw) : `/${String(raw)}`}`;
        return `${API_URL}/files/${raw}`;
    };

    const variants = Array.isArray(product.variants) ? product.variants : [];

    // attribute options map
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

    // attribute images map (key -> value -> [urls])
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

    // find variant by selection
    function findVariantBySelection(sel: Record<string, string>) {
        if (!variants.length) return null;
        return variants.find((v: any) => {
            const attrs = v.attributes ?? v.variantAttribute ?? v.variantAttributes ?? [];
            if (!Array.isArray(attrs)) return false;
            return Object.entries(sel).every(([k, val]) => attrs.some((a: any) => String(a.key ?? a.name ?? "Opção") === String(k) && String(a.value ?? a.val ?? "") === String(val)));
        }) ?? null;
    }

    // build thumbnails: variant images + attribute images (selected) + product images
    function buildThumbnails(forVariant?: any) {
        const set = new Set<string>();
        if (forVariant) {
            if (Array.isArray(forVariant.images)) {
                forVariant.images.forEach((im: any) => { const u = extractUrl(im) || extractUrl(im?.url); if (u) set.add(u) });
            }
            if (Array.isArray(forVariant.productVariantImage)) {
                forVariant.productVariantImage.forEach((im: any) => { const u = extractUrl(im) || extractUrl(im?.url); if (u) set.add(u) });
            }
        }
        // attribute images according to current selection
        Object.entries(attributeSelection).forEach(([k, v]) => {
            const arr = attributeImagesMap?.[k]?.[v] ?? [];
            arr.forEach((u) => set.add(u));
        });
        // product images
        if (Array.isArray(product.images)) {
            product.images.forEach((im: any) => { const u = extractUrl(im) || extractUrl(im?.url); if (u) set.add(u) });
        }
        if (product.primaryImage) set.add(product.primaryImage);
        return Array.from(set).filter(Boolean);
    }

    // initial pre-selection when modal opens
    useEffect(() => {
        setQuantity(1);
        if (!variants || variants.length === 0) {
            const fallback = extractUrl(product.primaryImage) ?? extractUrl(product.images?.[0]) ?? null;
            setMainImage(fallback ? toSrc(fallback) : null);
            return;
        }

        const initSel: Record<string, string> = {};
        Object.keys(attributeOptions).forEach(k => { initSel[k] = attributeOptions[k][0]; });

        let found = findVariantBySelection(initSel);
        if (found) {
            setAttributeSelection(initSel);
            setSelectedVariant(found);
            const thumb = extractUrl(found.images?.[0]) ?? extractUrl(found.productVariantImage?.[0]) ?? null;
            setMainImage(thumb ? toSrc(thumb) : null);
            setActiveThumbIndex(0);
            return;
        }

        const first = variants[0];
        if (first) {
            const selFromFirst: Record<string, string> = {};
            const attrs = first.attributes ?? first.variantAttribute ?? first.variantAttributes ?? [];
            if (Array.isArray(attrs)) attrs.forEach((a: any) => { selFromFirst[a.key ?? a.name ?? "Opção"] = a.value ?? a.val ?? String(a.value ?? "") });
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

    // when attributeSelection changes -> try to find variant and update mainImage
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

    // close on ESC
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    const thumbnails = buildThumbnails(selectedVariant ?? undefined);

    const displayPrice = Number(selectedVariant?.price_per ?? product.price_per ?? 0);
    const displayPriceOf = selectedVariant?.price_of ?? product.price_of ?? null;
    const displayStock = Number(selectedVariant?.stock ?? product.stock ?? 0);

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
        setAttributeSelection(prev => ({ ...prev, [k]: v }));
    }

    function onThumbClick(idx: number) {
        setActiveThumbIndex(idx);
        const raw = thumbnails[idx];
        setMainImage(toSrc(raw));
    }

    // Modal content (this will be portaled to document.body by VariantModalPortal)
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
            <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />

            <div className="text-black relative bg-white w-full h-full md:h-auto md:max-w-4xl md:rounded-lg md:shadow-lg overflow-auto m-0 md:m-6">
                <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
                    <div>
                        <div className="font-semibold">{product.name}</div>
                        <div className="text-xs text-gray-600">Escolha opções e adicione ao carrinho</div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={onClose} className="p-2 rounded hover:bg-gray-100"><FiX /></button>
                    </div>
                </div>

                <div className="p-4 grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-7 flex flex-col gap-3">
                        <div className="w-full bg-gray-50 rounded overflow-hidden flex items-center justify-center" style={{ minHeight: 260 }}>
                            {mainImage ? (
                                <Image src={mainImage} alt={product.name} width={800} height={600} className="object-contain w-full h-full" />
                            ) : (
                                <div className="w-full h-60 bg-gray-100 flex items-center justify-center text-gray-400">Sem imagem</div>
                            )}
                        </div>

                        <div className="flex gap-2 overflow-x-auto">
                            {thumbnails.length > 0 ? thumbnails.map((t, i) => (
                                <button key={i} onClick={() => onThumbClick(i)} className={`w-20 h-20 rounded overflow-hidden border ${i === activeThumbIndex ? "border-red-600" : "border-gray-200"}`}>
                                    <Image src={toSrc(t)} alt={`thumb-${i}`} width={80} height={80} className="object-cover w-full h-full" />
                                </button>
                            )) : <div className="text-sm text-gray-500">Sem imagens</div>}
                        </div>
                    </div>

                    <div className="md:col-span-5 flex flex-col gap-3">
                        <div>
                            <div className="text-sm text-gray-600 mb-1">SKU: {selectedVariant?.sku ?? "-"}</div>
                            <div className="flex items-baseline gap-3">
                                <div className="text-2xl font-bold text-red-600">{formattedPricePer}</div>
                                {formattedPriceOf && <div className="text-sm line-through text-gray-500">{formattedPriceOf}</div>}
                            </div>
                            <div className="text-xs text-gray-600">12x de {formattedInstallment} sem juros no cartão</div>
                        </div>

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
                                                        className={`flex items-center gap-2 px-2 py-1 rounded border ${selected ? "border-red-600 bg-red-50" : "border-gray-200 bg-white"} `}
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

                        <div className="flex items-center justify-between">
                            <div className="text-sm text-gray-600">Estoque: {selectedVariant?.stock ?? product.stock ?? "-"}</div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="px-3 py-1 border rounded disabled:opacity-50">-</button>
                                <div className="px-3">{quantity}</div>
                                <button onClick={() => setQuantity(q => q + 1)} className="px-3 py-1 border rounded">+</button>
                            </div>
                        </div>

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

                        <div className="text-xs text-gray-500 mt-2">Detalhes e todas as imagens estão disponíveis na página do produto.</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* -------------------------
   Export default Highlights (Swiper)
   ------------------------- */
export default function Highlights() {
    const { colors } = useTheme();
    const [highlights, setHighlights] = useState<ProductFormData[]>([]);

    useEffect(() => {
        const apiClient = setupAPIClient();
        async function fetchHighlights() {
            try {
                const { data } = await apiClient.get(`/products/highlights`);
                setHighlights(data);
            } catch (error) {
                console.error(error);
            }
        }
        fetchHighlights();
    }, []);

    return (
        <div className="container mx-auto px-4 py-8">
            <h2
                className="text-2xl font-bold mb-4"
                style={{ color: colors?.titulo_posts_mais_vizualizados || "#000000" }}
            >
                Destaques da loja
            </h2>

            <Swiper
                spaceBetween={16}
                slidesPerView={1}
                navigation
                breakpoints={{
                    640: { slidesPerView: 1 },
                    768: { slidesPerView: 2 },
                    1024: { slidesPerView: 4 },
                }}
                modules={[Navigation]}
                className="swiper-container"
            >
                {highlights.map((product) => (
                    <SwiperSlide key={product.id}>
                        <HighlightsCard product={product} />
                    </SwiperSlide>
                ))}
            </Swiper>
        </div>
    );
}