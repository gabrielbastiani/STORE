'use client'

import React, { useEffect, useRef } from 'react'
import Image from 'next/image'
import type { CartItem, PromotionDetail, SkippedPromo } from './types'
import { currency } from './utils/paymentHelpers'
import { toast } from 'react-toastify'

type Props = {
    cartItems?: CartItem[]
    itemsTotal: number
    promotions: PromotionDetail[]
    freeGifts?: any[]
    productDiscount: number
    currentFrete: number
    shippingDiscount: number
    appliedCoupon: string | null
    couponInput: string
    setCouponInput: (s: string) => void
    applyCoupon: () => Promise<void>
    removeCoupon: () => void
    loadingPromo: boolean
    promoError?: string | null
    placingOrder: boolean
    handlePlaceOrder: () => Promise<void>
    cardInstallments?: number | null
    installmentOptions: Array<{ n: number; label: string; perInstallment: number; interestMonthly: number; interestApplied: boolean }>
    API_URL: string
    totalWithInstallments: number
    validatingCoupon: boolean
    skippedPromotions?: SkippedPromo[]
}

export default function OrderSummary({
    cartItems, itemsTotal, promotions, freeGifts, productDiscount, currentFrete, shippingDiscount,
    appliedCoupon, couponInput, setCouponInput, applyCoupon, removeCoupon, loadingPromo, promoError,
    placingOrder, handlePlaceOrder, cardInstallments, installmentOptions, API_URL, totalWithInstallments,
    validatingCoupon, skippedPromotions = []
}: Props) {

    const lastSkippedJsonRef = useRef<string | null>(null)
    useEffect(() => {
        const json = JSON.stringify(skippedPromotions || [])
        if (!json) return
        if (json === lastSkippedJsonRef.current) return
        lastSkippedJsonRef.current = json
        if (skippedPromotions && skippedPromotions.length > 0) {
            // build readable message
            const msgs = skippedPromotions.map(s => s.reason).filter(Boolean)
            const message = msgs.join('; ')
            // show a single consolidated toast (you may change to multiple toasts if preferred)
            toast.warn(`Algumas promoções foram omitidas: ${message}`, { autoClose: 8000 })
        }
    }, [skippedPromotions]);
    
    return (
        <aside className="bg-white rounded-2xl shadow p-6">
            <h3 className="text-lg font-semibold">Resumo do pedido</h3>

            <div className="mt-4 space-y-3 max-h-64 overflow-auto">
                {cartItems?.map((it) => (
                    <div key={it.id ?? `${it.product_id}-${it.variant_id ?? ''}`} className="flex items-center gap-3">
                        <div className="w-16 h-16 relative">
                            {(it.images && ((Array.isArray(it.images) && it.images[0]) || (!Array.isArray(it.images) && it.images))) ? (
                                <Image src={(Array.isArray(it.images) ? (it.images[0].startsWith('http') ? it.images[0] : `${API_URL}/files/${it.images[0]}`) : (it.images as string).startsWith('http') ? it.images as string : `${API_URL}/files/${it.images as string}`)} alt={it.name ?? ''} width={64} height={64} className="object-cover rounded" />
                            ) : (
                                <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center text-gray-400">sem imagem</div>
                            )}
                        </div>
                        <div className="flex-1">
                            <div className="font-medium">{it.name}</div>
                            <div className="text-sm text-gray-600">{it.quantity} x {currency(it.price ?? 0)}</div>
                        </div>
                        <div className="font-medium">{currency((it.price ?? 0) * (it.quantity ?? 0))}</div>
                    </div>
                ))}
            </div>

            <div className="mt-4 border-t pt-4 space-y-2">
                <div className="flex items-center gap-2">
                    {!appliedCoupon ? (
                        <>
                            <input value={couponInput} onChange={(e) => setCouponInput(e.target.value)} placeholder="Código do cupom" className="flex-1 border p-2 rounded" />
                            <button onClick={applyCoupon} disabled={!couponInput.trim() || validatingCoupon} className="px-3 py-2 bg-gray-800 text-white rounded disabled:opacity-60">
                                {validatingCoupon ? 'Validando…' : 'Aplicar'}
                            </button>
                        </>
                    ) : (
                        <div className="flex items-center justify-between w-full bg-orange-50 p-2 rounded">
                            <div>Cupom <strong>{appliedCoupon}</strong> aplicado</div>
                            <button onClick={removeCoupon} className="text-orange-600">Remover</button>
                        </div>
                    )}
                </div>

                {loadingPromo && <div className="text-sm text-gray-500">Aplicando promoções…</div>}
                {promoError && <div className="text-sm text-red-600">{promoError}</div>}

                {/* ---------- bloco informativo para skippedPromotions ---------- */}
                {skippedPromotions && skippedPromotions.length > 0 && (
                    <div className="bg-yellow-50 border-l-4 border-yellow-300 p-3 rounded mt-2">
                        <div className="font-medium text-sm text-yellow-800">Algumas promoções não foram aplicadas</div>
                        <ul className="mt-1 text-xs text-yellow-700 list-disc list-inside">
                            {skippedPromotions.map((s) => (
                                <li key={s.id}>{s.reason}</li>
                            ))}
                        </ul>
                    </div>
                )}

                {promotions.length > 0 && (
                    <div className="bg-gray-50 p-2 rounded">
                        <h4 className="font-medium text-sm">Promoções aplicadas</h4>
                        <ul className="text-sm list-disc list-inside">
                            {promotions.map((p) => (
                                <li key={p.id} className="flex justify-between">
                                    <div>{p.description ?? p.name}</div>
                                    <div className={p.type === 'shipping' ? 'text-orange-600' : 'text-green-600'}>-{currency(p.discount ?? 0)}</div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {freeGifts && freeGifts.length > 0 && (
                    <div className="bg-indigo-50 p-2 rounded">
                        <h4 className="font-medium text-sm">Brinde(s)</h4>
                        <ul className="text-sm list-disc list-inside">
                            {freeGifts.map((fg: any, idx: number) => (
                                <li key={`${fg.variantId ?? fg.productId}-${idx}`} className="flex justify-between">
                                    <div>
                                        {fg.isVariant ? (
                                            fg.sku ? (
                                                <span>{fg.quantity}× {fg.sku}</span>
                                            ) : fg.name ? (
                                                <span>{fg.quantity}× {fg.name} (variante)</span>
                                            ) : (
                                                <span>{fg.quantity}× (variante id: {fg.variantId})</span>
                                            )
                                        ) : (
                                            fg.name ? (
                                                <span>{fg.quantity}× {fg.name}</span>
                                            ) : (
                                                <span>{fg.quantity}× (id: {fg.productId})</span>
                                            )
                                        )}
                                    </div>
                                    <div className="text-green-600 text-right">
                                        <div className="font-medium">Grátis</div>
                                        {typeof fg.unitPrice === 'number' && fg.unitPrice !== null && (
                                            <div className="text-xs text-gray-500">Valor estimado: -{currency(fg.unitPrice * fg.quantity)}</div>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                <div className="flex justify-between text-sm text-gray-600"><span>Subtotal</span><span>{currency(itemsTotal)}</span></div>
                {productDiscount > 0 && <div className="flex justify-between text-green-600"><span>Desconto (produtos)</span><span>-{currency(productDiscount)}</span></div>}
                <div className="flex justify-between text-sm text-gray-600"><span>Frete</span><span>{currency(currentFrete)}</span></div>
                {shippingDiscount > 0 && <div className="flex justify-between text-orange-600"><span>Desconto (frete)</span><span>-{currency(shippingDiscount)}</span></div>}

                <div className="border-t pt-2 flex justify-between font-bold">
                    <span className="text-gray-700 text-lg">Total a pagar</span>
                    <span className="text-red-800 text-lg">{currency(totalWithInstallments)}</span>
                </div>

                <p className="text-xs text-gray-500">Exemplo de parcela selecionada: {cardInstallments}x — {installmentOptions.find(i => i.n === (cardInstallments ?? 1))?.label}</p>
            </div>

            <button disabled={placingOrder} onClick={handlePlaceOrder} className="mt-4 w-full bg-green-600 text-white py-3 rounded disabled:opacity-60">
                {placingOrder ? 'Finalizando...' : 'Concluir pedido'}
            </button>
        </aside>
    )
}