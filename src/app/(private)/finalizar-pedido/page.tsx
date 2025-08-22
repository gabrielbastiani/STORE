'use client'

import React, { useContext, useEffect, useMemo, useState } from 'react'
import { AuthContextStore } from '@/app/contexts/AuthContextStore'
import { useCart } from '@/app/contexts/CartContext'
import { Dialog } from '@headlessui/react'
import { api } from '@/services/apiClient'
import { useRouter } from 'next/navigation'
import type { Cart, CartItem as CartItemType, AddressProps } from 'Types/types'
import Image from 'next/image'

const API_URL = process.env.NEXT_PUBLIC_API_URL;

/**
 * Observações sobre tipos:
 * - importei CartItem do seu arquivo `Types/types` (nome: CartItem).
 * - as imagens podem ser `string | string[]`; aqui nós lemos com segurança ao renderizar.
 */

type AddressLocal = AddressProps & { id: string; created_at?: string }

type ShippingOption = {
    id: string
    provider: string
    service: string
    price: number
    estimated_days?: number | null
    raw?: any
}

type PaymentOption = {
    id: string
    provider: string
    method: string
    label: string
    description?: string
}

const currency = (v: number) =>
    v?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) ?? 'R$ 0,00'

export default function FinishOrderPage() {
    const router = useRouter()
    const { user, isAuthenticated } = useContext(AuthContextStore)
    const { cart, clearCart } = useCart()

    // Addresses (for logged users)
    const [addresses, setAddresses] = useState<AddressLocal[]>([])
    const [selectedAddressId, setSelectedAddressId] = useState<string | undefined>(undefined)
    const [addressModalOpen, setAddressModalOpen] = useState(false)
    const [editingAddress, setEditingAddress] = useState<AddressLocal | null>(null)
    const [addressForm, setAddressForm] = useState<Partial<AddressLocal>>({})

    // Guest customer (used when !isAuthenticated)
    const [guestCustomer, setGuestCustomer] = useState<{
        name?: string
        email?: string
        phone?: string
        cpf?: string
    }>({})

    // Shipping
    const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([])
    const [selectedShippingId, setSelectedShippingId] = useState<string | undefined>(undefined)
    const [shippingLoading, setShippingLoading] = useState(false)

    // Payments
    const [paymentOptions, setPaymentOptions] = useState<PaymentOption[]>([])
    const [selectedPaymentId, setSelectedPaymentId] = useState<string | undefined>(undefined)

    // Order & payment UI
    const [placingOrder, setPlacingOrder] = useState(false)
    const [paymentModalOpen, setPaymentModalOpen] = useState(false)
    const [lastPaymentData, setLastPaymentData] = useState<any>(null)

    // Totals
    const itemsTotal = useMemo(() => {
        if (!cart?.items) return 0
        return cart.items.reduce((s, it) => s + (it.price ?? 0) * (it.quantity ?? 0), 0)
    }, [cart])

    const shippingCost = useMemo(() => {
        const s = shippingOptions.find((o) => o.id === selectedShippingId)
        return s?.price ?? 0
    }, [shippingOptions, selectedShippingId])

    const grandTotal = itemsTotal + shippingCost

    // ---------------- Load initial data ----------------
    useEffect(() => {
        if (!isAuthenticated) {
            setAddresses([])
            setSelectedAddressId(undefined)
            return
        }

        let mounted = true
            ; (async () => {
                try {
                    const resp = await api.get(`/customer/address/list?customer_id=${user?.id}`)
                    if (!mounted) return
                    const data = resp.data as AddressLocal[] ?? []
                    setAddresses(data)
                    if (data.length && !selectedAddressId) setSelectedAddressId(data[0].id)
                } catch (err) {
                    console.warn('Não foi possível carregar endereços', err)
                }
            })()
        return () => { mounted = false }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated])

    useEffect(() => {
        ; (async () => {
            try {
                const resp = await api.get('/checkout/payments/options')
                const opts = resp.data as PaymentOption[] ?? []
                setPaymentOptions(opts)
                if (opts.length && !selectedPaymentId) setSelectedPaymentId(opts[0].id)
            } catch (err) {
                console.warn('Erro ao carregar formas de pagamento, usando fallback', err)
                setPaymentOptions([
                    { id: 'asaas-pix', provider: 'Asaas', method: 'PIX', label: 'PIX', description: 'Pague com PIX' },
                    { id: 'asaas-boleto', provider: 'Asaas', method: 'BOLETO', label: 'Boleto', description: 'Pague com boleto' },
                    { id: 'asaas-card', provider: 'Asaas', method: 'CARD', label: 'Cartão', description: 'Cartão de crédito' },
                ])
            }
        })()
    }, [])

    // ---------------- Address handlers ----------------
    function openCreateAddress() {
        setEditingAddress(null)
        setAddressForm({})
        setAddressModalOpen(true)
    }

    function openEditAddress(a: AddressLocal) {
        setEditingAddress(a)
        setAddressForm(a)
        setAddressModalOpen(true)
    }

    async function submitAddress() {
        try {
            // For guest we still allow local-only addresses (not saved to backend),
            // but if authenticated, we call backend to persist.
            if (isAuthenticated && editingAddress) {
                const resp = await api.put(`/checkout/addresses/${editingAddress.id}`, addressForm)
                setAddresses((prev) => prev.map((p) => (p.id === editingAddress.id ? resp.data : p)))
            } else if (isAuthenticated) {
                const resp = await api.post('/address/customer/create', addressForm)
                setAddresses((prev) => [resp.data, ...prev])
                setSelectedAddressId(resp.data.id)
            } else {
                // guest - keep addressForm locally and set as selected (not persisted)
                // generate a pseudo-id so we can keep it in local array
                const pseudoId = `guest-${Date.now()}`
                const localAddr: AddressLocal = { id: pseudoId, created_at: new Date().toISOString(), ...addressForm } as AddressLocal
                setAddresses((prev) => [localAddr, ...prev])
                setSelectedAddressId(pseudoId)
            }
            setAddressModalOpen(false)
        } catch (err: any) {
            console.error('Erro ao salvar endereço', err)
            alert(err?.response?.data?.message ?? 'Erro ao salvar endereço')
        }
    }

    async function deleteAddress(id: string) {
        if (!confirm('Remover este endereço?')) return
        try {
            if (id.startsWith('guest-')) {
                setAddresses((prev) => prev.filter((p) => p.id !== id))
                if (selectedAddressId === id) setSelectedAddressId(addresses[0]?.id)
                return
            }
            await api.delete(`/checkout/addresses/${id}`)
            setAddresses((prev) => prev.filter((p) => p.id !== id))
            if (selectedAddressId === id) setSelectedAddressId(addresses[0]?.id)
        } catch (err) {
            console.error('Erro ao remover endereço', err)
            alert('Não foi possível remover o endereço.')
        }
    }

    // ---------------- Shipping ----------------
    async function fetchShippingOptions(addressId?: string | undefined) {
        // For guest: if selected address is a guest-local address, we send the full address object to backend
        if (!cart?.items || cart.items.length === 0) {
            alert('Carrinho vazio.')
            return
        }

        setShippingLoading(true)
        try {
            const itemsForApi = (cart.items || []).map((it: CartItemType) => ({
                product_id: it.product_id,
                price: it.price,
                quantity: it.quantity,
                weight: it.weight ?? 0.1,
                length: it.length ?? 10,
                height: it.height ?? 2,
                width: it.width ?? 10,
                variant_id: it.variant_id ?? undefined,
            }))

            // If guest and address is local (id startsWith 'guest-'), find that address and send as `address` field
            const isGuestLocalAddress = !!addressId && addressId.startsWith('guest-')
            let payload: any = { items: itemsForApi }

            if (isGuestLocalAddress) {
                const localAddress = addresses.find((a) => a.id === addressId)
                if (!localAddress) throw new Error('Endereço local inválido')
                payload.address = {
                    street: localAddress.street,
                    number: localAddress.number,
                    neighborhood: localAddress.neighborhood,
                    city: localAddress.city,
                    state: localAddress.state,
                    zipCode: localAddress.zipCode,
                    country: localAddress.country,
                    complement: localAddress.complement,
                }
            } else {
                payload.addressId = addressId ?? selectedAddressId
            }

            const resp = await api.post('/checkout/shipping', payload)
            const opts = resp.data?.options ?? []
            setShippingOptions(opts)
            if (opts.length) setSelectedShippingId(opts[0].id)
        } catch (err: any) {
            console.error('Erro ao calcular frete', err)
            setShippingOptions([])
            alert(err?.response?.data?.message ?? 'Erro ao calcular frete.')
        } finally {
            setShippingLoading(false)
        }
    }

    // ---------------- Place order ----------------
    async function handlePlaceOrder() {
        // Validation
        if (!cart?.items || cart.items.length === 0) {
            alert('Carrinho vazio.')
            return
        }
        if (!selectedShippingId) {
            alert('Escolha uma opção de envio.')
            return
        }
        if (!selectedPaymentId) {
            alert('Escolha uma forma de pagamento.')
            return
        }

        // If not authenticated, require guest customer basic info
        if (!isAuthenticated) {
            if (!guestCustomer.name || !guestCustomer.email || !guestCustomer.phone) {
                alert('Preencha nome, e-mail e telefone para prosseguir como visitante.')
                return
            }
            if (!selectedAddressId) {
                alert('Escolha ou adicione um endereço de entrega.')
                return
            }
        } else {
            if (!selectedAddressId) {
                alert('Escolha um endereço de entrega.')
                return
            }
        }

        setPlacingOrder(true)
        try {
            const itemsForApi = (cart.items || []).map((it: CartItemType) => ({
                product_id: it.product_id,
                price: it.price,
                quantity: it.quantity,
                weight: it.weight ?? 0.1,
                length: it.length ?? 10,
                height: it.height ?? 2,
                width: it.width ?? 10,
                variant_id: it.variant_id ?? undefined,
            }))

            // Build payload: for authenticated users keep addressId; for guests send guestCustomer + address object
            let payload: any = {
                shippingId: selectedShippingId,
                paymentId: selectedPaymentId,
                items: itemsForApi,
                customerNote: '',
            }

            if (isAuthenticated) {
                payload.addressId = selectedAddressId
            } else {
                // guest
                // if selectedAddressId is a guest-local address, find it and attach as 'address'
                if (selectedAddressId?.startsWith('guest-')) {
                    const localAddress = addresses.find((a) => a.id === selectedAddressId)
                    if (!localAddress) throw new Error('Endereço inválido')
                    payload.address = {
                        street: localAddress.street,
                        number: localAddress.number,
                        neighborhood: localAddress.neighborhood,
                        city: localAddress.city,
                        state: localAddress.state,
                        zipCode: localAddress.zipCode,
                        country: localAddress.country,
                        complement: localAddress.complement,
                        reference: localAddress.reference,
                    }
                } else {
                    // if guest used a saved address fetched from backend (possible if they previously logged), send addressId
                    if (selectedAddressId) payload.addressId = selectedAddressId
                }
                payload.guestCustomer = guestCustomer
            }

            const resp = await api.post('/checkout/order', payload)
            const data = resp.data ?? {}

            // backend may return paymentRedirectUrl (external checkout), or paymentData object (pix/boleto), or simple success with orderId
            if (data.paymentRedirectUrl) {
                window.location.href = data.paymentRedirectUrl
                return
            }

            if (data.paymentData) {
                setLastPaymentData(data.paymentData)
                setPaymentModalOpen(true)
                // we clear cart and redirect to success page (the page can also read orderId / payment info)
                clearCart()
                router.push(`/order/success/${data.orderId}`)
                return
            }

            // default: success
            clearCart()
            router.push(`/order/success/${data.orderId}`)
        } catch (err: any) {
            console.error('Erro ao finalizar pedido', err)
            alert(err?.response?.data?.message ?? 'Não foi possível finalizar o pedido.')
        } finally {
            setPlacingOrder(false)
        }
    }

    // ---------------- Payment helpers (modal buttons) ----------------
    async function copyToClipboard(text?: string) {
        if (!text) return
        try {
            await navigator.clipboard.writeText(text)
            alert('Copiado para a área de transferência')
        } catch {
            alert('Não foi possível copiar')
        }
    }

    function openLink(url?: string) {
        if (!url) return
        window.open(url, '_blank')
    }

    // ---------------- UI ----------------
    return (
        <div className="container mx-auto px-4 py-8 text-black">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {/* CUSTOMER / GUEST FORM */}
                    {!isAuthenticated && (
                        <section className="bg-white rounded-2xl shadow p-6">
                            <h2 className="text-xl font-semibold">Finalizar como visitante</h2>
                            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                                <input
                                    placeholder="Nome completo"
                                    value={guestCustomer.name ?? ''}
                                    onChange={(e) => setGuestCustomer((s) => ({ ...s, name: e.target.value }))}
                                    className="p-2 border rounded"
                                />
                                <input
                                    placeholder="E-mail"
                                    value={guestCustomer.email ?? ''}
                                    onChange={(e) => setGuestCustomer((s) => ({ ...s, email: e.target.value }))}
                                    className="p-2 border rounded"
                                />
                                <input
                                    placeholder="Telefone"
                                    value={guestCustomer.phone ?? ''}
                                    onChange={(e) => setGuestCustomer((s) => ({ ...s, phone: e.target.value }))}
                                    className="p-2 border rounded"
                                />
                            </div>
                            <div className="mt-2 text-sm text-gray-600">Como visitante, seu pedido será criado sem conta. Você receberá informações de pagamento por e-mail (se informado).</div>
                        </section>
                    )}

                    {/* ADDRESS */}
                    <section className="bg-white rounded-2xl shadow p-6">
                        <h2 className="text-xl font-semibold">Endereço de entrega</h2>

                        <div className="mt-4 space-y-4">
                            {addresses.length === 0 && (
                                <div className="p-4 border border-dashed rounded text-sm text-gray-600">Nenhum endereço salvo. Adicione um novo endereço.</div>
                            )}

                            {addresses.map((a) => (
                                <label
                                    key={a.id}
                                    className={`flex items-start gap-3 p-3 rounded border ${selectedAddressId === a.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'}`}
                                >
                                    <input
                                        type="radio"
                                        name="address"
                                        checked={selectedAddressId === a.id}
                                        onChange={() => { setSelectedAddressId(a.id); fetchShippingOptions(a.id) }}
                                        className="mt-1"
                                    />
                                    <div className="flex-1">
                                        <div className="font-medium">{a.street} {a.number && `, ${a.number}`}</div>
                                        <div className="text-sm text-gray-600">{a.neighborhood ? `${a.neighborhood} — ` : ''}{a.city} / {a.state} — {a.zipCode}</div>
                                        <div className="mt-2 flex gap-2">
                                            {/* allow editing only if address came from backend (id not starting with guest-) */}
                                            <button type="button" className="text-sm underline" onClick={() => openEditAddress(a)}>Editar</button>
                                            <button type="button" className="text-sm underline" onClick={() => deleteAddress(a.id)}>Remover</button>
                                        </div>
                                    </div>
                                </label>
                            ))}

                            <div className="flex gap-3">
                                <button type="button" className="px-4 py-2 bg-indigo-600 text-white rounded" onClick={() => openCreateAddress()}>Adicionar novo endereço</button>
                                <button type="button" className="px-4 py-2 border rounded" onClick={() => fetchShippingOptions(selectedAddressId)}>Calcular Frete</button>
                            </div>
                        </div>
                    </section>

                    {/* SHIPPING */}
                    <section className="bg-white rounded-2xl shadow p-6">
                        <h2 className="text-xl font-semibold">Opções de envio</h2>
                        {shippingLoading && <div className="mt-4">Calculando opções de frete...</div>}
                        {!shippingLoading && shippingOptions.length === 0 && <div className="mt-4 text-sm text-gray-600">Nenhuma opção encontrada. Calcule o frete.</div>}

                        <div className="mt-4 space-y-3">
                            {shippingOptions.map((s) => (
                                <label key={s.id} className={`flex items-center justify-between gap-3 p-3 rounded border ${selectedShippingId === s.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'}`}>
                                    <div>
                                        <div className="font-medium">{s.provider} — {s.service}</div>
                                        <div className="text-sm text-gray-600">Prazo estimado: {s.estimated_days ? `${s.estimated_days} dias` : '—'}</div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="font-medium">{currency(s.price)}</div>
                                        <input name="shipping" type="radio" checked={selectedShippingId === s.id} onChange={() => setSelectedShippingId(s.id)} />
                                    </div>
                                </label>
                            ))}
                        </div>
                    </section>

                    {/* PAYMENT */}
                    <section className="bg-white rounded-2xl shadow p-6">
                        <h2 className="text-xl font-semibold">Pagamento</h2>
                        <div className="mt-4 space-y-3">
                            {paymentOptions.map((p) => (
                                <label key={p.id} className={`flex items-center justify-between gap-3 p-3 rounded border ${selectedPaymentId === p.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'}`}>
                                    <div>
                                        <div className="font-medium">{p.label}</div>
                                        <div className="text-sm text-gray-600">{p.description}</div>
                                    </div>
                                    <div>
                                        <input name="payment" type="radio" checked={selectedPaymentId === p.id} onChange={() => setSelectedPaymentId(p.id)} />
                                    </div>
                                </label>
                            ))}
                        </div>
                    </section>
                </div>

                {/* ORDER SUMMARY */}
                <aside className="bg-white rounded-2xl shadow p-6">
                    <h3 className="text-lg font-semibold">Resumo do pedido</h3>

                    <div className="mt-4 space-y-3 max-h-64 overflow-auto">
                        {cart?.items?.map((it) => (
                            <div key={it.id} className="flex items-center gap-3">
                                <Image src={`${API_URL}/files/${Array.isArray(it.images) ? it.images[0] ?? '/placeholder.png' : (it.images ?? '/placeholder.png')}`} alt={it.name} width={16} height={16} className="w-16 h-16 object-cover rounded" />
                                <div className="flex-1">
                                    <div className="font-medium">{it.name}</div>
                                    <div className="text-sm text-gray-600">{it.quantity} x {currency(it.price)}</div>
                                </div>
                                <div className="font-medium">{currency((it.price ?? 0) * (it.quantity ?? 0))}</div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-4 border-t pt-4 space-y-2">
                        <div className="flex justify-between text-sm text-gray-600"><span>Subtotal</span><span>{currency(itemsTotal)}</span></div>
                        <div className="flex justify-between text-sm text-gray-600"><span>Frete</span><span>{currency(shippingCost)}</span></div>
                        <div className="flex justify-between font-semibold text-lg"><span>Total</span><span>{currency(grandTotal)}</span></div>
                    </div>

                    <button disabled={placingOrder} onClick={handlePlaceOrder} className="mt-6 w-full bg-green-600 text-white py-3 rounded disabled:opacity-60">
                        {placingOrder ? 'Finalizando...' : 'Concluir pedido'}
                    </button>
                </aside>
            </div>

            {/* Address Modal */}
            <Dialog open={addressModalOpen} onClose={() => setAddressModalOpen(false)} className="relative z-50 text-black">
                <div className="fixed inset-0 bg-black/30" aria-hidden />
                <div className="fixed inset-0 flex items-center justify-center p-4">
                    <Dialog.Panel className="mx-auto max-w-lg bg-white p-6 rounded-lg">
                        <Dialog.Title className="text-lg font-semibold">{editingAddress ? 'Editar endereço' : 'Novo endereço'}</Dialog.Title>

                        <div className="mt-4 grid grid-cols-1 gap-3">
                            <input placeholder="CEP" value={addressForm.zipCode ?? ''} onChange={(e) => setAddressForm((s) => ({ ...s, zipCode: e.target.value }))} className="p-2 border rounded" />
                            <input placeholder="Rua" value={addressForm.street ?? ''} onChange={(e) => setAddressForm((s) => ({ ...s, street: e.target.value }))} className="p-2 border rounded" />
                            <div className="grid grid-cols-2 gap-2">
                                <input placeholder="Número" value={addressForm.number ?? ''} onChange={(e) => setAddressForm((s) => ({ ...s, number: e.target.value }))} className="p-2 border rounded" />
                                <input placeholder="Complemento" value={addressForm.complement ?? ''} onChange={(e) => setAddressForm((s) => ({ ...s, complement: e.target.value }))} className="p-2 border rounded" />
                            </div>
                            <input placeholder="Bairro" value={addressForm.neighborhood ?? ''} onChange={(e) => setAddressForm((s) => ({ ...s, neighborhood: e.target.value }))} className="p-2 border rounded" />
                            <div className="grid grid-cols-2 gap-2">
                                <input placeholder="Cidade" value={addressForm.city ?? ''} onChange={(e) => setAddressForm((s) => ({ ...s, city: e.target.value }))} className="p-2 border rounded" />
                                <input placeholder="Estado" value={addressForm.state ?? ''} onChange={(e) => setAddressForm((s) => ({ ...s, state: e.target.value }))} className="p-2 border rounded" />
                            </div>

                            <div className="mt-4 flex justify-end gap-2">
                                <button className="px-4 py-2 border rounded" onClick={() => setAddressModalOpen(false)}>Cancelar</button>
                                <button className="px-4 py-2 bg-indigo-600 text-white rounded" onClick={() => submitAddress()}>Salvar</button>
                            </div>
                        </div>
                    </Dialog.Panel>
                </div>
            </Dialog>

            {/* Payment Modal */}
            <Dialog open={paymentModalOpen} onClose={() => setPaymentModalOpen(false)} className="relative z-50">
                <div className="fixed inset-0 bg-black/30" aria-hidden />
                <div className="fixed inset-0 flex items-center justify-center p-4">
                    <Dialog.Panel className="mx-auto max-w-lg bg-white p-6 rounded-lg">
                        <Dialog.Title className="text-lg font-semibold">Detalhes de pagamento</Dialog.Title>

                        <div className="mt-4 space-y-4 text-sm">
                            {lastPaymentData?.boleto_url && (
                                <div className="space-y-2">
                                    <div className="font-medium">Boleto</div>
                                    <div className="break-words">{lastPaymentData.boleto_url}</div>
                                    {lastPaymentData.boleto_barcode && <div>Código de barras: <strong>{lastPaymentData.boleto_barcode}</strong></div>}
                                    <div className="flex gap-2">
                                        <button className="px-3 py-1 border rounded" onClick={() => copyToClipboard(lastPaymentData.boleto_barcode)}>Copiar código de barras</button>
                                        <button className="px-3 py-1 bg-indigo-600 text-white rounded" onClick={() => openLink(lastPaymentData.boleto_url)}>Abrir boleto</button>
                                        <a className="px-3 py-1 border rounded" href={lastPaymentData.boleto_url} target="_blank" rel="noreferrer" download>Baixar boleto</a>
                                    </div>
                                </div>
                            )}

                            {lastPaymentData?.pix_qr && (
                                <div className="space-y-2">
                                    <div className="font-medium">PIX</div>
                                    {typeof lastPaymentData.pix_qr === 'string' && lastPaymentData.pix_qr.startsWith('data:image') ? (
                                        <img src={lastPaymentData.pix_qr} alt="PIX QR" className="w-48 h-48 object-contain mt-2" />
                                    ) : (
                                        <pre className="bg-gray-100 p-2 rounded text-xs break-words mt-2">{lastPaymentData.pix_qr}</pre>
                                    )}
                                    <div className="flex gap-2">
                                        <button className="px-3 py-1 border rounded" onClick={() => copyToClipboard(lastPaymentData.pix_qr)}>Copiar QR / Payload</button>
                                        {lastPaymentData.pix_qr_url && <button className="px-3 py-1 bg-indigo-600 text-white rounded" onClick={() => openLink(lastPaymentData.pix_qr_url)}>Abrir QR (link)</button>}
                                    </div>
                                    {lastPaymentData.pix_expiration && <div className="text-xs text-gray-600">Expira em: {new Date(lastPaymentData.pix_expiration).toLocaleString()}</div>}
                                </div>
                            )}
                        </div>

                        <div className="mt-4 flex justify-end gap-2">
                            <button className="px-4 py-2 border rounded" onClick={() => setPaymentModalOpen(false)}>Fechar</button>
                        </div>
                    </Dialog.Panel>
                </div>
            </Dialog>
        </div>
    )
}