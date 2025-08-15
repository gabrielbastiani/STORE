"use client";

import { setupAPIClient } from "@/services/api";
import Link from "next/link";
import { useEffect, useState } from "react";
import Image from "next/image";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import { FiShoppingCart } from "react-icons/fi";
import { ProductFormData } from "Types/types";
import { useTheme } from "@/app/contexts/ThemeContext";
import { useCart } from "@/app/contexts/CartContext";
import { toast } from "react-toastify";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const STORAGE_KEY = "recently_viewed";
const MAX_ITEMS = 10;

function RecentlyViewedCard({ product }: { product: ProductFormData }) {

    const { colors } = useTheme();
    const { addItem } = useCart();
    const [quantity, setQuantity] = useState(1);
    const [adding, setAdding] = useState(false);

    const hasOffer = product.price_per! < product.price_of!;
    const discountPercentage = hasOffer
        ? Math.round((1 - product.price_per! / product.price_of!) * 100)
        : 0;
    const primaryImage =
        product.images.find((img) => img.isPrimary) || product.images[0];

    const fmt = new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
    }).format;
    const formattedPricePer = fmt(product.price_per!);
    const formattedPriceOf = fmt(product.price_of!);
    const formattedInstallment = fmt(product.price_per! / 12);

    function handleDecrease() {
        setQuantity((q) => Math.max(1, q - 1));
    }
    function handleIncrease() {
        setQuantity((q) => q + 1);
    }
    async function handleAddToCart() {
        try {
            setAdding(true);
            await addItem(String(product.id), quantity);
            toast.success(`${product.name} adicionado ao carrinho!`);
            setQuantity(1);
        } catch {
            toast.error("Erro ao adicionar ao carrinho.");
        } finally {
            setAdding(false);
        }
    }

    return (
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
                    src={`${API_URL}/files/${primaryImage.url}`}
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

            {product?.stock === 0 ?
                <div
                    className="flex items-center justify-center flex-1 bg-white disabled:opacity-50 text-red-600 font-semibold rounded transition"
                >
                    Produto Indisponivel
                </div>
                :
                <div className="mt-auto">
                    <div className="flex items-baseline">
                        <span className="text-xl font-bold text-red-600">
                            {formattedPricePer}
                        </span>
                        {hasOffer && (
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
                        <button
                            onClick={handleAddToCart}
                            disabled={adding}
                            className="ml-2 flex items-center justify-center flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold py-2 rounded transition"
                        >
                            <FiShoppingCart className="mr-2 text-lg" />
                            {adding ? "Adicionando…" : "Adicionar"}
                        </button>
                    </div>
                </div>
            }
        </div>
    );
}

export default function RecentlyViewed() {

    const { colors } = useTheme();
    const [products, setProducts] = useState<ProductFormData[]>([]);

    useEffect(() => {
        async function loadRecentlyViewed() {
            const raw = localStorage.getItem(STORAGE_KEY) || "[]";
            const ids: string[] = JSON.parse(raw)
                .filter((v: any) => typeof v === "string")
                .reverse()
                .filter((id: any, i: any, arr: string | any[]) => arr.indexOf(id) === i)
                .slice(0, MAX_ITEMS);

            if (!ids.length) {
                setProducts([]);
                return;
            }

            const api = setupAPIClient();
            try {
                // Chamada única enviando o array de ids
                const { data } = await api.post<ProductFormData[]>(
                    "/product/recently/views",
                    { id: ids }
                );
                setProducts(data);
            } catch (err) {
                console.error("Erro ao buscar visualizados recentemente", err);
                setProducts([]);
            }
        }

        loadRecentlyViewed();
    }, []);

    return (
        <div className="container mx-auto px-4 py-8">
            <h2
                className="text-2xl font-bold mb-4"
                style={{ color: colors?.titulo_posts_mais_vizualizados || "#000000" }}
            >
                Visualizados recentemente
            </h2>

            {products.length === 0 ? (
                <p className="text-center text-gray-500">
                    Nenhum produto visualizado.
                </p>
            ) : (
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
                    {products.map((product) => (
                        <SwiperSlide key={product.id}>
                            <RecentlyViewedCard product={product} />
                        </SwiperSlide>
                    ))}
                </Swiper>
            )}
        </div>
    );
}