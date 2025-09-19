'use client'

import { useState } from 'react'
import { api } from '@/services/apiClient'
import { toast } from 'react-toastify'
import { DEFAULT_MONTHLY_INTEREST } from '@/app/components/checkout/utils/paymentHelpers'
import type { CartItem as CartItemType } from 'Types/types'

export default function usePlaceOrder({
    cart,
    clearCart,
    router,
    isAuthenticated,
    user,
    addresses,
    selectedAddressId,
    shippingOptions,
    selectedShippingId,
    selectedPaymentId,
    promotions,
    appliedCoupon,
    currentFrete,
    totalWithInstallments,
    cardState, // { cardNumber, cardHolder, cardExpMonth, cardExpYear, cardCvv, cardInstallments, detectedBrand, payableBase, selectedInstallmentObj}
}: any) {
    const [placingOrder, setPlacingOrder] = useState(false)

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
            const { cardNumber, cardHolder, cardExpMonth, cardExpYear, cardCvv, cardInstallments, detectedBrand, payableBase, selectedInstallmentObj } = cardState
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
            const cvcLen = ((): number => {
                // heurística simples: 3 ou 4
                return cardCvv.length
            })()
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

            const selectedShipping = shippingOptions.find((s: any) => s.id === selectedShippingId)
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

            let payload: any = {
                cartId: cart?.id ?? null,
                shippingId: selectedShippingId,
                shippingLabel: shippingLabel,
                paymentId: selectedPaymentId,
                items: itemsForApi,
                customerNote: '',
                couponCode: appliedCoupon ?? undefined,
                shippingCost: currentFrete,
                shippingRaw: selectedShipping?.raw ?? selectedShipping ?? null,
                orderTotalOverride: totalWithInstallments,
                promotion_id: promotion_id,
                promotionDetails: promotionDetails,
            };

            if (isAuthenticated) {
                payload.addressId = selectedAddressId
            } else {
                if (selectedAddressId?.startsWith('guest-')) {
                    const localAddress = addresses.find((a: any) => a.id === selectedAddressId)
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

            // card attach if necessary
            if (String(selectedPaymentId).toLowerCase().includes('card')) {
                const { cardNumber, cardHolder, cardExpMonth, cardExpYear, cardCvv, cardInstallments, detectedBrand, payableBase, selectedInstallmentObj } = cardState
                const expMonth = String(cardExpMonth).padStart(2, '0')
                const expYear = String(cardExpYear).length === 2 ? `20${cardExpYear}` : String(cardExpYear)

                const perInstallment = selectedInstallmentObj?.perInstallment
                    ?? Number((payableBase / (cardInstallments ?? 1)).toFixed(2))

                const installmentPlan = {
                    installments: Number(cardInstallments ?? 1),
                    value: Number(perInstallment),
                    juros: Number(DEFAULT_MONTHLY_INTEREST || 0)
                }

                payload.card = {
                    number: cardNumber.replace(/\s+/g, ''),
                    holderName: cardHolder.trim(),
                    expirationMonth: expMonth,
                    expirationYear: expYear,
                    cvv: cardCvv,
                    installments: cardInstallments ?? 1,
                    brand: detectedBrand,
                    installment_value: Number(perInstallment),
                    installment_plan: installmentPlan,
                }
            }

            const resp = await api.post('/checkout/order', payload)
            const data = resp.data ?? {}

            const reservationWarnings = data.reservationWarnings ?? [];
            if (reservationWarnings && reservationWarnings.length > 0) {
                const msgs = reservationWarnings.join('; ');
                toast.warn(`Atenção sobre reservas de estoque: ${msgs}`);
            }

            const skipped = data.skippedPromotions ?? [];
            if (skipped && skipped.length > 0) {
                const msgs = skipped.map((s: { id: any; reason: any }) => `${s.reason}`).join('; ');
                toast.warn(`Algumas promoções não foram aplicadas: ${msgs}`);
            }

            try {
                const lastOrderObj = {
                    orderId: data.orderId ?? null,
                    orderTotal: totalWithInstallments,
                    shippingCost: currentFrete,
                    shippingAddress: ((): any => {
                        // attempt to find selected address
                        if (!isAuthenticated) return null
                        return null
                    })(),
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

    return { placingOrder, handlePlaceOrder }
}