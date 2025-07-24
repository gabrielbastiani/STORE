"use client"

import { useTheme } from "@/app/contexts/ThemeContext";
import { useCart } from "@/app/contexts/CartContext";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
    FiTrash2,
    FiPlus,
    FiMinus
} from "react-icons/fi";
import { FooterCheckout } from "@/app/components/footer/footerCheckout";
import { NavbarCheckout } from "@/app/components/navbar/navbarCheckout";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface ShippingOption {
    id: string;
    name: string;
    price: number;
    deliveryTime: string;
}

export default function CartPage() {

    const { colors } = useTheme();
    
    // Contexto do carrinho
    const {
        cart,            // { id, items: CartItem[], subtotal, shippingCost, total }
        cartCount,
        loading: cartLoading,
        updateItem,
        removeItem,
        clearCart,
    } = useCart();

    // CEP / frete
    const [cep, setCep] = useState("");
    const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
    const [selectedShipping, setSelectedShipping] = useState<string | null>(null);

    // Cupom
    const [coupon, setCoupon] = useState("");
    const [discountValue, setDiscountValue] = useState(0);

    // Aplica cupom (exemplo 10% de desconto)
    function applyCoupon() {
        setDiscountValue(cart.subtotal * 0.1);
    }

    // Simula frete
    function calculateShipping() {
        setShippingOptions([
            { id: "cca", name: "CCA EXPRESS – Normal", price: 51.39, deliveryTime: "Em até 2 dias úteis" },
            { id: "sedex", name: "CORREIOS – SEDEX", price: 78.99, deliveryTime: "Em até 1 dia útil" },
            { id: "pac", name: "CORREIOS – PAC", price: 100.42, deliveryTime: "Em até 6 dias úteis" },
        ]);
        setSelectedShipping("cca");
    }

    // Formata moeda
    const fmt = new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
    }).format;

    // Total dinâmico incluindo desconto e frete
    const currentFrete = selectedShipping
        ? shippingOptions.find((o) => o.id === selectedShipping)?.price || 0
        : 0;
    const total = cart.subtotal - discountValue + currentFrete;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            
            <NavbarCheckout />

            {/* Conteúdo */}
            <main className="container mx-auto px-4 py-8 grid lg:grid-cols-3 gap-8">
                {/* Itens do carrinho */}
                <section className="lg:col-span-2 space-y-4">
                    {cartLoading && (
                        <p className="text-center text-gray-500">Carregando carrinho…</p>
                    )}
                    {!cartLoading && cart.items.length === 0 && (
                        <p className="text-center text-gray-500">Carrinho vazio</p>
                    )}
                    {!cartLoading &&
                        cart.items.map((item) => (
                            <div
                                key={item.id}
                                className="flex items-center bg-white p-4 rounded shadow"
                            >
                                <div className="relative w-28 h-20 flex-shrink-0">
                                    <Image
                                        src={`${API_URL}/files/${item.images}`}
                                        alt={item.name}
                                        width={80}
                                        height={80}
                                        className="object-cover rounded"
                                    />
                                </div>
                                <div className="flex-1 px-4">
                                    <p className="text-gray-800">{item.name}</p>
                                    <p className="mt-1 text-sm text-gray-600">
                                        {fmt(item.price)} cada
                                    </p>
                                </div>
                                <button
                                    onClick={() => removeItem(item.id)}
                                    className="p-2 text-gray-400 hover:text-red-600"
                                >
                                    <FiTrash2 />
                                </button>
                                <div className="flex items-center border border-gray-300 rounded ml-4">
                                    <button
                                        onClick={() =>
                                            updateItem(item.id, Math.max(1, item.quantity - 1))
                                        }
                                        disabled={item.quantity <= 1}
                                        className="px-3 py-1 disabled:opacity-50 text-gray-500"
                                    >
                                        <FiMinus />
                                    </button>
                                    <span className="px-4 text-gray-600">{item.quantity}</span>
                                    <button
                                        onClick={() =>
                                            updateItem(item.id, item.quantity + 1)
                                        }
                                        className="px-3 py-1 text-gray-500"
                                    >
                                        <FiPlus />
                                    </button>
                                </div>
                                <div className="w-32 text-right px-4">
                                    <p className="text-gray-800">
                                        {fmt(item.price * item.quantity)}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        12x de {fmt(item.price * item.quantity / 12)} sem juros
                                    </p>
                                </div>
                            </div>
                        ))}
                </section>

                {/* Resumo à direita */}
                <aside className="space-y-6">
                    {/* CEP */}
                    <div className="bg-white p-4 rounded shadow space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                            Digite o CEP de entrega
                        </label>
                        <div className="flex space-x-2">
                            <input
                                type="text"
                                value={cep}
                                onChange={(e) => setCep(e.target.value)}
                                placeholder="00000-000"
                                className="flex-1 border border-gray-300 rounded px-3 py-2 text-black"
                            />
                            <button
                                onClick={calculateShipping}
                                className="bg-gray-800 hover:bg-gray-900 text-white px-4 rounded"
                            >
                                Calcular
                            </button>
                        </div>
                        <p className="text-xs text-gray-500">
                            Atenção: Aqui você vai apenas simular o frete...
                        </p>
                    </div>

                    {/* Opções de frete */}
                    {shippingOptions.length > 0 && (
                        <div className="bg-white p-4 rounded shadow space-y-2">
                            {shippingOptions.map((opt) => (
                                <div
                                    key={opt.id}
                                    className="flex items-center justify-between"
                                >
                                    <label className="flex-1 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="shipping"
                                            value={opt.id}
                                            checked={selectedShipping === opt.id}
                                            onChange={() => setSelectedShipping(opt.id)}
                                            className="mr-2 text-black"
                                        />
                                        <span className="font-medium">{opt.name}</span>
                                    </label>
                                    <div className="text-right">
                                        <p>{fmt(opt.price)}</p>
                                        <p className="text-xs text-gray-500">
                                            {opt.deliveryTime}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Cupom */}
                    <div className="bg-white p-4 rounded shadow space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                            Possui cupom de desconto?
                        </label>
                        <div className="flex space-x-2">
                            <input
                                type="text"
                                value={coupon}
                                onChange={(e) => setCoupon(e.target.value)}
                                placeholder="Código"
                                className="flex-1 border border-gray-300 rounded px-3 py-2 text-black"
                            />
                            <button
                                onClick={applyCoupon}
                                className="bg-gray-800 hover:bg-gray-900 text-white px-4 rounded"
                            >
                                Calcular
                            </button>
                        </div>
                        {discountValue > 0 && (
                            <p className="text-green-600 text-sm">
                                Desconto aplicado: {fmt(discountValue)}
                            </p>
                        )}
                    </div>

                    {/* Totalizadores */}
                    <div className="bg-white p-4 rounded shadow space-y-1">
                        <div className="flex justify-between">
                            <span className="font-medium text-black">Subtotal</span>
                            <span className="text-black">{fmt(cart.subtotal)}</span>
                        </div>
                        {discountValue > 0 && (
                            <div className="flex justify-between text-green-600">
                                <span className="font-medium text-black">Desconto</span>
                                <span className="text-black">-{fmt(discountValue)}</span>
                            </div>
                        )}
                        {selectedShipping && (
                            <div className="flex justify-between">
                                <span className="font-medium">Frete</span>
                                <span className="text-black">
                                    {fmt(
                                        shippingOptions.find((o) => o.id === selectedShipping)!
                                            .price
                                    )}
                                </span>
                            </div>
                        )}
                        <div className="border-t pt-2 flex justify-between font-bold">
                            <span className="text-black">Total</span>
                            <span className="text-red-500">{fmt(total)}</span>
                        </div>
                        <p className="text-xs text-gray-500">
                            12x de {fmt(total / 12)} sem juros
                        </p>
                    </div>

                    {/* Botões finais */}
                    <div className="space-y-2">
                        <button
                            onClick={() => clearCart()}
                            className="w-full bg-gray-800 hover:bg-gray-900 text-white py-3 rounded font-semibold"
                        >
                            LIMPAR CARRINHO
                        </button>
                        <button className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded font-semibold">
                            FINALIZAR COMPRA
                        </button>
                        <Link
                            href="/"
                            className="block text-center text-gray-800 hover:underline"
                        >
                            Continuar Comprando
                        </Link>
                    </div>
                </aside>
            </main>
            <FooterCheckout />
        </div>
    );
}