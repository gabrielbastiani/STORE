'use client'

import React, { useContext, useEffect, useMemo, useRef, useState } from 'react'
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

/**
 * Configurações ajustáveis
 */
const MAX_INSTALLMENTS_BY_BRAND: Record<string, number> = {
    visa: 21,
    mastercard: 21,
    amex: 12,
    elo: 12,
    hipercard: 12,
    diners: 12,
    discover: 12,
    jcb: 12,
    maestro: 12,
    aura: 12,
    unknown: 12,
}
const NO_INTEREST_MAX_BY_BRAND: Record<string, number> = {
    visa: 12,
    mastercard: 12,
    amex: 6,
    elo: 6,
    hipercard: 6,
    diners: 6,
    discover: 6,
    jcb: 6,
    maestro: 6,
    aura: 6,
    unknown: 3,
}
const DEFAULT_MONTHLY_INTEREST = 1.99 // em % ao mês

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

type AddressLocal = Required<Pick<CheckoutAddress, 'zipCode' | 'street' | 'neighborhood' | 'city' | 'state'>> & Partial<Omit<CheckoutAddress, 'zipCode' | 'street' | 'neighborhood' | 'city' | 'state'>> & { id: string }

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

/* ------------------ helpers de cartão ------------------ */

function detectCardBrandFromNumber(numRaw: string): string {
    const n = (numRaw || '').replace(/\D/g, '')
    if (n.length === 0) return 'unknown'

    const re: Record<string, RegExp> = {
        visa: /^4/,
        mastercard: /^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/,
        amex: /^3[47]/,
        diners: /^3(?:0[0-5]|[68])/,
        discover: /^(6011|65|64[4-9])/,
        jcb: /^35(?:2[89]|[3-8]\d)/,
        maestro: /^(5018|5020|5038|6304|6759|676[1-3])/,
        hipercard: /^(606282|384100|384140|384160)/,
        elo: /^(4011|4312|438935|451416|457393|457631|504175|5067|5090|627780|636297|636368)/,
        aura: /^50(42|43)/,
    }

    for (const k of Object.keys(re)) {
        const r = re[k]
        if (r.test(n)) return k
    }
    return 'unknown'
}

function formatCardNumberForDisplay(numRaw: string, brand: string) {
    const n = (numRaw || '').replace(/\D/g, '')
    if (brand === 'amex') {
        return n.replace(/^(.{4})(.{6})(.{0,5}).*$/, (_m, a, b, c) => [a, b, c].filter(Boolean).join(' ')).trim()
    }
    return n.replace(/(.{4})/g, '$1 ').trim()
}

function cvcLengthForBrand(brand: string) {
    if (brand === 'amex') return 4
    return 3
}

function generateInstallmentOptions(total: number, brand: string) {
    const max = MAX_INSTALLMENTS_BY_BRAND[brand] ?? MAX_INSTALLMENTS_BY_BRAND.unknown
    const noInterestMax = NO_INTEREST_MAX_BY_BRAND[brand] ?? NO_INTEREST_MAX_BY_BRAND.unknown
    const out: Array<{ n: number; label: string; perInstallment: number; interestMonthly: number; interestApplied: boolean }> = []

    for (let n = 1; n <= Math.min(max, 21); n++) {
        let interestApplied = n > noInterestMax
        let monthlyInterest = interestApplied ? DEFAULT_MONTHLY_INTEREST : 0
        let per = 0
        if (monthlyInterest === 0) {
            per = Number((total / n).toFixed(2))
        } else {
            const i = monthlyInterest / 100
            const factor = Math.pow(1 + i, n)
            per = Number(((total * (factor * i)) / (factor - 1)).toFixed(2))
        }

        const label = `${n}x de ${currency(per)}${interestApplied ? ` — juros ${monthlyInterest}% a.m.` : ' — sem juros'}`

        out.push({ n, label, perInstallment: per, interestMonthly: monthlyInterest, interestApplied })
    }

    return out
}

/* ------------------ componente ------------------ */

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

    // shipping
    const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([])
    const [selectedShippingId, setSelectedShippingId] = useState<string | undefined>(undefined)
    const [shippingLoading, setShippingLoading] = useState(false)

    // payments
    const [paymentOptions, setPaymentOptions] = useState<PaymentOption[]>([])
    const [selectedPaymentId, setSelectedPaymentId] = useState<string | undefined>(undefined)

    // card inputs
    const [cardNumber, setCardNumber] = useState('')
    const [cardHolder, setCardHolder] = useState('')
    const [cardExpMonth, setCardExpMonth] = useState('')
    const [cardExpYear, setCardExpYear] = useState('')
    const [cardCvv, setCardCvv] = useState('')
    const [cardInstallments, setCardInstallments] = useState<number | null>(1)

    // brand management
    const [detectedBrand, setDetectedBrand] = useState<string>('unknown')

    // coupons/promotions
    const [couponInput, setCouponInput] = useState('')
    const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null)
    const [validatingCoupon, setValidatingCoupon] = useState(false)

    // order UI
    const [placingOrder, setPlacingOrder] = useState(false)

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

    // base payable (sem considerar juros de parcelas)
    const payableBase = (itemsTotal ?? 0) - (productDiscount ?? 0) + (currentFrete - (shippingDiscount ?? 0))

    // installment options (dependem da bandeira detectada)
    const currentBrand = detectedBrand ?? 'unknown'
    const installmentOptions = useMemo(() => generateInstallmentOptions(payableBase, currentBrand), [payableBase, currentBrand])

    // compute displayed total considering selected installment (juros compostos aplicados no perInstallment)
    const selectedInstallmentObj = installmentOptions.find(i => i.n === (cardInstallments ?? 1))
    const totalWithInstallments = selectedInstallmentObj ? Number((selectedInstallmentObj.perInstallment * selectedInstallmentObj.n).toFixed(2)) : payableBase

    /* ------------------ effects ------------------ */

    // Keep a ref to latest cart and user for sendBeacon
    const latestCartRef = useRef(cart)
    const latestUserRef = useRef(user)
    latestCartRef.current = cart
    latestUserRef.current = user

    // debounce timer ref for updates
    const syncTimerRef = useRef<number | null>(null)

    // helper: map cart context to backend payload
    function mapCartToPayload(cartObj: any, userObj: any, baseTotal: number, overrideTotal?: number, shippingCostOverride?: number) {
        return {
            cart_id: cartObj?.id ?? null,
            customer_id: userObj?.id ?? null,
            items: (cartObj?.items ?? []).map((it: any) => ({
                product_id: it.product_id,
                quantity: it.quantity,
                price: it.price ?? 0,
                variant_id: it.variant_id ?? null,
            })),
            subtotal: typeof cartObj?.subtotal === 'number' ? cartObj.subtotal : baseTotal ?? 0,
            shippingCost: typeof shippingCostOverride === 'number' ? shippingCostOverride : (typeof cartObj?.shippingCost === 'number' ? cartObj.shippingCost : 0),
            // total: priorize overrideTotal (ex.: totalWithInstallments), senão cart.total, senão baseTotal
            total: typeof overrideTotal === 'number' ? overrideTotal : (typeof cartObj?.total === 'number' ? cartObj.total : baseTotal ?? 0),
        }
    }

    // send update using fetch (keepalive) or setupAPIClient (for normal updates)
    async function sendAbandonedViaClient(payload: any) {
        try {
            // prefer using setupAPIClient (keeps auth cookies/headers if configured)
            const apiClient = setupAPIClient()
            await apiClient.post(`/cart/abandoned`, payload)
        } catch (err) {
            console.log(err)
        }
    }

    // on mount: load addresses + create/update AbandonedCart (debounced to avoid spam)
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

                // create/update abandoned cart record on backend (only if user logged)
                try {
                    if (isAuthenticated && user) {
                        const payload = mapCartToPayload(cart, user, payableBase)
                        // se não houver cart id ou items, ignora envio
                        if (payload.cart_id && payload.items && payload.items.length > 0) {
                            // debounce para evitar múltiplas chamadas rápidas
                            if (syncTimerRef.current) {
                                window.clearTimeout(syncTimerRef.current)
                            }
                            syncTimerRef.current = window.setTimeout(() => {
                                sendAbandonedViaClient(payload).catch(e => console.warn('Erro ao enviar abandoned (mount):', e))
                                syncTimerRef.current = null
                            }, 250)
                        }
                    }
                } catch (err) {
                    console.warn('Não foi possível criar/atualizar AbandonedCart', err)
                }
            })()

        return () => { mounted = false; if (syncTimerRef.current) { window.clearTimeout(syncTimerRef.current); syncTimerRef.current = null } }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated, user?.id, cart?.id])

    // quando o usuário escolhe frete ou quando o total com parcelas muda, envie atualização
    useEffect(() => {
        if (!isAuthenticated || !user) return
        const shippingCostToSend = currentFrete ?? 0
        const totalToSend = totalWithInstallments ?? payableBase

        // não enviar se não tem items
        if (!cart?.items || cart.items.length === 0) return

        const payload = mapCartToPayload(cart, user, payableBase, totalToSend, shippingCostToSend)

        // debounce curto
        if (syncTimerRef.current) {
            window.clearTimeout(syncTimerRef.current)
        }
        syncTimerRef.current = window.setTimeout(() => {
            sendAbandonedViaClient(payload).catch(e => console.warn('Erro ao enviar abandoned (frete/total change):', e))
            syncTimerRef.current = null
        }, 200)

        return () => { if (syncTimerRef.current) { window.clearTimeout(syncTimerRef.current); syncTimerRef.current = null } }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedShippingId, totalWithInstallments, currentFrete])

    // Sync when cart items change (debounced)
    useEffect(() => {
        if (!isAuthenticated || !user) return
        // don't send if empty
        const itemsLen = (cart?.items ?? []).length
        if (!itemsLen) return

        if (syncTimerRef.current) {
            window.clearTimeout(syncTimerRef.current)
        }
        syncTimerRef.current = window.setTimeout(() => {
            const payload = mapCartToPayload(cart, user, payableBase)
            sendAbandonedViaClient(payload).catch(e => console.warn('Erro ao enviar abandoned (items change):', e))
            syncTimerRef.current = null
        }, 300)
        return () => { if (syncTimerRef.current) { window.clearTimeout(syncTimerRef.current); syncTimerRef.current = null } }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cart?.items?.length, cart?.id])

    // enviar ao sair/fechar aba com navigator.sendBeacon (mais confiável)
    useEffect(() => {
        if (!isAuthenticated || !user) return

        const handleSendOnExit = () => {
            const payload = mapCartToPayload(latestCartRef.current, latestUserRef.current, payableBase)
            if (!payload || !payload.items || payload.items.length === 0) return

            const url = `${API_URL}/cart/abandoned`
            const data = JSON.stringify(payload)
            try {
                const blob = new Blob([data], { type: 'application/json' })
                if (navigator && typeof navigator.sendBeacon === 'function') {
                    navigator.sendBeacon(url, blob)
                } else {
                    // fallback keepalive fetch
                    fetch(url, { method: 'POST', body: data, headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(() => { /* ignore */ })
                }
            } catch (e) {
                try {
                    fetch(url, { method: 'POST', body: data, headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(() => { /* ignore */ })
                } catch { /* ignore */ }
            }
        }

        const onVisibility = () => {
            if (document.visibilityState === 'hidden') handleSendOnExit()
        }

        document.addEventListener('visibilitychange', onVisibility)
        window.addEventListener('pagehide', handleSendOnExit)
        window.addEventListener('beforeunload', handleSendOnExit)

        return () => {
            document.removeEventListener('visibilitychange', onVisibility)
            window.removeEventListener('pagehide', handleSendOnExit)
            window.removeEventListener('beforeunload', handleSendOnExit)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated, user?.id])

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

    /* ------------------ handlers ------------------ */

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

    // Card input changes: format + detect brand
    function onCardNumberChange(raw: string) {
        const only = raw.replace(/\D/g, '')
        const brand = detectCardBrandFromNumber(only)
        setDetectedBrand(brand)
        // format visually
        const display = formatCardNumberForDisplay(only, brand)
        setCardNumber(display)
    }

    function onCardHolderChange(v: string) {
        setCardHolder(v)
    }

    function onExpMonthChange(v: string) {
        setCardExpMonth(v.replace(/[^\d]/g, '').slice(0, 2))
    }

    function onExpYearChange(v: string) {
        setCardExpYear(v.replace(/[^\d]/g, '').slice(0, 4))
    }

    function onCvvChange(v: string) {
        const max = cvcLengthForBrand(currentBrand)
        setCardCvv(v.replace(/\D/g, '').slice(0, max))
    }

    // place order (mantive sua lógica com validações extras)
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

        const isCard = String(selectedPaymentId).toLowerCase().includes('card')
        if (isCard) {
            // validations
            const plainNumber = cardNumber.replace(/\s+/g, '')
            if (!plainNumber || !cardHolder || !cardExpMonth || !cardExpYear || !cardCvv) {
                toast.error('Preencha todos os dados do cartão para prosseguir.')
                return
            }
            if (!/^\d{13,19}$/.test(plainNumber)) {
                toast.error('Número de cartão inválido.')
                return
            }
            if (!/^\d{2}$/.test(String(cardExpMonth)) || !/^\d{4}$/.test(String(cardExpYear))) {
                toast.error('Validade do cartão inválida (MM / YYYY).')
                return
            }
            const cvcLen = cvcLengthForBrand(currentBrand)
            if (!new RegExp(`^\\d{${cvcLen}}$`).test(cardCvv)) {
                toast.error(`CVV inválido para a bandeira detectada (deve ter ${cvcLen} dígitos).`)
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

            const selectedShipping = shippingOptions.find(s => s.id === selectedShippingId)
            const shippingLabel = selectedShipping?.name ?? (selectedShipping ? `${selectedShipping.provider ?? ''} — ${selectedShipping.service ?? ''}` : undefined)

            let payload: any = {
                // include cartId to allow backend auto-remove abandoned cart
                cartId: cart?.id ?? null,
                shippingId: selectedShippingId,
                shippingLabel: shippingLabel, // importante: enviar label também
                paymentId: selectedPaymentId,
                items: itemsForApi,
                customerNote: '',
                couponCode: appliedCoupon ?? undefined,
                shippingCost: currentFrete,
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
            }

            if (isCard) {
                // ensure month is zero-padded and year is 4-digit
                const expMonth = String(cardExpMonth).padStart(2, '0')
                const expYear = String(cardExpYear).length === 2 ? `20${cardExpYear}` : String(cardExpYear)

                payload.card = {
                    number: cardNumber.replace(/\s+/g, ''),
                    holderName: cardHolder.trim(),
                    expirationMonth: expMonth,
                    expirationYear: expYear,
                    cvv: cardCvv,
                    installments: cardInstallments ?? 1,
                    brand: currentBrand,
                }

                if (selectedInstallmentObj && selectedInstallmentObj.interestApplied) {
                    payload.orderTotalOverride = totalWithInstallments
                }
            }

            const resp = await api.post('/checkout/order', payload)
            const data = resp.data ?? {}

            try {
                // salve label e raw para a página de sucesso usar (evita mostrar id numérico)
                const lastOrderObj = {
                    orderId: data.orderId ?? null,
                    orderTotal: data.orderTotal ?? totalWithInstallments,
                    shippingCost: currentFrete,
                    shippingAddress: selectedAddress ?? null,
                    paymentData: data.paymentData ?? null,
                    paymentMethod: selectedPaymentId ?? null,
                    shippingLabel: shippingLabel ?? null,
                    shippingRaw: selectedShipping?.raw ?? selectedShipping ?? null,
                    createdAt: new Date().toISOString(),
                }
                sessionStorage.setItem(`lastOrder:${String(data.orderId ?? '')}`, JSON.stringify(lastOrderObj))
            } catch (e) {
                console.warn('Não foi possível salvar lastOrder no sessionStorage', e)
            }

            // limpar carrinho
            clearCart()

            // redirecionar
            router.push(`/order/success/${data.orderId}`)
        } catch (err: any) {
            console.error('Erro ao finalizar pedido', err)
            toast.error(err?.response?.data?.message ?? err?.message ?? 'Não foi possível finalizar o pedido.')
        } finally {
            setPlacingOrder(false)
        }
    }

    function brandImageSrc(brand: string) {
        return `/card-brands/${brand}.png`
    }

    /* ------------------ modal / address helpers (mantive) ------------------ */

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

    /* ------------------ render ------------------ */

    return (
        <>
            <NavbarCheckout />
            <main className="flex-1 flex px-4 py-8 text-black" style={{ background: colors?.segundo_fundo_layout_site || '#e1e4e9' }}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
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
                                    <button type="button" className="px-4 py-2 border rounded" onClick={() => fetchShippingOptions(selectedAddressId)}>Calcular Frete</button>
                                </div>
                            </div>
                        </section>

                        <section className="bg-white rounded-2xl shadow p-6">
                            <h2 className="text-xl font-semibold">Opções de envio</h2>
                            {shippingLoading && <div className="mt-4">Calculando opções de frete...</div>}
                            {!shippingLoading && shippingOptions.length === 0 && <div className="mt-4 text-sm text-gray-600">Nenhuma opção encontrada. Calcule o frete.</div>}

                            <div className="mt-4 space-y-3">
                                {shippingOptions.map((s) => {
                                    const prazo = s.deliveryTime ?? (s.estimated_days ? `${s.estimated_days} dias` : '—')
                                    const label = s.name ?? `${s.provider ?? ''} — ${s.service ?? ''}`
                                    return (
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
                                    )
                                })}
                            </div>
                        </section>

                        <section className="bg-white rounded-2xl shadow p-6">
                            <h2 className="text-xl font-semibold">Pagamento</h2>
                            <div className="mt-4 space-y-3">
                                {paymentOptions.map((p) => (
                                    <div key={p.id}>
                                        <label className={`flex items-center justify-between gap-3 p-3 rounded border ${selectedPaymentId === p.id ? 'border-orange-500 bg-orange-50' : 'border-gray-200'}`}>
                                            <div>
                                                <div className="font-medium">{p.label}</div>
                                                <div className="text-sm text-gray-600">{p.description}</div>
                                            </div>
                                            <div>
                                                <input name="payment" type="radio" checked={selectedPaymentId === p.id} onChange={() => setSelectedPaymentId(p.id)} />
                                            </div>
                                        </label>

                                        {/* Formulário do cartão */}
                                        {selectedPaymentId === p.id && String(p.method).toLowerCase().includes('card') && (
                                            <div className="p-3 border rounded bg-gray-50 mt-2">
                                                <div className="grid grid-cols-1 gap-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex-1 relative">
                                                            <label className="text-sm text-gray-700">Número do cartão</label>
                                                            <input placeholder="0000 0000 0000 0000" value={cardNumber} onChange={(e) => onCardNumberChange(e.target.value)} className="w-full p-3 border rounded mt-1" />
                                                            <div className="absolute right-3 top-8">
                                                                <img src={brandImageSrc(detectedBrand)} alt={detectedBrand} onError={(e) => { (e.target as HTMLImageElement).src = '/card-brands/unknown.png' }} className="w-10 h-8 object-contain" />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <label className="text-sm text-gray-700">Nome do titular</label>
                                                        <input placeholder="Nome como no cartão" value={cardHolder} onChange={(e) => onCardHolderChange(e.target.value)} className="w-full p-2 border rounded mt-1" />
                                                    </div>

                                                    <div className="grid grid-cols-3 gap-2">
                                                        <div>
                                                            <label className="text-sm text-gray-700">Validade (MM)</label>
                                                            <input value={cardExpMonth} onChange={(e) => onExpMonthChange(e.target.value)} className="p-2 border rounded mt-1" placeholder="MM" />
                                                        </div>
                                                        <div>
                                                            <label className="text-sm text-gray-700">Validade (YYYY)</label>
                                                            <input value={cardExpYear} onChange={(e) => onExpYearChange(e.target.value)} className="p-2 border rounded mt-1" placeholder="YYYY" />
                                                        </div>
                                                        <div>
                                                            <label className="text-sm text-gray-700">CVV</label>
                                                            <input value={cardCvv} onChange={(e) => onCvvChange(e.target.value)} className="p-2 border rounded mt-1" placeholder={String(cvcLengthForBrand(currentBrand))} />
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <label className="text-sm">Parcelas</label>
                                                        <select value={String(cardInstallments ?? 1)} onChange={(e) => setCardInstallments(Number(e.target.value))} className="p-2 border rounded">
                                                            {installmentOptions.map(opt => (
                                                                <option key={opt.n} value={opt.n}>{opt.label}</option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    <div className="text-xs text-gray-500">
                                                        Observação: As bandeiras de cartão de crédito aceitas são: visa, mastercard, amex, elo, hipercard, diners, discover, jcb, maestro, aura.
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
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
                                        {(it.images && ((Array.isArray(it.images) && it.images[0]) || (!Array.isArray(it.images) && it.images))) ? (
                                            <Image src={(Array.isArray(it.images) ? (it.images[0].startsWith('http') ? it.images[0] : `${API_URL}/files/${it.images[0]}`) : (it.images as string).startsWith('http') ? it.images as string : `${API_URL}/files/${it.images as string}`)} alt={it.name} width={64} height={64} className="object-cover rounded" />
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
                                    <div className="flex items-center justify-between w-full bg-orange-50 p-2 rounded">
                                        <div>Cupom <strong>{appliedCoupon}</strong> aplicado</div>
                                        <button onClick={removeCoupon} className="text-orange-600">Remover</button>
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
                                                <div className={p.type === 'shipping' ? 'text-orange-600' : 'text-green-600'}>-{currency(p.discount ?? 0)}</div>
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
                                <span className="text-gray-700">Total a pagar</span>
                                <span className="text-red-500">{currency(totalWithInstallments)}</span>
                            </div>

                            <p className="text-xs text-gray-500">Exemplo de parcela selecionada: {cardInstallments}x — {installmentOptions.find(i => i.n === (cardInstallments ?? 1))?.label}</p>
                        </div>

                        <button disabled={placingOrder} onClick={handlePlaceOrder} className="mt-4 w-full bg-green-600 text-white py-3 rounded disabled:opacity-60">
                            {placingOrder ? 'Finalizando...' : 'Concluir pedido'}
                        </button>
                    </aside>
                </div>

                {/* Address Modal (mantive seu modal sem mudanças significativas) */}
                <Dialog open={addressModalOpen} onClose={() => setAddressModalOpen(false)} className="relative z-50 text-black">
                    <div className="fixed inset-0 bg-black/30" aria-hidden />
                    <div className="fixed inset-0 flex items-center justify-center p-4">
                        <Dialog.Panel className="mx-auto max-w-lg bg-white p-6 rounded-lg">
                            <Dialog.Title className="text-lg font-semibold">{editingId ? 'Editar endereço' : 'Novo endereço'}</Dialog.Title>

                            <div className="mt-4 grid grid-cols-1 gap-3">
                                <input placeholder="Nome do destinatário" value={addressForm.recipient_name ?? ''} onChange={(e) => setAddressForm((s) => ({ ...s, recipient_name: e.target.value }))} className="p-2 border rounded" />
                                <input placeholder="CEP" value={addressForm.zipCode ?? ''} onChange={(e) => setAddressForm((s) => ({ ...s, zipCode: maskCep(e.target.value) }))} onBlur={async () => {
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
                                    } catch { /* ignore */ }
                                }} className="p-2 border rounded" />
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
                                    <button className="px-4 py-2 bg-orange-600 text-white rounded" onClick={() => submitAddress()}>Salvar</button>
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

            </main>
            <FooterCheckout />
        </>
    )
}