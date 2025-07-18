"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
    FiTrash2,
    FiPlus,
    FiMinus,
    FiChevronLeft,
} from "react-icons/fi";

interface CartItem {
    id: string;
    name: string;
    imageUrl: string;
    price: number;
    quantity: number;
    pricePerInstallment: number; // price/12
}

interface ShippingOption {
    id: string;
    name: string;
    price: number;
    deliveryTime: string;
}

export default function CartPage() {
    // --- Estado do carrinho (substituir por contexto ou fetch real) ---
    const [items, setItems] = useState<CartItem[]>([
        {
            id: "1",
            name: "Tocha MIG SU 180 Black 3 Metros",
            imageUrl: "/tocha1.jpg",
            price: 380,
            quantity: 2,
            pricePerInstallment: 380 / 9,
        },
        {
            id: "2",
            name: "Tocha MIG/MAG SU 335 3 metros rosca grossa euro conector",
            imageUrl: "/tocha2.jpg",
            price: 1076.53,
            quantity: 1,
            pricePerInstallment: 1076.53 / 12,
        },
    ]);

    // --- Estado de CEP/Frete ---
    const [cep, setCep] = useState("");
    const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
    const [selectedShipping, setSelectedShipping] = useState<string | null>(
        null
    );

    // --- Cupom de desconto ---
    const [coupon, setCoupon] = useState("");
    const [discountValue, setDiscountValue] = useState(0);

    // Subtotais
    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const total = subtotal - discountValue + (selectedShipping
        ? shippingOptions.find((o) => o.id === selectedShipping)?.price || 0
        : 0);

    // Manipula quantidade
    function changeQty(id: string, delta: number) {
        setItems((prev) =>
            prev.map((i) =>
                i.id === id
                    ? { ...i, quantity: Math.max(1, i.quantity + delta) }
                    : i
            )
        );
    }

    // Remove item
    function removeItem(id: string) {
        setItems((prev) => prev.filter((i) => i.id !== id));
    }

    // Calcula frete (stub; chamar API real)
    function calculateShipping() {
        // TODO: fetch(`/api/frete?cep=${cep}`)
        // Exemplo fixo:
        setShippingOptions([
            { id: "cca", name: "CCA EXPRESS – Normal", price: 51.39, deliveryTime: "Em até 2 dias úteis" },
            { id: "sedex", name: "CORREIOS – SEDEX", price: 78.99, deliveryTime: "Em até 1 dia útil" },
            { id: "pac", name: "CORREIOS – PAC", price: 100.42, deliveryTime: "Em até 6 dias úteis" },
            { id: "sedex12", name: "CORREIOS – SEDEX 12 CONTRATO AG", price: 159.89, deliveryTime: "Em até 1 dia útil" },
            { id: "sedex_fg", name: "CORREIOS – SEDEX", price: 344.28, deliveryTime: "Em até 3 dias úteis" },
        ]);
        setSelectedShipping("cca");
    }

    // Aplica cupom (stub; chamar API real)
    function applyCoupon() {
        // TODO: fetch(`/api/cupom?code=${coupon}`)
        // Exemplo: 10% de desconto
        const disc = subtotal * 0.1;
        setDiscountValue(disc);
    }

    // Formata real
    const fmt = new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
    }).format;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="flex items-center justify-between bg-white px-4 py-3 shadow-sm">
                <Link href="/" className="flex items-center text-gray-700">
                    <FiChevronLeft className="mr-2 text-xl" />
                    VOLTAR
                </Link>
                <div>
                    <Image
                        src="/logo-sumig.png"
                        alt="Loja Sumig"
                        width={120}
                        height={32}
                    />
                </div>
                <span className="text-sm text-gray-600">Ambiente 100% seguro</span>
            </header>

            {/* Conteúdo */}
            <main className="container mx-auto px-4 py-8 grid lg:grid-cols-3 gap-8">
                {/* Itens do carrinho */}
                <section className="lg:col-span-2 space-y-4">
                    {items.map((item) => (
                        <div
                            key={item.id}
                            className="flex items-center bg-white p-4 rounded shadow"
                        >
                            <div className="relative w-28 h-20 flex-shrink-0">
                                <Image
                                    src={item.imageUrl}
                                    alt={item.name}
                                    fill
                                    className="object-cover rounded"
                                />
                            </div>
                            <div className="flex-1 px-4">
                                <p className="text-gray-800">{item.name}</p>
                                <p className="mt-1 text-sm text-gray-600">
                                    R$ {fmt(item.price)} cada
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
                                    onClick={() => changeQty(item.id, -1)}
                                    className="px-3 py-1 disabled:opacity-50"
                                    disabled={item.quantity <= 1}
                                >
                                    <FiMinus />
                                </button>
                                <span className="px-4">{item.quantity}</span>
                                <button
                                    onClick={() => changeQty(item.id, +1)}
                                    className="px-3 py-1"
                                >
                                    <FiPlus />
                                </button>
                            </div>
                            <div className="w-32 text-right px-4">
                                <p className="text-gray-800">R$ {fmt(item.price * item.quantity)}</p>
                                <p className="text-xs text-gray-500">
                                    {Math.round(item.quantity * item.pricePerInstallment)}x de{" "}
                                    {fmt(item.pricePerInstallment)} sem juros
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
                                className="flex-1 border border-gray-300 rounded px-3 py-2"
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
                                            className="mr-2"
                                        />
                                        <span className="font-medium">{opt.name}</span>
                                    </label>
                                    <div className="text-right">
                                        <p>R$ {fmt(opt.price)}</p>
                                        <p className="text-xs text-gray-500">{opt.deliveryTime}</p>
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
                                className="flex-1 border border-gray-300 rounded px-3 py-2"
                            />
                            <button
                                onClick={applyCoupon}
                                className="border border-gray-800 hover:bg-gray-800 hover:text-white px-4 rounded"
                            >
                                Calcular
                            </button>
                        </div>
                    </div>

                    {/* Totalizadores */}
                    <div className="bg-white p-4 rounded shadow space-y-1">
                        <div className="flex justify-between">
                            <span className="font-medium">Subtotal</span>
                            <span>R$ {fmt(subtotal)}</span>
                        </div>
                        {discountValue > 0 && (
                            <div className="flex justify-between text-green-600">
                                <span className="font-medium">Desconto</span>
                                <span>-R$ {fmt(discountValue)}</span>
                            </div>
                        )}
                        {selectedShipping && (
                            <div className="flex justify-between">
                                <span className="font-medium">Frete</span>
                                <span>R$ {fmt(shippingOptions.find(o => o.id === selectedShipping)!.price)}</span>
                            </div>
                        )}
                        <div className="border-t pt-2 flex justify-between font-bold">
                            <span>Total</span>
                            <span>R$ {fmt(total)}</span>
                        </div>
                        <p className="text-xs text-gray-500">
                            12x de {fmt(total / 12)} sem juros
                        </p>
                    </div>

                    {/* Botões finais */}
                    <div className="space-y-2">
                        <button className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded font-semibold">
                            Finalizar Compra
                        </button>
                        <Link href="/" className="block text-center text-gray-800 hover:underline">
                            Continuar Comprando
                        </Link>
                    </div>
                </aside>
            </main>
        </div>
    );
}