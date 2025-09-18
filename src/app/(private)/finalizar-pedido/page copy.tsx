'use client'

import React, { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { AuthContextStore } from '@/app/contexts/AuthContextStore'
import { useCart } from '@/app/contexts/CartContext'
import { api } from '@/services/apiClient'
import { setupAPIClient } from '@/services/api'
import { useRouter } from 'next/navigation'
import type { CartItem as CartItemType } from 'Types/types'
import { toast } from 'react-toastify'
import axios from 'axios'
import { usePromotions } from '@/app/hooks/usePromotions'
import { useTheme } from '@/app/contexts/ThemeContext'
import { NavbarCheckout } from '@/app/components/navbar/navbarCheckout'
import { FooterCheckout } from '@/app/components/footer/footerCheckout'
import AddressList from '@/app/components/checkout/AddressList'
import ShippingOptions from '@/app/components/checkout/ShippingOptions'
import PaymentSection from '@/app/components/checkout/PaymentSection'
import OrderSummary from '@/app/components/checkout/OrderSummary'
import AddressModal from '@/app/components/checkout/AddressModal'
import DeleteConfirmModal from '@/app/components/checkout/DeleteConfirmModal'

import { detectCardBrandFromNumber, formatCardNumberForDisplay, cvcLengthForBrand, generateInstallmentOptions } from '@/app/components/checkout/utils/paymentHelpers'

import type { AddressLocal, ShippingOption, PaymentOption } from '@/app/components/checkout/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

const estadosBR = [
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
    "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
    "RS", "RO", "RR", "SC", "SP", "SE", "TO"
]

function maskCep(v: string) {
    const d = (v ?? '').replace(/\D/g, '').slice(0, 8)
    return d.replace(/(\d{5})(\d)/, '$1-$2')
}

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

    const currentFrete = useMemo(() => {
        const s = shippingOptions.find((o) => o.id === selectedShippingId)
        return s?.price ?? 0
    }, [shippingOptions, selectedShippingId])

    const {
        discountTotal,
        productDiscount: productDiscountFromService,
        shippingDiscount: shippingDiscountFromService,
        promotions,
        skippedPromotions, // <-- novo
        loading: loadingPromo,
        error: promoError,
        freeGifts,
    } = usePromotions(cepFromSelectedAddress ?? '', appliedCoupon, currentFrete, user?.id ?? null);

    // use service-provided values when present; fall back to calculation from promotions[] only if missing
    const shippingDiscountRaw = typeof shippingDiscountFromService === 'number'
        ? shippingDiscountFromService
        : (promotions?.filter((p) => p.type === 'shipping').reduce((s, p) => s + (p.discount ?? 0), 0) ?? 0)

    const productDiscountRaw = typeof productDiscountFromService === 'number'
        ? productDiscountFromService
        : ((discountTotal ?? 0) - shippingDiscountRaw)

    // round to 2 decimals to avoid floating point drift
    const shippingDiscount = Number((shippingDiscountRaw || 0).toFixed(2))
    const productDiscount = Number((productDiscountRaw || 0).toFixed(2))

    // base payable (sem considerar juros de parcelas) — arredondado
    const payableBase = Number(((itemsTotal ?? 0) - productDiscount + (currentFrete ?? 0) - shippingDiscount).toFixed(2))

    // installment options (dependem da bandeira detectada)
    const currentBrand = detectedBrand ?? 'unknown'
    const installmentOptions = useMemo(() => generateInstallmentOptions(payableBase, currentBrand), [payableBase, currentBrand])

    // compute displayed total considering selected installment (juros compostos aplicados no perInstallment)
    const selectedInstallmentObj = installmentOptions.find(i => i.n === (cardInstallments ?? 1))
    const totalWithInstallments = selectedInstallmentObj ? Number((selectedInstallmentObj.perInstallment * selectedInstallmentObj.n).toFixed(2)) : payableBase

    /* ------------------ effects (mantive sua lógica) ------------------ */
    const latestCartRef = useRef(cart)
    const latestUserRef = useRef(user)
    latestCartRef.current = cart
    latestUserRef.current = user

    const syncTimerRef = useRef<number | null>(null)

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
            // prefer explicit baseTotal passed by caller (ex: itemsTotal variable)
            subtotal: typeof cartObj?.subtotal === 'number' ? cartObj.subtotal : baseTotal ?? 0,
            shippingCost: typeof shippingCostOverride === 'number' ? shippingCostOverride : (typeof cartObj?.shippingCost === 'number' ? cartObj.shippingCost : 0),
            total: overrideTotal ?? totalWithInstallments,
        }
    }

    async function sendAbandonedViaClient(payload: any) {
        try {
            const apiClient = setupAPIClient()
            await apiClient.post(`/cart/abandoned`, payload)
        } catch (err) {
            console.log(err)
        }
    }

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

                try {
                    if (isAuthenticated && user) {
                        const payload = mapCartToPayload(cart, user, itemsTotal)
                        if (payload.cart_id && payload.items && payload.items.length > 0) {
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

    useEffect(() => {
        if (!isAuthenticated || !user) return
        const shippingCostToSend = currentFrete ?? 0
        if (!cart?.items || cart.items.length === 0) return
        const payload = mapCartToPayload(cart, user, itemsTotal, totalWithInstallments, shippingCostToSend)
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

    useEffect(() => {
        if (!isAuthenticated || !user) return
        const itemsLen = (cart?.items ?? []).length
        if (!itemsLen) return
        if (syncTimerRef.current) {
            window.clearTimeout(syncTimerRef.current)
        }
        syncTimerRef.current = window.setTimeout(() => {
            const payload = mapCartToPayload(cart, user, itemsTotal)
            sendAbandonedViaClient(payload).catch(e => console.warn('Erro ao enviar abandoned (items change):', e))
            syncTimerRef.current = null
        }, 300)
        return () => { if (syncTimerRef.current) { window.clearTimeout(syncTimerRef.current); syncTimerRef.current = null } }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cart?.items?.length, cart?.id])

    useEffect(() => {
        if (!isAuthenticated || !user) return

        const handleSendOnExit = () => {
            const payload = mapCartToPayload(latestCartRef.current, latestUserRef.current, itemsTotal, totalWithInstallments)
            if (!payload || !payload.items || payload.items.length === 0) return

            const url = `${API_URL}/cart/abandoned`
            const data = JSON.stringify(payload)
            try {
                const blob = new Blob([data], { type: 'application/json' })
                if (navigator && typeof navigator.sendBeacon === 'function') {
                    navigator.sendBeacon(url, blob)
                } else {
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

    /* ------------------ handlers (mantive) ------------------ */

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
        const display = formatCardNumberForDisplay(only, brand)
        setCardNumber(display)
    }

    function onCardHolderChange(v: string) { setCardHolder(v) }
    function onExpMonthChange(v: string) { setCardExpMonth(v.replace(/[^\d]/g, '').slice(0, 2)) }
    function onExpYearChange(v: string) { setCardExpYear(v.replace(/[^\d]/g, '').slice(0, 4)) }
    function onCvvChange(v: string) { const max = cvcLengthForBrand(currentBrand); setCardCvv(v.replace(/\D/g, '').slice(0, max)) }

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

            let promotion_id: string[] | undefined = undefined;
            if (Array.isArray(promotions) && promotions.length > 0) {
                const ids = promotions
                    .map((p: any) => (typeof p === 'string' ? p : p?.id))
                    .filter((x: any) => typeof x === 'string' && x.length > 0);
                promotion_id = ids.length > 0 ? ids : undefined;
            } else {
                promotion_id = undefined;
            }

            let promotionDetails: Array<{ id: string; discountApplied: number }> | undefined = undefined;
            if (Array.isArray(promotions) && promotions.length > 0) {
                const det = promotions
                    .map((p: any) => {
                        const id = typeof p === 'string' ? p : p?.id;
                        const discount = Number((p?.discount ?? 0));
                        if (typeof id === 'string' && id.length > 0) return { id, discountApplied: discount };
                        return null;
                    })
                    .filter(Boolean) as Array<{ id: string; discountApplied: number }>;
                promotionDetails = det.length > 0 ? det : undefined;
            }
            // ------------------------------------------------

            let payload: any = {
                cartId: cart?.id ?? null,
                shippingId: selectedShippingId,
                shippingLabel: shippingLabel,
                paymentId: selectedPaymentId,
                items: itemsForApi,
                customerNote: '',
                couponCode: appliedCoupon ?? undefined, // envia o código do cupom
                shippingCost: currentFrete,
                shippingRaw: selectedShipping?.raw ?? selectedShipping ?? null,
                orderTotalOverride: totalWithInstallments,
                promotion_id: promotion_id, // mantive seu campo (json)
                promotionDetails: promotionDetails, // NOVO campo com descontos aplicados por promoção
            };

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
            }

            const resp = await api.post('/checkout/order', payload)
            const data = resp.data ?? {}

            const skipped = data.skippedPromotions ?? [];
            if (skipped && skipped.length > 0) {
                // mostra motivo ao usuário (ajuste de mensagem conforme UX)
                const msgs = skipped.map((s: { id: any; reason: any }) => `${s.reason}`).join('; ');
                toast.warn(`Algumas promoções não foram aplicadas: ${msgs}`);
            }

            try {
                const lastOrderObj = {
                    orderId: data.orderId ?? null,
                    orderTotal: totalWithInstallments,
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

            clearCart()
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

    function cancelDelete() { setDeleteTarget(null) }

    // dentro do FinishOrderPage.tsx — substitua applyCoupon existente por esta versão
    async function applyCoupon() {
        const code = couponInput.trim();
        if (!code) return;
        setValidatingCoupon(true);
        try {
            const res = await axios.post(`${API_URL}/coupon/validate`, {
                cartItems: (cart.items || []).map(i => ({
                    variantId: i.variant_id,
                    productId: i.product_id,
                    quantity: i.quantity,
                    unitPrice: i.price,
                })),
                customer_id: user?.id ?? null,
                cep: cepFromSelectedAddress || null,
                shippingCost: currentFrete,
                coupon: code,
            });

            if (res.data?.valid) {
                setAppliedCoupon(code);
                toast.success(`Cupom “${code}” aplicado!`);
            } else {
                setAppliedCoupon(null);
                toast.error('Cupom inválido, desativado ou não cadastrado.');
            }
        } catch (err) {
            console.error('Erro validar cupom', err);
            toast.error('Erro ao validar cupom. Tente novamente.');
        } finally {
            setValidatingCoupon(false);
        }
    }

    function removeCoupon() {
        setAppliedCoupon(null)
        setCouponInput('')
        toast.info('Cupom removido')
    }

    return (
        <>
            <NavbarCheckout />
            <main className="flex-1 flex px-4 py-8 text-black" style={{ background: colors?.segundo_fundo_layout_site || '#e1e4e9' }}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <AddressList
                            addresses={addresses}
                            selectedAddressId={selectedAddressId}
                            setSelectedAddressId={(id) => { setSelectedAddressId(id); fetchShippingOptions(id) }}
                            openCreateAddress={openCreateAddress}
                            openEditAddress={openEditAddress}
                            requestRemoveAddress={requestRemoveAddress}
                            fetchShippingOptions={fetchShippingOptions}
                        />

                        <ShippingOptions
                            shippingOptions={shippingOptions}
                            selectedShippingId={selectedShippingId}
                            setSelectedShippingId={setSelectedShippingId}
                            shippingLoading={shippingLoading}
                        />

                        <PaymentSection
                            paymentOptions={paymentOptions}
                            selectedPaymentId={selectedPaymentId}
                            setSelectedPaymentId={setSelectedPaymentId}
                            cardNumber={cardNumber}
                            cardHolder={cardHolder}
                            cardExpMonth={cardExpMonth}
                            cardExpYear={cardExpYear}
                            cardCvv={cardCvv}
                            cardInstallments={cardInstallments}
                            detectedBrand={detectedBrand}
                            onCardNumberChange={onCardNumberChange}
                            onCardHolderChange={onCardHolderChange}
                            onExpMonthChange={onExpMonthChange}
                            onExpYearChange={onExpYearChange}
                            onCvvChange={onCvvChange}
                            setCardInstallments={setCardInstallments}
                            installmentOptions={installmentOptions}
                            brandImageSrc={brandImageSrc}
                        />
                    </div>

                    <OrderSummary
                        cartItems={cart?.items}
                        itemsTotal={itemsTotal}
                        promotions={promotions}
                        freeGifts={freeGifts}
                        productDiscount={productDiscount}
                        currentFrete={currentFrete}
                        shippingDiscount={shippingDiscount}
                        appliedCoupon={appliedCoupon}
                        couponInput={couponInput}
                        setCouponInput={setCouponInput}
                        applyCoupon={applyCoupon}
                        removeCoupon={removeCoupon}
                        loadingPromo={loadingPromo}
                        promoError={promoError}
                        placingOrder={placingOrder}
                        handlePlaceOrder={handlePlaceOrder}
                        cardInstallments={cardInstallments}
                        installmentOptions={installmentOptions}
                        API_URL={API_URL}
                        totalWithInstallments={totalWithInstallments}
                        validatingCoupon={validatingCoupon}
                        skippedPromotions={skippedPromotions}
                    />
                </div>

                <AddressModal
                    open={addressModalOpen}
                    setOpen={setAddressModalOpen}
                    addressForm={addressForm}
                    setAddressForm={setAddressForm}
                    submitAddress={submitAddress}
                    editingId={editingId}
                    estadosBR={estadosBR}
                />

                <DeleteConfirmModal open={!!deleteTarget} onCancel={cancelDelete} onConfirm={confirmDelete} />
            </main>
            <FooterCheckout />
        </>
    )
}