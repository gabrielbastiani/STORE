'use client'

import React from 'react'
import type { ShippingOption } from './types'
import { currency } from './utils/paymentHelpers'

type Props = {
    shippingOptions: ShippingOption[]
    selectedShippingId?: string
    setSelectedShippingId: (id: string) => void
    shippingLoading: boolean
}

export default function ShippingOptions({ shippingOptions, selectedShippingId, setSelectedShippingId, shippingLoading }: Props) {
    return (
        <section className="bg-white rounded-2xl shadow p-6">
            <h2 className="text-xl font-semibold">Opções de envio</h2>
            {shippingLoading && <div className="mt-4">Calculando opções de frete...</div>}
            {!shippingLoading && shippingOptions.length === 0 && <div className="mt-4 text-sm text-gray-600">Nenhuma opção encontrada. Calcule o frete.</div>}

            <div className="mt-4 space-y-3">
                {shippingOptions.map((s) => {
                    const prazo = s.deliveryTime ?? (s.estimated_days ? `${s.estimated_days} dias` : '—')
                    const label = s.name ?? `${s.provider ?? ''} — ${s.service ?? ''}`
                    console.log(s.price)
                    return (
                        <>
                            {s.price === 0 ?
                                null
                                :
                                <label key={s.id} className={`flex items-center justify-between gap-3 p-3 rounded border ${selectedShippingId === s.id ? 'border-orange-500 bg-orange-50' : 'border-gray-200'}`}>
                                    <div>
                                        <div className="font-medium">{label}</div>
                                        <div className="text-sm text-gray-600">Prazo estimado: {prazo}</div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="font-medium">{currency(s.price)}</div>
                                        <input name="shipping" type="radio" checked={selectedShippingId === s.id} onChange={() => setSelectedShippingId(s.id)} />
                                    </div>
                                </label>
                            }
                        </>
                    )
                })}
            </div>
        </section>
    )
}