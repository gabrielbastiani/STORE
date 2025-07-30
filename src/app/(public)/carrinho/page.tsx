"use client";

import React, { ChangeEvent, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { FiTrash2, FiPlus, FiMinus } from "react-icons/fi";
import { useTheme } from "@/app/contexts/ThemeContext";
import { useCart } from "@/app/contexts/CartContext";
import { usePromotions } from "@/app/hooks/usePromotions";
import { toast } from "react-toastify";
import { NavbarCheckout } from "@/app/components/navbar/navbarCheckout";
import { FooterCheckout } from "@/app/components/footer/footerCheckout";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface ShippingOption {
  id: string;
  name: string;
  price: number;
  deliveryTime: string;
}

export default function CartPage() {

  const { colors } = useTheme();

  const { cart, loading: cartLoading, updateItem, removeItem, clearCart } = useCart();

  // CEP / frete
  const [cep, setCep] = useState("");
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [selectedShipping, setSelectedShipping] = useState<string | null>(null);
  const [loadingFrete, setLoadingFrete] = useState(false);

  // cupom: campo de digitação vs cupom aplicado
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);

  // se é a primeira compra (você pode buscar do backend)
  const isFirstPurchase = false;

  // Frete atual
  const currentFrete = selectedShipping
    ? shippingOptions.find((o) => o.id === selectedShipping)?.price || 0
    : 0;

  // Hook de promoções
  const {
    discountTotal,
    freeGifts,
    badgeMap,
    descriptions,
    loading: loadingPromo,
    error: promoError,
  } = usePromotions(cep, appliedCoupon, currentFrete, isFirstPurchase);

  // lookup de nomes e tipos de brinde
  const [giftInfo, setGiftInfo] = useState<
    Record<string, { name: string; type: "produto" | "variante" }>
  >({});

  // Sempre que freeGifts mudar, buscar nomes dos brindes “fora do carrinho”
  useEffect(() => {
    const missing = freeGifts
      .map((g) => g.variantId)
      .filter((id) => !giftInfo[id]);

    if (missing.length === 0) return;

    missing.forEach(async (id) => {
      // tenta buscar como PRODUTO
      try {
        const prodRes = await axios.get<{ name: string }>(
          `${API_URL}/product/unique/data?product_id=${id}`
        );
        if (prodRes.data.name) {
          setGiftInfo((prev) => ({
            ...prev,
            [id]: { name: prodRes.data.name, type: "produto" },
          }));
          return;
        }
      } catch {
        // ignora e tenta variante
      }

      // busca como VARIANTE
      try {
        const varRes = await axios.get<{ sku: string; name?: string }>(
          `${API_URL}/variant/get/unique?variant_id=${id}`
        );
        const fallback = varRes.data.sku || "Desconhecido";
        setGiftInfo((prev) => ({
          ...prev,
          [id]: { name: fallback, type: "variante" },
        }));
      } catch {
        setGiftInfo((prev) => ({
          ...prev,
          [id]: { name: "Produto desconhecido", type: "produto" },
        }));
      }
    });
  }, [freeGifts, giftInfo]);

  // Formata moeda
  const fmt = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format;
  const total = cart.subtotal - discountTotal + currentFrete;

  // formata CEP
  function handleCepChange(e: ChangeEvent<HTMLInputElement>) {
    let digits = e.target.value.replace(/\D/g, "").slice(0, 8);
    if (digits.length > 5) digits = digits.slice(0, 5) + "-" + digits.slice(5);
    setCep(digits);
  }

  // calcula frete
  async function calculateShipping() {
    if (!cep.match(/^\d{5}-\d{3}$/)) {
      toast.error("Informe um CEP válido (00000-000)");
      return;
    }
    setLoadingFrete(true);
    try {
      const res = await fetch(`${API_URL}/shipment/calculate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cepDestino: cep,
          items: cart.items.map((i) => ({
            quantity: i.quantity,
            weight: i.weight,
            length: i.length,
            height: i.height,
            width: i.width,
          })),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setShippingOptions(data.options);
        if (data.options.length) setSelectedShipping(data.options[0].id);
      } else {
        toast.error("Não foi possível calcular o frete.");
      }
    } catch {
      toast.error("Erro de rede ao calcular frete.");
    } finally {
      setLoadingFrete(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavbarCheckout />

      <main className="container mx-auto px-4 py-8 grid lg:grid-cols-3 gap-8">
        {/* Itens do Carrinho */}
        <section className="lg:col-span-2 space-y-4">
          {cartLoading && <p className="text-center text-gray-500">Carregando carrinho…</p>}
          {!cartLoading && cart.items.length === 0 && (
            <p className="text-center text-gray-500">Carrinho vazio...</p>
          )}
          {!cartLoading &&
            cart.items.map((item) => (
              <div
                key={item.id}
                className="relative flex items-center bg-white p-4 rounded shadow"
              >
                {/* Badge */}
                {badgeMap[item.variant_id] && (
                  <img
                    src={badgeMap[item.variant_id].imageUrl}
                    alt={badgeMap[item.variant_id].title}
                    title={badgeMap[item.variant_id].title}
                    className="absolute top-2 left-2 w-8 h-8 object-contain"
                  />
                )}

                {/* Imagem */}
                <div className="w-28 h-20 flex-shrink-0">
                  <Image
                    src={`${API_URL}/files/${item.images}`}
                    alt={item.name}
                    width={80}
                    height={80}
                    className="object-cover rounded"
                  />
                </div>

                {/* Detalhes */}
                <div className="flex-1 px-4">
                  <p className="text-gray-800">{item.name}</p>
                  <p className="mt-1 text-sm text-gray-600">
                    {fmt(item.price)} cada
                  </p>
                </div>

                {/* Remove */}
                <button
                  onClick={() => removeItem(item.id)}
                  className="p-2 text-gray-400 hover:text-red-600"
                >
                  <FiTrash2 />
                </button>

                {/* Quantidade */}
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
                    onClick={() => updateItem(item.id, item.quantity + 1)}
                    className="px-3 py-1 text-gray-500"
                  >
                    <FiPlus />
                  </button>
                </div>

                {/* Preço total item */}
                <div className="w-32 text-right px-4">
                  <p className="text-gray-800">
                    {fmt(item.price * item.quantity)}
                  </p>
                  <p className="text-xs text-gray-500">
                    12x de {fmt((item.price * item.quantity) / 12)} sem juros
                  </p>
                </div>
              </div>
            ))}
        </section>

        {/* Resumo / Checkout */}
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
                onChange={handleCepChange}
                placeholder="00000-000"
                className="flex-1 border border-gray-300 rounded px-3 py-2 text-black"
              />
              <button
                onClick={calculateShipping}
                disabled={loadingFrete}
                className="bg-gray-800 hover:bg-gray-900 text-white px-4 rounded disabled:opacity-50"
              >
                {loadingFrete ? "Calculando…" : "Calcular"}
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Atenção: consultando Melhor Envio em tempo real.
            </p>
          </div>

          {/* Opções de Frete */}
          {shippingOptions.length > 0 && (
            <div className="bg-white p-4 rounded shadow space-y-2 text-black">
              {shippingOptions.map((opt) => (
                <div key={opt.id} className="flex items-center justify-between">
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
              Possui cupom?
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value)}
                placeholder="Código"
                className="flex-1 border border-gray-300 rounded px-3 py-2 text-black"
              />
              <button
                onClick={() => setAppliedCoupon(couponInput.trim() || null)}
                className="bg-gray-800 text-white px-4 rounded"
              >
                Aplicar
              </button>
            </div>
            {loadingPromo && <p className="text-red-200">Aplicando promoções…</p>}
            {promoError && <p className="text-red-600">{promoError}</p>}
            {!promoError && discountTotal > 0 && (
              <p className="text-green-600">Desconto: -{fmt(discountTotal)}</p>
            )}
          </div>

          {descriptions.length > 0 && (
            <div className="bg-indigo-50 p-4 rounded text-indigo-800 space-y-2 text-sm">
              {descriptions.map((desc, i) => (
                <p key={i}>🔖 {desc}</p>
              ))}
            </div>
          )}

          {/* Totais */}
          <div className="bg-white p-4 rounded shadow space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-700">Subtotal</span>
              <span className="text-black">{fmt(cart.subtotal)}</span>
            </div>
            {discountTotal > 0 && (
              <div className="flex justify-between text-green-600">
                <span className="text-gray-700">Desconto</span>
                <span>-{fmt(discountTotal)}</span>
              </div>
            )}
            {currentFrete > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-700">Frete</span>
                <span className="text-black">{fmt(currentFrete)}</span>
              </div>
            )}
            <div className="border-t pt-2 flex justify-between font-bold">
              <span className="text-gray-700">Total</span>
              <span className="text-red-500">{fmt(total)}</span>
            </div>
            <p className="text-xs text-gray-500">
              12x de {fmt(total / 12)} sem juros
            </p>
          </div>

          {/* Brindes */}
          {freeGifts.length > 0 && (
            <div className="bg-green-50 p-3 rounded text-green-800 text-sm">
              🎁 Você ganhou:&nbsp;
              {freeGifts.map((g) => {
                const info = giftInfo[g.variantId] || {
                  name: "Desconhecido",
                  type: "produto",
                };
                return (
                  <span key={g.variantId}>
                    {g.quantity}× {info.type} “{info.name}”&nbsp;
                  </span>
                );
              })}
            </div>
          )}

          {/* Ações Finais */}
          <div className="space-y-2">
            <button
              onClick={() => clearCart()}
              className="w-full bg-gray-800 hover:bg-gray-900 text-white py-3 rounded"
            >
              LIMPAR CARRINHO
            </button>
            <button className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded">
              FINALIZAR COMPRA
            </button>
            <Link href="/" className="block text-center text-gray-800 hover:underline">
              Continuar Comprando
            </Link>
          </div>
        </aside>
      </main>

      <FooterCheckout />
    </div>
  );
}