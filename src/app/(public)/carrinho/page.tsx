'use client'

import React, { ChangeEvent, useCallback, useContext, useEffect, useState } from "react";
import Image from "next/image";
import { FiTrash2, FiPlus, FiMinus } from "react-icons/fi";
import { useTheme } from "@/app/contexts/ThemeContext";
import { useCart } from "@/app/contexts/CartContext";
import { toast } from "react-toastify";
import { NavbarCheckout } from "@/app/components/navbar/navbarCheckout";
import { FooterCheckout } from "@/app/components/footer/footerCheckout";
import { SelectedOption } from "Types/types";
import { useRouter } from "next/navigation";
import { AuthContextStore } from "@/app/contexts/AuthContextStore";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

interface ShippingOption {
  id: string;
  name: string;
  price: number;
  deliveryTime: string;
}

export default function CartPage() {

  const router = useRouter();
  const { isAuthenticated } = useContext(AuthContextStore);
  const { colors } = useTheme();
  const { cart, loading: cartLoading, updateItem, removeItem, clearCart, cartCount } = useCart();

  const cartOk = cartCount >= 1;

  // CEP / frete
  const [cep, setCep] = useState("");
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [selectedShipping, setSelectedShipping] = useState<string | null>(null);

  console.log(shippingOptions)

  const [loadingFrete, setLoadingFrete] = useState(false);

  // Frete atual
  const currentFrete = selectedShipping ? (shippingOptions.find((o) => o.id === selectedShipping)?.price || 0) : 0;

  const fmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format;
  // total sem promoções (promoções removidas desta página)
  const total = (cart?.subtotal ?? 0) + currentFrete;

  function handleCepChange(e: ChangeEvent<HTMLInputElement>) {
    let digits = e.target.value.replace(/\D/g, "").slice(0, 8);
    if (digits.length > 5) digits = digits.slice(0, 5) + "-" + digits.slice(5);
    setCep(digits);
  }

  const calculateShipping = useCallback(async () => {
    if (!cart?.items || cart.items.length === 0) {
      toast.warn("Adicione itens ao carrinho antes de calcular o frete.");
      return;
    }
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
        setShippingOptions(data.options || []);
        if (data.options?.length) setSelectedShipping(data.options[0].id);
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
    if (!cart?.items || cart.items.length === 0) {
      setShippingOptions([]);
      setSelectedShipping(null);
    }
  }, [cart?.items?.length]);

  useEffect(() => {
    if (shippingOptions.length > 0 && cep.match(/^\d{5}-\d{3}$/)) {
      calculateShipping();
    }
  }, [cart.items, cep, shippingOptions.length, calculateShipping]);

  // helper para resolver src de imagem (path local ou remoto)
  const resolveImageSrc = (src?: string) => {
    if (!src) return "";
    if (src.startsWith("http")) return src;
    return `${API_URL}/files/${src}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <NavbarCheckout />

      <main className="container mx-auto px-4 py-8 grid lg:grid-cols-3 gap-8">
        {/* Itens do Carrinho */}
        <section className="lg:col-span-2 space-y-4">
          {cartLoading && <p className="text-center text-gray-500">Carregando carrinho…</p>}

          {!cartLoading && (!cart?.items || cart.items.length === 0) && (
            <p className="text-center text-gray-500">Carrinho vazio...</p>
          )}

          {!cartLoading && cart.items.map((item) => {
            // prioriza variantImage se existir, senão images
            const displayedImg = item.variantImage
              ? resolveImageSrc(item.variantImage)
              : Array.isArray(item.images)
                ? (item.images[0] ? resolveImageSrc(item.images[0] as string) : "")
                : resolveImageSrc(item.images as string);

            return (
              <div key={item.id} className="relative flex items-start bg-white p-4 rounded shadow">
                {/* Imagem principal (com prioridade para variantImage) */}
                <div className="w-28 h-28 flex-shrink-0 flex items-center justify-center overflow-hidden rounded bg-gray-100">
                  {displayedImg ? (
                    // next/image exige configuração de domains para imagens remotas
                    <Image src={displayedImg} alt={item.name} width={112} height={112} className="object-contain" />
                  ) : (
                    <div className="text-gray-400">sem imagem</div>
                  )}
                </div>

                {/* Detalhes */}
                <div className="flex-1 px-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-gray-800">{item.name}</p>

                      {/* Variante (nome/sku) */}
                      {(item.variant_name || item.variant_sku) && (
                        <p className="mt-1 text-sm text-gray-600">
                          <strong>Variante:</strong>{" "}
                          {item.variant_name ?? item.variant_sku}
                          {item.variant_sku && item.variant_name && (
                            <span className="ml-2 text-xs text-gray-400">({item.variant_sku})</span>
                          )}
                        </p>
                      )}

                      {/* Selected options com possível thumb dentro da pill */}
                      {item.selectedOptions && item.selectedOptions.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {item.selectedOptions.map((opt: SelectedOption, idx: number) => (
                            <div key={idx} className="flex items-center gap-2 text-xs px-2 py-1 rounded-full border border-gray-200 bg-gray-50" title={`${opt.name}: ${opt.value}`}>
                              {opt.image ? (
                                <img
                                  src={opt.image.startsWith("http") ? opt.image : `${API_URL}/files/${opt.image}`}
                                  alt={opt.value}
                                  className="w-5 h-5 object-cover rounded-full"
                                />
                              ) : null}
                              <strong className="mr-1 text-violet-600">{opt.name}:</strong> <span className="text-violet-600">{opt.value}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <p className="mt-2 text-sm text-gray-600">{fmt(item.price)} cada</p>
                    </div>

                    {/* Preço total item */}
                    <div className="text-right">
                      <p className="text-gray-800">{fmt((item.price ?? 0) * (item.quantity ?? 0))}</p>
                      <p className="text-xs text-gray-500">12x de {fmt(((item.price ?? 0) * (item.quantity ?? 0)) / 12)} sem juros</p>
                    </div>
                  </div>

                  {/* Thumbs de imagens de atributos (se houver) */}
                  {item.attributeImages && item.attributeImages.length > 0 && (
                    <div className="mt-3 flex items-center gap-2">
                      {item.attributeImages.map((aUrl, j) => (
                        <img
                          key={j}
                          src={aUrl.startsWith("http") ? aUrl : `${API_URL}/files/${aUrl}`}
                          alt={`atributo-${j}`}
                          className="w-10 h-10 object-cover rounded border"
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Ações (Remover / Qtd) */}
                <div className="ml-4 flex flex-col items-end">
                  <button onClick={() => removeItem(item.id)} className="p-2 text-gray-400 hover:text-red-600">
                    <FiTrash2 />
                  </button>

                  <div className="flex items-center border border-gray-300 rounded mt-2">
                    <button onClick={() => updateItem(item.id, Math.max(1, item.quantity - 1))} disabled={item.quantity <= 1} className="px-3 py-1 disabled:opacity-50 text-gray-500">
                      <FiMinus />
                    </button>
                    <span className="px-4 text-gray-600">{item.quantity}</span>
                    <button onClick={() => updateItem(item.id, item.quantity + 1)} className="px-3 py-1 text-gray-500">
                      <FiPlus />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        {/* Resumo / Checkout */}
        <aside className="space-y-6">
          {/* CEP */}
          <div className="bg-white p-4 rounded shadow space-y-2">
            <label className="block text-sm font-medium text-gray-700">Digite o CEP de entrega</label>
            <div className="flex space-x-2">
              <input type="text" value={cep} onChange={handleCepChange} placeholder="00000-000" className="flex-1 border border-gray-300 rounded px-3 py-2 text-black" />
              <button onClick={calculateShipping} disabled={loadingFrete} className="bg-gray-800 hover:bg-gray-900 text-white px-4 rounded disabled:opacity-50">
                {loadingFrete ? "Calculando…" : "Calcular"}
              </button>
            </div>
            <p className="text-xs text-gray-500">Atenção: consultando Melhor Envio em tempo real.</p>
          </div>

          {/* Opções de Frete */}
          {shippingOptions.length > 0 && (
            <div className="bg-white p-4 rounded shadow space-y-2 text-black">
              {shippingOptions.map((opt) => (
                <>
                  {opt.price === null ?
                    null
                    :
                    <div key={opt.id} className="flex items-center justify-between">
                      <label className="flex-1 cursor-pointer">
                        <input type="radio" name="shipping" value={opt.id} checked={selectedShipping === opt.id} onChange={() => setSelectedShipping(opt.id)} className="mr-2 text-black" />
                        <span className="font-medium">{opt.name}</span>
                      </label>
                      <div className="text-right">
                        <p>{fmt(opt.price)}</p>
                        <p className="text-xs text-gray-500">{opt.deliveryTime}</p>
                      </div>
                    </div>
                  }
                </>
              ))}
            </div>
          )}

          {/* Totais */}
          <div className="bg-white p-4 rounded shadow space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-700">Subtotal</span>
              <span className="text-black">{fmt(cart.subtotal ?? 0)}</span>
            </div>

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

            <p className="text-xs text-gray-500">12x de {fmt(total / 12)} sem juros</p>
          </div>

          {/* Ações finais */}
          <div className="space-y-2">
            {cartOk ?
              <>
                <button onClick={() => clearCart()} className="w-full bg-gray-800 hover:bg-gray-900 text-white py-3 rounded">LIMPAR CARRINHO</button>
                {isAuthenticated && cartOk ?
                  <button onClick={() => router.push('/finalizar-pedido')} className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded">FINALIZAR COMPRA</button>
                  :
                  <button onClick={() => router.push('/login')} className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded">FINALIZAR COMPRA</button>
                }
              </>
              :
              null
            }
            <button onClick={() => router.back()} className="w-full text-gray-800 hover:underline">Continuar Comprando</button>
          </div>
        </aside>
      </main>
      <FooterCheckout />
    </div>
  );
}