// app/components/pageProduct/ShippingEstimator.tsx
"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export interface ShippingOption {
    id: string;
    name: string;
    price: number;
    deliveryTime: string;
}

interface Props {
    product: any;
    selectedVariant: any | null;
    quantity: number;
    onShippingSelect?: (opt: ShippingOption | null) => void;
    debounceMs?: number;
}

/**
 * ShippingEstimator:
 * - Primeiro cálculo apenas quando usuário clicar em "Calcular".
 * - Depois disso, auto-recalcula quando quantity/selectedVariant mudarem.
 * - Usa ref para onShippingSelect (evita loop caso o pai passe handler inline).
 */
export default function ShippingEstimator({
    product,
    selectedVariant,
    quantity,
    onShippingSelect,
    debounceMs = 600,
}: Props) {
    const [cep, setCep] = useState("");
    const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
    const [selectedShippingId, setSelectedShippingId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [hasCalculatedOnce, setHasCalculatedOnce] = useState(false);

    // refs
    const autoTimer = useRef<number | null>(null);
    const pendingController = useRef<AbortController | null>(null);
    const onShippingSelectRef = useRef<typeof onShippingSelect | null>(onShippingSelect);

    // mantém ref atualizada para onShippingSelect (não altera identidade do calculateShipping)
    useEffect(() => {
        onShippingSelectRef.current = onShippingSelect;
    }, [onShippingSelect]);

    function handleCepChange(e: React.ChangeEvent<HTMLInputElement>) {
        let digits = e.target.value.replace(/\D/g, "").slice(0, 8);
        if (digits.length > 5) digits = digits.slice(0, 5) + "-" + digits.slice(5);
        setCep(digits);

        // se alterou o CEP após ter calculado, exige novo clique
        if (hasCalculatedOnce) setHasCalculatedOnce(false);
    }

    const fmt = (v: number) =>
        new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

    const cancelPendingFetch = () => {
        if (pendingController.current) {
            try {
                pendingController.current.abort();
            } catch (e) {
                // noop
            }
            pendingController.current = null;
        }
    };

    // calculateShipping: NÃO referencia onShippingSelect diretamente (usa ref)
    const calculateShipping = useCallback(
        async (silent = false) => {
            if (!product) return;

            const validCep = !!cep.match(/^\d{5}-\d{3}$/);
            if (!validCep) {
                if (!silent) toast.error("Informe um CEP válido (00000-000).");
                return;
            }

            cancelPendingFetch();
            const controller = new AbortController();
            pendingController.current = controller;

            setLoading(true);
            setShippingOptions([]);
            setSelectedShippingId(null);
            try {
                if (onShippingSelectRef.current) onShippingSelectRef.current(null);
            } catch {
                // noop
            }

            try {
                const item = {
                    quantity: quantity || 1,
                    weight: selectedVariant?.weight ?? product.weight ?? 0,
                    length: selectedVariant?.length ?? product.length ?? 0,
                    height: selectedVariant?.height ?? product.height ?? 0,
                    width: selectedVariant?.width ?? product.width ?? 0,
                };

                const res = await fetch(`${API_URL}/shipment/calculate`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        cepDestino: cep,
                        items: [item],
                    }),
                    signal: controller.signal,
                });

                pendingController.current = null;

                const data = await res.json();
                if (res.ok && Array.isArray(data.options)) {
                    setShippingOptions(data.options);
                    if (data.options.length) {
                        setSelectedShippingId(data.options[0].id);
                        try {
                            if (onShippingSelectRef.current) onShippingSelectRef.current(data.options[0]);
                        } catch {
                            // noop
                        }
                    } else {
                        if (!silent) toast.info("Nenhuma opção de frete disponível.");
                    }
                } else {
                    const message = data?.message || "Não foi possível calcular o frete.";
                    if (!silent) toast.error(message);
                }
            } catch (err: any) {
                if (err?.name === "AbortError") {
                    // fetch abortado, silencioso
                } else {
                    console.error("Erro ao calcular frete (produto):", err);
                    if (!silent) toast.error("Erro de rede ao calcular frete.");
                }
            } finally {
                setLoading(false);
            }
        },
        // NÃO colocar onShippingSelect nas deps; referenciamos via ref
        [cep, product, quantity, selectedVariant]
    );

    // clique do botão -> calcula imediatamente e habilita auto-recalcs
    const handleManualCalculate = async () => {
        if (autoTimer.current) {
            window.clearTimeout(autoTimer.current);
            autoTimer.current = null;
        }
        // cancela fetch pendente antes de novo cálculo
        cancelPendingFetch();
        await calculateShipping(false);
        setHasCalculatedOnce(true);
    };

    // auto-recalcula quando quantity/variant mudarem, mas SÓ se já houve cálculo manual (hasCalculatedOnce)
    useEffect(() => {
        if (!product) return;
        if (!hasCalculatedOnce) return;
        if (!cep.match(/^\d{5}-\d{3}$/)) return;

        if (autoTimer.current) {
            window.clearTimeout(autoTimer.current);
            autoTimer.current = null;
        }

        autoTimer.current = window.setTimeout(() => {
            calculateShipping(true); // silent
            autoTimer.current = null;
        }, debounceMs);

        return () => {
            if (autoTimer.current) {
                window.clearTimeout(autoTimer.current);
                autoTimer.current = null;
            }
        };
    }, [quantity, selectedVariant, cep, product, hasCalculatedOnce, debounceMs, calculateShipping]);

    // cleanup on unmount
    useEffect(() => {
        return () => {
            if (autoTimer.current) window.clearTimeout(autoTimer.current);
            cancelPendingFetch();
        };
    }, []);

    function handleSelect(id: string) {
        setSelectedShippingId(id);
        const opt = shippingOptions.find((o) => o.id === id) || null;
        try {
            if (onShippingSelectRef.current) onShippingSelectRef.current(opt);
        } catch {
            // noop
        }
    }

    return (
        <div className="bg-white p-4 rounded shadow space-y-3 text-black">
            <label className="block text-sm font-medium text-gray-700">
                Simular frete para este produto
            </label>

            <div className="flex space-x-2">
                <input
                    type="text"
                    value={cep}
                    onChange={handleCepChange}
                    placeholder="00000-000"
                    className="flex-1 border border-gray-300 rounded px-3 py-2"
                />
                <button
                    onClick={handleManualCalculate}
                    disabled={loading}
                    className="bg-gray-800 hover:bg-gray-900 text-white px-4 rounded disabled:opacity-50"
                >
                    {loading ? "Calculando…" : "Calcular"}
                </button>
            </div>

            <p className="text-xs text-gray-500">
                Atenção: consulta ao provedor de frete em tempo real.
            </p>

            {shippingOptions.length > 0 && (
                <div className="space-y-2 mt-2">
                    {shippingOptions.map((opt) => (
                        <>
                            {opt.price === null ?
                                null
                                :
                                <div key={opt.id} className="flex items-center justify-between">
                                    <label className="flex-1 cursor-pointer">
                                        <input
                                            type="radio"
                                            name={`shipping-${product?.id}`}
                                            value={opt.id}
                                            checked={selectedShippingId === opt.id}
                                            onChange={() => handleSelect(opt.id)}
                                            className="mr-2"
                                        />
                                        <span className="font-medium">{opt.name}</span>
                                    </label>
                                    <div className="text-right">
                                        <p className="font-semibold">{fmt(opt.price)}</p>
                                        <p className="text-xs text-gray-500">{opt.deliveryTime}</p>
                                    </div>
                                </div>
                            }
                        </>
                    ))}
                </div>
            )}

            {shippingOptions.length === 0 && !loading && (
                <p className="text-sm text-gray-500">
                    Nenhuma opção calculada. Clique em "Calcular" para obter cotações.
                </p>
            )}
        </div>
    );
}