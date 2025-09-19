'use client'

import { useEffect, useState } from 'react'
import { setupAPIClient } from '@/services/api'
import { toast } from 'react-toastify'
import { maskCep } from '../utils/mask'
import type { AddressLocal } from '../types'

export default function useAddresses({ isAuthenticated, user }: { isAuthenticated?: boolean, user?: any }) {

    const [addresses, setAddresses] = useState<AddressLocal[]>([])
    const [selectedAddressId, setSelectedAddressId] = useState<string | undefined>(undefined)
    const [addressModalOpen, setAddressModalOpen] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [addressForm, setAddressForm] = useState<Partial<AddressLocal | any>>({
        recipient_name: user?.name ?? '',
        zipCode: '',
        street: '',
        neighborhood: '',
        city: '',
        state: '',
        number: '',
        complement: '',
        reference: '',
        country: 'Brasil',
    })
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

    useEffect(() => {
        let mounted = true
            ; (async () => {
                if (isAuthenticated && user) {
                    try {
                        const apiClient = setupAPIClient()
                        const resp = await apiClient.get<any>(`/customer/address/list?customer_id=${user.id}`)
                        if (!mounted) return
                        const list: any[] = resp.data || []
                        const norm = list.map((a) => ({
                            id: a.id,
                            recipient_name: a.recipient_name ?? a.name ?? '',
                            customer_id: a.customer_id ?? user.id,
                            zipCode: a.zipCode ?? a.zip_code ?? '',
                            street: a.street ?? '',
                            neighborhood: a.neighborhood ?? '',
                            city: a.city ?? '',
                            state: a.state ?? '',
                            number: a.number ?? '',
                            complement: a.complement ?? '',
                            reference: a.reference ?? '',
                            country: a.country ?? 'Brasil',
                            created_at: a.created_at,
                        })) as AddressLocal[]
                        setAddresses(norm)
                        if (norm.length && !selectedAddressId) setSelectedAddressId(norm[0].id)
                    } catch (err) {
                        console.warn('Erro ao carregar endereços', err)
                    }
                }
            })()

        return () => { mounted = false }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated, user?.id])

    function openCreateAddress() {
        setEditingId(null)
        setAddressForm({
            recipient_name: user?.name ?? '',
            zipCode: '',
            street: '',
            neighborhood: '',
            city: '',
            state: '',
            number: '',
            complement: '',
            reference: '',
            country: 'Brasil',
        })
        setAddressModalOpen(true)
    }

    function openEditAddress(a: AddressLocal) {
        setEditingId(a.id)
        setAddressForm({
            recipient_name: a.recipient_name ?? user?.name ?? '',
            zipCode: maskCep(a.zipCode ?? ''),
            street: a.street ?? '',
            neighborhood: a.neighborhood ?? '',
            city: a.city ?? '',
            state: a.state ?? '',
            number: a.number ?? '',
            complement: a.complement ?? '',
            reference: a.reference ?? '',
            country: a.country ?? 'Brasil',
        })
        setAddressModalOpen(true)
    }

    async function submitAddress() {
        try {
            const apiClient = setupAPIClient()
            const payload: any = {
                customer_id: user!.id,
                recipient_name: addressForm.recipient_name ?? user?.name ?? '',
                street: addressForm.street ?? '',
                neighborhood: addressForm.neighborhood ?? '',
                city: addressForm.city ?? '',
                state: addressForm.state ?? '',
                zipCode: (addressForm.zipCode ?? '').replace(/\D/g, ''),
                number: addressForm.number ?? '',
                complement: addressForm.complement ?? '',
                reference: addressForm.reference ?? '',
                country: addressForm.country ?? 'Brasil',
            }

            if (isAuthenticated && editingId) {
                const resp = await apiClient.put(`/customer/address/update`, { address_id: editingId, ...payload })
                const updated = resp.data
                setAddresses((prev) => prev.map((p) => (p.id === editingId ? {
                    id: updated.id,
                    recipient_name: updated.recipient_name ?? payload.recipient_name,
                    customer_id: updated.customer_id ?? payload.customer_id,
                    zipCode: updated.zipCode ?? payload.zipCode,
                    street: updated.street ?? payload.street,
                    neighborhood: updated.neighborhood ?? payload.neighborhood,
                    city: updated.city ?? payload.city,
                    state: updated.state ?? payload.state,
                    number: updated.number ?? payload.number,
                    complement: updated.complement ?? payload.complement,
                    reference: updated.reference ?? payload.reference,
                    country: updated.country ?? payload.country,
                    created_at: updated.created_at,
                } as AddressLocal : p)))
                toast.success('Endereço atualizado')
            } else if (isAuthenticated) {
                const resp = await apiClient.post(`/address/customer/create`, payload)
                const created = resp.data
                const createdNorm: AddressLocal = {
                    id: created.id,
                    recipient_name: created.recipient_name ?? payload.recipient_name,
                    customer_id: created.customer_id ?? payload.customer_id,
                    zipCode: created.zipCode ?? payload.zipCode,
                    street: created.street ?? payload.street,
                    neighborhood: created.neighborhood ?? payload.neighborhood,
                    city: created.city ?? payload.city,
                    state: created.state ?? payload.state,
                    number: created.number ?? payload.number,
                    complement: created.complement ?? payload.complement,
                    reference: created.reference ?? payload.reference,
                    country: created.country ?? payload.country,
                    created_at: created.created_at,
                }
                setAddresses((prev) => [createdNorm, ...prev])
                setSelectedAddressId(createdNorm.id)
                toast.success('Endereço cadastrado')
            } else {
                const pseudoId = `guest-${Date.now()}`
                const localAddr: AddressLocal = {
                    id: pseudoId,
                    recipient_name: payload.recipient_name,
                    zipCode: maskCep(payload.zipCode),
                    street: payload.street,
                    neighborhood: payload.neighborhood,
                    city: payload.city,
                    state: payload.state,
                    number: payload.number,
                    complement: payload.complement,
                    reference: payload.reference,
                    country: payload.country,
                    created_at: new Date().toISOString(),
                }
                setAddresses((prev) => [localAddr, ...prev])
                setSelectedAddressId(pseudoId)
                toast.success('Endereço salvo localmente')
            }

            setAddressModalOpen(false)
            setEditingId(null)
        } catch (err: any) {
            console.error('Erro ao salvar endereço', err)
            toast.error(err?.response?.data?.message ?? 'Erro ao salvar endereço')
        }
    }

    function requestRemoveAddress(id: string) { setDeleteTarget(id) }

    async function confirmDelete() {
        const id = deleteTarget
        if (!id) return

        // guest deletion (local only)
        if (id.startsWith('guest-')) {
            setAddresses((prev) => {
                const next = prev.filter((p) => p.id !== id)
                if (selectedAddressId === id) {
                    setSelectedAddressId(next[0]?.id)
                }
                return next
            })
            toast.success('Endereço removido')
            setDeleteTarget(null)
            return
        }

        const apiClient = setupAPIClient()

        try {
            await apiClient.delete(`/customer/address/delete?address_id=${id}`)
            setAddresses((prev) => {
                const next = prev.filter((p) => p.id !== id)
                if (selectedAddressId === id) {
                    setSelectedAddressId(next[0]?.id)
                }
                return next
            })
            toast.success('Endereço removido')
            setDeleteTarget(null)
            return
        } catch (error) {
            console.error(error)
            toast.error("Erro ao deletar o endereço.")
        }
    }

    function cancelDelete() { setDeleteTarget(null) }

    return {
        addresses,
        selectedAddressId,
        setSelectedAddressId,
        addressModalOpen,
        setAddressModalOpen,
        editingId,
        addressForm,
        setAddressForm,
        deleteTarget,
        openCreateAddress,
        openEditAddress,
        submitAddress,
        requestRemoveAddress,
        confirmDelete,
        cancelDelete,
    }
}