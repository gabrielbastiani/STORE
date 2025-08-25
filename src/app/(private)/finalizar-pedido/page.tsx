'use client'

import React, { useContext, useEffect, useMemo, useState } from 'react'
import { AuthContextStore } from '@/app/contexts/AuthContextStore'
import { useCart } from '@/app/contexts/CartContext'
import { Dialog } from '@headlessui/react'
import { api } from '@/services/apiClient'
import { setupAPIClient } from '@/services/api'
import { useRouter } from 'next/navigation'
import type { CartItem as CartItemType } from 'Types/types'
import Image from 'next/image'
import { toast } from 'react-toastify'
import axios from 'axios'
import { usePromotions, PromotionDetail } from '@/app/hooks/usePromotions'
import { useTheme } from '@/app/contexts/ThemeContext'
import { NavbarCheckout } from '@/app/components/navbar/navbarCheckout'
import { FooterCheckout } from '@/app/components/footer/footerCheckout'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

const maskCep = (v: string) => {
    const d = (v ?? '').replace(/\D/g, '').slice(0, 8)
    return d.replace(/(\d{5})(\d)/, '$1-$2')
}

const estadosBR = [
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
    "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
    "RS", "RO", "RR", "SC", "SP", "SE", "TO"
]

interface CheckoutAddress {
    id?: string
    customer_id?: string
    recipient_name?: string
    zipCode?: string
    street?: string
    neighborhood?: string
    city?: string
    state?: string
    number?: string
    complement?: string
    reference?: string
    country?: string
    created_at?: string
}

type AddressLocal = Required<Pick<CheckoutAddress, 'zipCode' | 'street' | 'neighborhood' | 'city' | 'state'>> &
    Partial<Omit<CheckoutAddress, 'zipCode' | 'street' | 'neighborhood' | 'city' | 'state'>> & { id: string }

type ShippingOption = {
    id: string
    name?: string
    provider?: string
    service?: string
    price: number
    deliveryTime?: string
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
    const { colors } = useTheme();
    const { user, isAuthenticated } = useContext(AuthContextStore)
    const { cart, clearCart } = useCart()

    // addresses
    const [addresses, setAddresses] = useState<AddressLocal[]>([])
    const [selectedAddressId, setSelectedAddressId] = useState<string | undefined>(undefined)
    const [addressModalOpen, setAddressModalOpen] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)

    const [addressForm, setAddressForm] = useState<Partial<CheckoutAddress>>({
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

    // confirmation delete modal
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

    // guest customer
    const [guestCustomer, setGuestCustomer] = useState<{ name?: string; email?: string; phone?: string; cpf?: string }>({})

    // shipping
    const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([])
    const [selectedShippingId, setSelectedShippingId] = useState<string | undefined>(undefined)
    const [shippingLoading, setShippingLoading] = useState(false)

    // payments
    const [paymentOptions, setPaymentOptions] = useState<PaymentOption[]>([])
    const [selectedPaymentId, setSelectedPaymentId] = useState<string | undefined>(undefined)

    // coupons/promotions
    const [couponInput, setCouponInput] = useState('')
    const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null)
    const [validatingCoupon, setValidatingCoupon] = useState(false)

    // order UI
    const [placingOrder, setPlacingOrder] = useState(false)
    const [paymentModalOpen, setPaymentModalOpen] = useState(false)
    const [lastPaymentData, setLastPaymentData] = useState<any>(null)

    // totals
    const itemsTotal = useMemo(() => {
        if (!cart?.items) return 0
        return cart.items.reduce((s, it) => s + (it.price ?? 0) * (it.quantity ?? 0), 0)
    }, [cart])

    const selectedAddress = useMemo(() => addresses.find((a) => a.id === selectedAddressId), [addresses, selectedAddressId])
    const cepFromSelectedAddress = selectedAddress?.zipCode ?? ''

    const isFirstPurchase = false
    const currentFrete = useMemo(() => {
        const s = shippingOptions.find((o) => o.id === selectedShippingId)
        return s?.price ?? 0
    }, [shippingOptions, selectedShippingId])

    const {
        discountTotal,
        promotions,
        loading: loadingPromo,
        error: promoError,
    } = usePromotions(cepFromSelectedAddress ?? '', appliedCoupon, currentFrete, isFirstPurchase)

    const shippingDiscount = promotions?.filter((p) => p.type === 'shipping').reduce((s, p) => s + (p.discount ?? 0), 0) ?? 0
    const productDiscount = (discountTotal ?? 0) - shippingDiscount
    const payableTotal = (itemsTotal ?? 0) - (productDiscount ?? 0) + (currentFrete - (shippingDiscount ?? 0))

    // load addresses
    useEffect(() => {
        if (!isAuthenticated || !user) {
            setAddresses([])
            setSelectedAddressId(undefined)
            return
        }
        let mounted = true
            ; (async () => {
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
            })()
        return () => { mounted = false }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated, user])

    // load payments
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

    const handleCepBlur = async () => {
        const raw = (addressForm.zipCode ?? '').replace(/\D/g, '')
        if (raw.length !== 8) return
        try {
            const resp = await fetch(`https://viacep.com.br/ws/${raw}/json/`)
            const json = await resp.json()
            if (!json.erro) {
                setAddressForm((f) => ({
                    ...f,
                    street: json.logradouro || f.street || '',
                    neighborhood: json.bairro || f.neighborhood || '',
                    city: json.localidade || f.city || '',
                    state: json.uf || f.state || '',
                }))
            }
        } catch {
            // ignore
        }
    }

    // submit address (create/update)
    async function submitAddress() {
        try {
            const apiClient = setupAPIClient()
            const payload = {
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

    // set delete target -> will open confirmation modal
    function requestRemoveAddress(id: string) {
        setDeleteTarget(id)
    }

    async function confirmDelete() {
        const id = deleteTarget
        if (!id) return
        try {
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
        } catch (err) {
            console.error('Erro ao remover endereço', err)
            toast.error('Não foi possível remover o endereço.')
            setDeleteTarget(null)
        }
    }

    function cancelDelete() {
        setDeleteTarget(null)
    }

    // shipping calculation
    async function fetchShippingOptions(addressId?: string | undefined) {
        if (!cart?.items || cart.items.length === 0) {
            toast.error('Erro no carrinho de compras.')
            return
        }

        let cepToUse: string | undefined = undefined
        if (addressId && addressId.startsWith('guest-')) {
            const local = addresses.find((a) => a.id === addressId)
            cepToUse = local?.zipCode?.replace(/\D/g, '') ?? undefined
        } else if (addressId) {
            const backendAddr = addresses.find((a) => a.id === addressId)
            cepToUse = backendAddr?.zipCode?.replace(/\D/g, '') ?? undefined
        } else {
            cepToUse = selectedAddress?.zipCode?.replace(/\D/g, '') ?? undefined
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
                    items: (cart.items || []).map((i) => ({
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

            const opts: ShippingOption[] = (data.options || []).map((o: any) => ({
                id: o.id ?? `${o.carrier ?? o.provider}-${o.service ?? o.name}`,
                name: o.name ?? (o.service ? `${o.carrier ?? o.provider} — ${o.service}` : undefined),
                provider: o.carrier ?? o.provider,
                service: o.service ?? o.name,
                price: Number(o.price ?? o.total ?? o.valor ?? 0),
                deliveryTime: o.deliveryTime ?? o.deadline ?? o.estimated_delivery_time ?? undefined,
                estimated_days: o.deadline ?? o.estimated_delivery_time ?? null,
                raw: o,
            }))

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

    // coupon logic
    async function applyCoupon() {
        const code = couponInput.trim()
        if (!code) return
        setValidatingCoupon(true)
        try {
            const res = await axios.post(`${API_URL}/coupon/validate`, {
                cartItems: cart.items.map(i => ({
                    variantId: i.variant_id,
                    productId: i.product_id,
                    quantity: i.quantity,
                    unitPrice: i.price,
                })),
                customer_id: cart.id || null,
                isFirstPurchase,
                cep: cepFromSelectedAddress || null,
                shippingCost: currentFrete,
                coupon: code,
            })
            if (res.data?.valid) {
                setAppliedCoupon(code)
                toast.success(`Cupom “${code}” aplicado!`)
            } else {
                toast.error('Cupom inválido, desativado ou não cadastrado.')
            }
        } catch (err) {
            console.error('Erro validar cupom', err)
            toast.error('Erro ao validar cupom. Tente novamente.')
        } finally {
            setValidatingCoupon(false)
        }
    }

    function removeCoupon() {
        setAppliedCoupon(null)
        setCouponInput('')
        toast.info('Cupom removido')
    }

    // place order
    // apenas substitua a função existente handlePlaceOrder pelo trecho abaixo
async function handlePlaceOrder() {
    if (!cart?.items || cart.items.length === 0) {
        toast.error('Carrinho vazio.')
        return
    }
    if (!selectedShippingId) {
        toast.error('Escolha uma opção de envio.')
        return
    }
    if (!selectedPaymentId) {
        toast.error('Escolha uma forma de pagamento.')
        return
    }

    if (!isAuthenticated) {
        if (!guestCustomer.name || !guestCustomer.email || !guestCustomer.phone) {
            toast.error('Preencha nome, e-mail e telefone para prosseguir como visitante.')
            return
        }
        if (!selectedAddressId) {
            toast.error('Escolha ou adicione um endereço de entrega.')
            return
        }
    } else {
        if (!selectedAddressId) {
            toast.error('Escolha um endereço de entrega.')
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

        // Recupera o objeto de shipping selecionado (raw) para enviar ao backend
        const selectedShipping = shippingOptions.find(s => s.id === selectedShippingId)

        let payload: any = {
            shippingId: selectedShippingId,
            paymentId: selectedPaymentId,
            items: itemsForApi,
            customerNote: '',
            couponCode: appliedCoupon ?? undefined,
            // **IMPORTANT**: send shippingCost and shippingRaw to avoid backend recalculation
            shippingCost: currentFrete, // numero
            shippingRaw: selectedShipping?.raw ?? selectedShipping ?? null,
        }

        if (isAuthenticated) {
            payload.addressId = selectedAddressId
        } else {
            if (selectedAddressId?.startsWith('guest-')) {
                const localAddress = addresses.find((a) => a.id === selectedAddressId)
                if (!localAddress) throw new Error('Endereço inválido')
                payload.address = {
                    street: localAddress.street,
                    number: localAddress.number,
                    neighborhood: localAddress.neighborhood,
                    city: localAddress.city,
                    state: localAddress.state,
                    zipCode: localAddress.zipCode?.replace(/\D/g, ''),
                    country: localAddress.country,
                    complement: localAddress.complement,
                    reference: localAddress.reference,
                }
            } else {
                if (selectedAddressId) payload.addressId = selectedAddressId
            }
            payload.guestCustomer = guestCustomer
        }

        const resp = await api.post('/checkout/order', payload)
        const data = resp.data ?? {}

        if (data.paymentRedirectUrl) {
            window.location.href = data.paymentRedirectUrl
            return
        }

        if (data.paymentData) {
            setLastPaymentData(data.paymentData)
            setPaymentModalOpen(true)
            clearCart()
            router.push(`/order/success/${data.orderId}`)
            return
        }

        clearCart()
        router.push(`/order/success/${data.orderId}`)
    } catch (err: any) {
        console.error('Erro ao finalizar pedido', err)
        toast.error(err?.response?.data?.message ?? 'Não foi possível finalizar o pedido.')
    } finally {
        setPlacingOrder(false)
    }
}

    async function copyToClipboard(text?: string) {
        if (!text) return
        try {
            await navigator.clipboard.writeText(text)
            toast.success('Copiado para a área de transferência')
        } catch {
            toast.error('Não foi possível copiar')
        }
    }

    function openLink(url?: string) {
        if (!url) return
        window.open(url, '_blank')
    }

    const resolveImageSrc = (src?: string | string[]) => {
        if (!src) return ''
        if (Array.isArray(src)) return src[0] ? (src[0].startsWith('http') ? src[0] : `${API_URL}/files/${src[0]}`) : ''
        if (typeof src === 'string') return src.startsWith('http') ? src : `${API_URL}/files/${src}`
        return ''
    }

    return (
        <>
            <NavbarCheckout />
            <main
                className="flex-1 flex px-4 py-8 text-black"
                style={{ background: colors?.segundo_fundo_layout_site || '#e1e4e9' }}
            >
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        {!isAuthenticated && (
                            <section className="bg-white rounded-2xl shadow p-6">
                                <h2 className="text-xl font-semibold">Finalizar como visitante</h2>
                                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <input placeholder="Nome completo" value={guestCustomer.name ?? ''} onChange={(e) => setGuestCustomer((s) => ({ ...s, name: e.target.value }))} className="p-2 border rounded" />
                                    <input placeholder="E-mail" value={guestCustomer.email ?? ''} onChange={(e) => setGuestCustomer((s) => ({ ...s, email: e.target.value }))} className="p-2 border rounded" />
                                    <input placeholder="Telefone" value={guestCustomer.phone ?? ''} onChange={(e) => setGuestCustomer((s) => ({ ...s, phone: e.target.value }))} className="p-2 border rounded" />
                                </div>
                                <div className="mt-2 text-sm text-gray-600">Como visitante, seu pedido será criado sem conta. Você receberá informações de pagamento por e-mail (se informado).</div>
                            </section>
                        )}

                        <section className="bg-white rounded-2xl shadow p-6">
                            <h2 className="text-xl font-semibold">Endereço de entrega</h2>

                            <div className="mt-4 space-y-4">
                                {addresses.length === 0 && (
                                    <div className="p-4 border border-dashed rounded text-sm text-gray-600">Nenhum endereço salvo. Adicione um novo endereço.</div>
                                )}

                                {addresses.map((a) => (
                                    <label key={a.id} className={`flex items-start gap-3 p-3 rounded border ${selectedAddressId === a.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'}`}>
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
                                    <button type="button" className="px-4 py-2 bg-indigo-600 text-white rounded" onClick={() => openCreateAddress()}>Adicionar novo endereço</button>
                                    <button type="button" className="px-4 py-2 border rounded" onClick={() => fetchShippingOptions(selectedAddressId)}>Calcular Frete</button>
                                </div>
                            </div>
                        </section>

                        <section className="bg-white rounded-2xl shadow p-6">
                            <h2 className="text-xl font-semibold">Opções de envio</h2>
                            {shippingLoading && <div className="mt-4">Calculando opções de frete...</div>}
                            {!shippingLoading && shippingOptions.length === 0 && <div className="mt-4 text-sm text-gray-600">Nenhuma opção encontrada. Calcule o frete.</div>}

                            <div className="mt-4 space-y-3">
                                {shippingOptions.map((s) => (
                                    <label key={s.id} className={`flex items-center justify-between gap-3 p-3 rounded border ${selectedShippingId === s.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'}`}>
                                        <div>
                                            <div className="font-medium">{s.name ?? `${s.provider ?? ''} — ${s.service ?? ''}`}</div>
                                            <div className="text-sm text-gray-600">Prazo estimado: {s.deliveryTime ?? s.estimated_days ? `${s.deliveryTime ?? s.estimated_days} dias` : '—'}</div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="font-medium">{currency(s.price)}</div>
                                            <input name="shipping" type="radio" checked={selectedShippingId === s.id} onChange={() => setSelectedShippingId(s.id)} />
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </section>

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

                    <aside className="bg-white rounded-2xl shadow p-6">
                        <h3 className="text-lg font-semibold">Resumo do pedido</h3>

                        <div className="mt-4 space-y-3 max-h-64 overflow-auto">
                            {cart?.items?.map((it) => (
                                <div key={it.id} className="flex items-center gap-3">
                                    <div className="w-16 h-16 relative">
                                        {resolveImageSrc(it.images) ? (
                                            <Image src={resolveImageSrc(it.images)} alt={it.name} width={64} height={64} className="object-cover rounded" />
                                        ) : (
                                            <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center text-gray-400">sem imagem</div>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-medium">{it.name}</div>
                                        <div className="text-sm text-gray-600">{it.quantity} x {currency(it.price)}</div>
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
                                    <div className="flex items-center justify-between w-full bg-indigo-50 p-2 rounded">
                                        <div>Cupom <strong>{appliedCoupon}</strong> aplicado</div>
                                        <button onClick={removeCoupon} className="text-indigo-600">Remover</button>
                                    </div>
                                )}
                            </div>

                            {loadingPromo && <div className="text-sm text-gray-500">Aplicando promoções…</div>}
                            {promoError && <div className="text-sm text-red-600">{promoError}</div>}

                            {promotions.length > 0 && (
                                <div className="bg-gray-50 p-2 rounded">
                                    <h4 className="font-medium text-sm">Promoções aplicadas</h4>
                                    <ul className="text-sm list-disc list-inside">
                                        {promotions.map((p: PromotionDetail) => (
                                            <li key={p.id} className="flex justify-between">
                                                <div>{p.description ?? p.name}</div>
                                                <div className={p.type === 'shipping' ? 'text-blue-600' : 'text-green-600'}>-{currency(p.discount ?? 0)}</div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <div className="flex justify-between text-sm text-gray-600"><span>Subtotal</span><span>{currency(itemsTotal)}</span></div>
                            {productDiscount > 0 && <div className="flex justify-between text-green-600"><span>Desconto (produtos)</span><span>-{currency(productDiscount)}</span></div>}
                            <div className="flex justify-between text-sm text-gray-600"><span>Frete</span><span>{currency(currentFrete)}</span></div>
                            {shippingDiscount > 0 && <div className="flex justify-between text-blue-600"><span>Desconto (frete)</span><span>-{currency(shippingDiscount)}</span></div>}

                            <div className="border-t pt-2 flex justify-between font-bold">
                                <span className="text-gray-700">Total a pagar</span>
                                <span className="text-red-500">{currency(payableTotal)}</span>
                            </div>

                            <p className="text-xs text-gray-500">12x de {currency(payableTotal / 12)} sem juros</p>
                        </div>

                        <button disabled={placingOrder} onClick={handlePlaceOrder} className="mt-4 w-full bg-green-600 text-white py-3 rounded disabled:opacity-60">
                            {placingOrder ? 'Finalizando...' : 'Concluir pedido'}
                        </button>
                    </aside>
                </div>

                {/* Address Modal */}
                <Dialog open={addressModalOpen} onClose={() => setAddressModalOpen(false)} className="relative z-50 text-black">
                    <div className="fixed inset-0 bg-black/30" aria-hidden />
                    <div className="fixed inset-0 flex items-center justify-center p-4">
                        <Dialog.Panel className="mx-auto max-w-lg bg-white p-6 rounded-lg">
                            <Dialog.Title className="text-lg font-semibold">{editingId ? 'Editar endereço' : 'Novo endereço'}</Dialog.Title>

                            <div className="mt-4 grid grid-cols-1 gap-3">
                                <input placeholder="Nome do destinatário" value={addressForm.recipient_name ?? ''} onChange={(e) => setAddressForm((s) => ({ ...s, recipient_name: e.target.value }))} className="p-2 border rounded" />
                                <input placeholder="CEP" value={addressForm.zipCode ?? ''} onChange={(e) => setAddressForm((s) => ({ ...s, zipCode: maskCep(e.target.value) }))} onBlur={handleCepBlur} className="p-2 border rounded" />
                                <input placeholder="Rua" value={addressForm.street ?? ''} onChange={(e) => setAddressForm((s) => ({ ...s, street: e.target.value }))} className="p-2 border rounded" />
                                <div className="grid grid-cols-2 gap-2">
                                    <input placeholder="Número" value={addressForm.number ?? ''} onChange={(e) => setAddressForm((s) => ({ ...s, number: e.target.value }))} className="p-2 border rounded" />
                                    <input placeholder="Complemento" value={addressForm.complement ?? ''} onChange={(e) => setAddressForm((s) => ({ ...s, complement: e.target.value }))} className="p-2 border rounded" />
                                </div>
                                <input placeholder="Bairro" value={addressForm.neighborhood ?? ''} onChange={(e) => setAddressForm((s) => ({ ...s, neighborhood: e.target.value }))} className="p-2 border rounded" />
                                <div className="grid grid-cols-2 gap-2">
                                    <input placeholder="Cidade" value={addressForm.city ?? ''} onChange={(e) => setAddressForm((s) => ({ ...s, city: e.target.value }))} className="p-2 border rounded" />
                                    <select value={addressForm.state ?? ''} onChange={(e) => setAddressForm((s) => ({ ...s, state: e.target.value }))} className="p-2 border rounded bg-white">
                                        <option value="">Selecione a UF</option>
                                        {estadosBR.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
                                    </select>
                                </div>

                                <div className="mt-4 flex justify-end gap-2">
                                    <button className="px-4 py-2 border rounded" onClick={() => setAddressModalOpen(false)}>Cancelar</button>
                                    <button className="px-4 py-2 bg-indigo-600 text-white rounded" onClick={() => submitAddress()}>Salvar</button>
                                </div>
                            </div>
                        </Dialog.Panel>
                    </div>
                </Dialog>

                {/* Delete confirmation modal */}
                <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} className="relative z-50 text-black">
                    <div className="fixed inset-0 bg-black/30" aria-hidden />
                    <div className="fixed inset-0 flex items-center justify-center p-4">
                        <Dialog.Panel className="mx-auto max-w-sm bg-white p-6 rounded-lg">
                            <Dialog.Title className="text-lg font-semibold">Remover endereço</Dialog.Title>
                            <div className="mt-4">
                                <p>Tem certeza de que deseja remover este endereço?</p>
                            </div>
                            <div className="mt-6 flex justify-end gap-2">
                                <button className="px-4 py-2 border rounded" onClick={cancelDelete}>Cancelar</button>
                                <button className="px-4 py-2 bg-red-600 text-white rounded" onClick={confirmDelete}>Remover</button>
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
            </main>
            <FooterCheckout />
        </>
    )
}