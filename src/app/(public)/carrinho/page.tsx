'use client';

import React, { ChangeEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { FiTrash2, FiPlus, FiMinus, FiX } from "react-icons/fi";
import { useTheme } from "@/app/contexts/ThemeContext";
import { useCart } from "@/app/contexts/CartContext";
import { usePromotions, PromotionDetail } from "@/app/hooks/usePromotions";
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
  const { cart, loading: cartLoading, updateItem, removeItem, clearCart } =
    useCart();

  // CEP / frete
  const [cep, setCep] = useState("");
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [selectedShipping, setSelectedShipping] = useState<string | null>(null);

  const [loadingFrete, setLoadingFrete] = useState(false);

  // cupom: campo de digitação vs cupom aplicado
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false); // ← adicionado

  // se é a primeira compra
  const isFirstPurchase = false;

  // Frete atual
  const currentFrete = selectedShipping
    ? shippingOptions.find((o) => o.id === selectedShipping)?.price || 0
    : 0;

  // Hook de promoções (retorna também `promotions`)
  const {
    discountTotal,
    freeGifts,
    badgeMap,
    promotions,
    loading: loadingPromo,
    error: promoError,
  } = usePromotions(cep, appliedCoupon, currentFrete, isFirstPurchase);

  // separar descontos de frete e produto
  const shippingDiscount = promotions
    .filter((p) => p.type === 'shipping')
    .reduce((sum, p) => sum + p.discount, 0);

  const productDiscount = discountTotal - shippingDiscount;

  // lookup de nomes e tipos de brinde
  const [giftInfo, setGiftInfo] = useState<
    Record<string, { name: string; type: "produto" | "variante" }>
  >({});

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

  // formata moeda
  const fmt = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format;
  const total = cart.subtotal - productDiscount + (currentFrete - shippingDiscount);

  // formata CEP
  function handleCepChange(e: ChangeEvent<HTMLInputElement>) {
    let digits = e.target.value.replace(/\D/g, "").slice(0, 8);
    if (digits.length > 5) digits = digits.slice(0, 5) + "-" + digits.slice(5);
    setCep(digits);
  }

  // calcula frete
  const calculateShipping = useCallback(async () => {
    // não calcula sem itens
    if (cart.items.length === 0) {
      toast.warn("Adicione itens ao carrinho antes de calcular o frete.");
      return;
    }
    // valida CEP
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
        if (data.options.length) {
          setSelectedShipping(data.options[0].id);
        }
      } else {
        toast.error("Não foi possível calcular o frete.");
      }
    } catch {
      toast.error("Erro de rede ao calcular frete.");
    } finally {
      setLoadingFrete(false);
    }
  }, [cep, cart.items]);

  useEffect(() => {
    if (cart.items.length === 0) {
      setShippingOptions([]);
      setSelectedShipping(null);
    }
  }, [cart.items.length]);

  useEffect(() => {
    if (shippingOptions.length > 0 && cep.match(/^\d{5}-\d{3}$/)) {
      calculateShipping();
    }
  }, [cart.items, cep, shippingOptions.length, calculateShipping]);

  // aplica cupom COM VALIDAÇÃO
  async function applyCoupon() {
    const code = couponInput.trim();
    if (!code) return;

    setValidatingCoupon(true);
    try {
      const res = await axios.post<{ valid: boolean }>(
        `${API_URL}/coupon/validate`,
        {
          cartItems: cart.items.map(i => ({
            variantId: i.variant_id,
            productId: i.product_id,
            quantity: i.quantity,
            unitPrice: i.price,
          })),
          customer_id: cart.id || null,
          isFirstPurchase,
          cep: cep || null,
          shippingCost: currentFrete,
          coupon: code,
        }
      );
      if (res.data.valid) {
        setAppliedCoupon(code);
        toast.success(`Cupom “${code}” aplicado!`);
      } else {
        toast.error("Cupom inválido, desativado ou não cadastrado.");
      }
    } catch {
      toast.error("Erro ao validar cupom. Tente novamente.");
    } finally {
      setValidatingCoupon(false);
    }
  }

  // remove cupom
  function removeCoupon() {
    setAppliedCoupon(null);
    setCouponInput("");
    toast.info("Cupom removido");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavbarCheckout />

      <main className="container mx-auto px-4 py-8 grid lg:grid-cols-3 gap-8">
        {/* Itens do Carrinho */}
        <section className="lg:col-span-2 space-y-4">
          {cartLoading && (
            <p className="text-center text-gray-500">Carregando carrinho…</p>
          )}
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
                {badgeMap[item.variant_id || ""] && (
                  <Image
                    src={`${API_URL}/files/${badgeMap[item.variant_id || ""].imageUrl}`}
                    width={120}
                    height={120}
                    alt={badgeMap[item.variant_id || ""].title}
                    title={badgeMap[item.variant_id || ""].title}
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
              Possui cupom?
            </label>

            {!appliedCoupon ? (
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  placeholder="Código"
                  className="flex-1 border border-gray-300 rounded px-3 py-2 text-black"
                />
                <button
                  onClick={applyCoupon}
                  disabled={!couponInput.trim() || validatingCoupon}
                  className="bg-gray-800 text-white px-4 rounded disabled:opacity-50"
                >
                  {validatingCoupon ? "Validando…" : "Aplicar"}
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between bg-indigo-50 p-2 rounded">
                <span className="text-indigo-800">
                  Cupom <strong>{appliedCoupon}</strong> aplicado
                </span>
                <button
                  onClick={removeCoupon}
                  className="p-1 text-indigo-600 hover:text-indigo-900"
                  title="Remover cupom"
                >
                  <FiX />
                </button>
              </div>
            )}

            {loadingPromo && (
              <p className="text-red-200">Aplicando promoções…</p>
            )}
            {promoError && <p className="text-red-600">{promoError}</p>}
            {!promoError && discountTotal > 0 && (
              <p className="text-green-600">Desconto: -{fmt(discountTotal)}</p>
            )}
          </div>

          {/* Listagem das promoções individuais */}
          {promotions.length > 0 && (
            <div className="bg-gray-50 p-4 rounded space-y-2">
              <h3 className="font-semibold text-black">Promoções aplicadas</h3>
              <ul className="list-disc list-inside">
                {promotions.map((p: PromotionDetail) => (
                  <li
                    key={p.id}
                    className="flex justify-between items-start"
                  >
                    <div>
                      {p.description && (
                        <p className="text-sm text-gray-600">
                          {p.description}
                        </p>
                      )}
                    </div>
                    <span
                      className={
                        p.type === "shipping"
                          ? "text-blue-600"
                          : p.type === "product"
                            ? "text-green-600"
                            : "text-gray-600"
                      }
                    >
                      -{fmt(p.discount)}
                    </span>
                  </li>
                ))}
              </ul>
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
              <>
                {shippingDiscount > 0 ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-700">Frete</span>
                      <span className="line-through text-gray-500">
                        {fmt(currentFrete)}
                      </span>
                    </div>
                    <div className="flex justify-between text-blue-600 font-semibold">
                      <span className="text-gray-700">Frete (com desconto)</span>
                      <span>{fmt(currentFrete - shippingDiscount)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between">
                    <span className="text-gray-700">Frete</span>
                    <span className="text-black">{fmt(currentFrete)}</span>
                  </div>
                )}
              </>
            )}

            {productDiscount > 0 && (
              <div className="flex justify-between text-green-600">
                <span className="text-gray-700">Desconto</span>
                <span>-{fmt(productDiscount)}</span>
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