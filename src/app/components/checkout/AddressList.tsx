'use client'

import React from 'react'
import { AddressLocal } from './types'

type Props = {
    addresses: AddressLocal[]
    selectedAddressId?: string
    setSelectedAddressId: (id: string) => void
    openCreateAddress: () => void
    openEditAddress: (a: AddressLocal) => void
    requestRemoveAddress: (id: string) => void
    fetchShippingOptions: (addressId?: string) => Promise<void>
}

export default function AddressList({
    addresses, selectedAddressId, setSelectedAddressId,
    openCreateAddress, openEditAddress, requestRemoveAddress, fetchShippingOptions
}: Props) {
    return (
        <section className="bg-white rounded-2xl shadow p-6">
            <h2 className="text-xl font-semibold">Endereço de entrega</h2>

            <div className="mt-4 space-y-4">
                {addresses.length === 0 && (
                    <div className="p-4 border border-dashed rounded text-sm text-gray-600">Nenhum endereço salvo. Adicione um novo endereço.</div>
                )}

                {addresses.map((a) => (
                    <label key={a.id} className={`flex items-start gap-3 p-3 rounded border ${selectedAddressId === a.id ? 'border-orange-500 bg-orange-50' : 'border-gray-200'}`}>
                        <input type="radio" name="address" checked={selectedAddressId === a.id} onChange={() => { setSelectedAddressId(a.id); fetchShippingOptions(a.id) }} className="mt-1" />
                        <div className="flex-1">
                            <div className="font-medium">{a.street} {a.number && `, ${a.number}`}</div>
                            <div className="text-sm text-gray-600">{a.neighborhood ? `${a.neighborhood} — ` : ''}{a.city} / {a.state} — {a.zipCode}</div>
                            <div className="mt-2 flex gap-2">
                                <button type="button" className="text-sm underline" onClick={() => openEditAddress(a)}>Editar</button>
                                <button type="button" className="text-sm underline" onClick={() => requestRemoveAddress(a.id)}>Remover</button>
                            </div>
                        </div>
                    </label>
                ))}

                <div className="flex gap-3">
                    <button type="button" className="px-4 py-2 bg-orange-600 text-white rounded" onClick={() => openCreateAddress()}>Adicionar novo endereço</button>
                    <button type="button" className="px-4 py-2 border rounded" onClick={() => fetchShippingOptions()}>Calcular Frete</button>
                </div>
            </div>
        </section>
    )
}