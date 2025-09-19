// app/checkout/hooks/useShipping.ts
'use client'

import { useState } from 'react'
import { toast } from 'react-toastify'
import type { ShippingOption } from '../types'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

export default function useShipping({ cart, addresses, selectedAddressId }: { cart: any, addresses: any[], selectedAddressId?: string | undefined }) {
    const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([])
    const [selectedShippingId, setSelectedShippingId] = useState<string | undefined>(undefined)
    const [shippingLoading, setShippingLoading] = useState(false)

    async function fetchShippingOptions(addressId?: string | undefined) {
        if (!cart?.items || cart.items.length === 0) {
            toast.error('Erro no carrinho de compras.')
            return
        }

        // escolha do CEP: prefer param addressId -> fallback para selectedAddressId -> erro
        let cepToUse: string | undefined = undefined

        const resolvedId = addressId ?? selectedAddressId

        if (resolvedId && resolvedId.startsWith('guest-')) {
            const local = addresses.find((a) => a.id === resolvedId)
            cepToUse = local?.zipCode?.replace(/\D/g, '') ?? undefined
        } else if (resolvedId) {
            const backendAddr = addresses.find((a) => a.id === resolvedId)
            cepToUse = backendAddr?.zipCode?.replace(/\D/g, '') ?? undefined
        } else {
            // nenhuma id fornecida e selectedAddressId é indefinido -> tenta usar o primeiro endereço (ou nenhum)
            const first = addresses[0]
            cepToUse = first?.zipCode?.replace(/\D/g, '') ?? undefined
        }

        if (!cepToUse) {
            toast.error('Informe um CEP válido no endereço selecionado para calcular o frete.')
            return
        }

        setShippingLoading(true)
        try {
            const res = await fetch(`${API_URL}/shipment/calculate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cepDestino: cepToUse,
                    items: (cart.items || []).map((i: any) => ({
                        quantity: i.quantity,
                        weight: i.weight,
                        length: i.length,
                        height: i.height,
                        width: i.width,
                    })),
                }),
            })
            const data = await res.json()
            if (!res.ok) {
                toast.error('Não foi possível calcular o frete.')
                setShippingOptions([])
                return
            }

            const opts: ShippingOption[] = (data.options || []).map((o: any) => (({
                id: o.id ?? `${o.carrier ?? o.provider}-${o.service ?? o.name}`,
                name: o.name ?? (o.service ? `${o.carrier ?? o.provider} — ${o.service}` : undefined),
                provider: o.carrier ?? o.provider,
                service: o.service ?? o.name,
                price: Number(o.price ?? o.total ?? o.valor ?? 0),
                deliveryTime: o.deliveryTime ?? o.deadline ?? o.estimated_delivery_time ?? undefined,
                estimated_days: o.deadline ?? o.estimated_delivery_time ?? null,
                raw: o,
            } as ShippingOption)))

            setShippingOptions(opts)
            if (opts.length) setSelectedShippingId(opts[0].id)
        } catch (err) {
            console.error('Erro ao calcular frete', err)
            toast.error('Erro de rede ao calcular frete.')
            setShippingOptions([])
        } finally {
            setShippingLoading(false)
        }
    }

    return {
        shippingOptions,
        selectedShippingId,
        setSelectedShippingId,
        shippingLoading,
        fetchShippingOptions,
    }
}