'use client'

import React from 'react'
import { Dialog } from '@headlessui/react'
import type { CheckoutAddress } from './types'

type Props = {
    open: boolean
    setOpen: (b: boolean) => void
    addressForm: Partial<CheckoutAddress>
    setAddressForm: React.Dispatch<React.SetStateAction<Partial<CheckoutAddress>>>
    submitAddress: () => Promise<void>
    editingId?: string | null
    estadosBR: string[]
}

export default function AddressModal({ open, setOpen, addressForm, setAddressForm, submitAddress, editingId, estadosBR }: Props) {

    function maskCep(v: string) {
        const d = (v ?? '').replace(/\D/g, '').slice(0, 8)
        return d.replace(/(\d{5})(\d)/, '$1-$2')
    }

    async function handleCepBlur(rawCep?: string) {
        const only = (rawCep ?? '').replace(/\D/g, '')
        if (only.length !== 8) return
        try {
            const resp = await fetch(`https://viacep.com.br/ws/${only}/json/`)
            const json = await resp.json()
            if (!json || json.erro) return
            setAddressForm(prev => ({
                ...prev,
                zipCode: maskCep(only),
                street: json.logradouro || prev.street || '',
                neighborhood: json.bairro || prev.neighborhood || '',
                city: json.localidade || prev.city || '',
                state: json.uf || prev.state || '',
            }))
        } catch {
            // falhar silenciosamente — não bloquear o usuário
        }
    }

    return (
        <Dialog open={open} onClose={() => setOpen(false)} className="relative z-50 text-black">
            <div className="fixed inset-0 bg-black/30" aria-hidden />
            <div className="fixed inset-0 flex items-center justify-center p-4">
                <Dialog.Panel className="mx-auto max-w-lg bg-white p-6 rounded-lg">
                    <Dialog.Title className="text-lg font-semibold">{editingId ? 'Editar endereço' : 'Novo endereço'}</Dialog.Title>

                    <div className="mt-4 grid grid-cols-1 gap-3">
                        <input
                            placeholder="Nome do destinatário"
                            value={addressForm.recipient_name ?? ''}
                            onChange={(e) => setAddressForm(s => ({ ...s, recipient_name: e.target.value }))}
                            className="p-2 border rounded"
                        />

                        <input
                            placeholder="CEP"
                            value={addressForm.zipCode ?? ''}
                            onChange={(e) => setAddressForm(s => ({ ...s, zipCode: maskCep(e.target.value) }))}
                            onBlur={async () => { await handleCepBlur(addressForm.zipCode) }}
                            className="p-2 border rounded"
                        />

                        <input
                            placeholder="Rua"
                            value={addressForm.street ?? ''}
                            onChange={(e) => setAddressForm(s => ({ ...s, street: e.target.value }))}
                            className="p-2 border rounded"
                        />

                        <div className="grid grid-cols-2 gap-2">
                            <input
                                placeholder="Número"
                                value={addressForm.number ?? ''}
                                onChange={(e) => setAddressForm(s => ({ ...s, number: e.target.value }))}
                                className="p-2 border rounded"
                            />
                            <input
                                placeholder="Complemento"
                                value={addressForm.complement ?? ''}
                                onChange={(e) => setAddressForm(s => ({ ...s, complement: e.target.value }))}
                                className="p-2 border rounded"
                            />
                        </div>

                        <input
                            placeholder="Bairro"
                            value={addressForm.neighborhood ?? ''}
                            onChange={(e) => setAddressForm(s => ({ ...s, neighborhood: e.target.value }))}
                            className="p-2 border rounded"
                        />

                        <div className="grid grid-cols-2 gap-2">
                            <input
                                placeholder="Cidade"
                                value={addressForm.city ?? ''}
                                onChange={(e) => setAddressForm(s => ({ ...s, city: e.target.value }))}
                                className="p-2 border rounded"
                            />
                            <select
                                value={addressForm.state ?? ''}
                                onChange={(e) => setAddressForm(s => ({ ...s, state: e.target.value }))}
                                className="p-2 border rounded bg-white"
                            >
                                <option value="">Selecione a UF</option>
                                {estadosBR.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
                            </select>
                        </div>

                        <div className="mt-4 flex justify-end gap-2">
                            <button className="px-4 py-2 border rounded" onClick={() => setOpen(false)}>Cancelar</button>
                            <button className="px-4 py-2 bg-orange-600 text-white rounded" onClick={() => submitAddress()}>Salvar</button>
                        </div>
                    </div>
                </Dialog.Panel>
            </div>
        </Dialog>
    )
}