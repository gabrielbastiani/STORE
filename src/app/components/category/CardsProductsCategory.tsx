'use client'

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { FiShoppingCart } from "react-icons/fi";
import { ProductFormData } from "Types/types";
import { useCart } from "@/app/contexts/CartContext";
import { toSrc } from "./utilsProduct";
import { useTheme } from "@/app/contexts/ThemeContext";
import VariantModal from "./VariantModal";

export default function CardsProductsCategory({
    product,
    colorsProp,
}: {
    product: ProductFormData;
    colors?: any;
    colorsProp?: any; // backwards compat if passed differently
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
                style={{ background: localColors?.fundo_posts_mais_vizualizados || "#e5e9ee" }}
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