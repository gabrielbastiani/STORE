'use client'

import { useContext, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { AuthContextStore } from '@/app/contexts/AuthContextStore'
import { useCart } from '@/app/contexts/CartContext'
import useAddresses from './useAddresses'
import useShipping from './useShipping'
import usePayments from './usePayments'
import useCard from './useCard'
import useCoupon from './useCoupon'
import usePlaceOrder from './usePlaceOrder'
import useAbandonedCart from './useAbandonedCart'
import type { AddressLocal } from '../types'

export default function useFinishOrder() {

    const router = useRouter()
    const { user, isAuthenticated } = useContext(AuthContextStore)
    const { cart, clearCart } = useCart()

    // totals
    const itemsTotal = useMemo(() => {
        if (!cart?.items) return 0
        return cart.items.reduce((s: number, it: any) => s + (it.price ?? 0) * (it.quantity ?? 0), 0)
    }, [cart])

    // trechos do useFinishOrder (substituir a seção correspondente)
  // addresses hook
  const addressesHook = useAddresses({ isAuthenticated, user })
  const { addresses, selectedAddressId } = addressesHook

  // shipping hook - PASSANDO selectedAddressId para CORRIGIR lookup de CEP
  const shippingHook = useShipping({ cart, addresses, selectedAddressId })
  const { shippingOptions, selectedShippingId } = shippingHook

    // compute frete from shippingOptions
    const currentFrete = useMemo(() => {
        const s = shippingOptions.find((o) => o.id === selectedShippingId)
        return s?.price ?? 0
    }, [shippingOptions, selectedShippingId])

    // promotions hook (you already have usePromotions in your project)
    const { discountTotal, productDiscount: productDiscountFromService, shippingDiscount: shippingDiscountFromService, promotions, skippedPromotions, loading: loadingPromo, error: promoError, freeGifts } =
        // eslint-disable-next-line react-hooks/rules-of-hooks
        require('@/app/hooks/usePromotions').usePromotions(((): string => {
            const sel = addresses.find((a: AddressLocal) => a.id === selectedAddressId)
            return sel?.zipCode ?? ''
        })(), null, currentFrete, user?.id ?? null)

    // compute discounts
    const shippingDiscountRaw = typeof shippingDiscountFromService === 'number'
        ? shippingDiscountFromService
        : (promotions?.filter((p: any) => p.type === 'shipping').reduce((s: number, p: any) => s + (p.discount ?? 0), 0) ?? 0)

    const productDiscountRaw = typeof productDiscountFromService === 'number'
        ? productDiscountFromService
        : ((discountTotal ?? 0) - shippingDiscountRaw)

    const shippingDiscount = Number((shippingDiscountRaw || 0).toFixed(2))
    const productDiscount = Number((productDiscountRaw || 0).toFixed(2))

    const payableBase = Number(((itemsTotal ?? 0) - productDiscount + (currentFrete ?? 0) - shippingDiscount).toFixed(2))

    // card hook (depends on payableBase)
    const cardHook = useCard(payableBase)

    // coupon hook
    const couponHook = useCoupon({ cart, user, cepFromSelectedAddress: (addresses.find(a => a.id === selectedAddressId)?.zipCode ?? ''), currentFrete })

    // payments
    const paymentsHook = usePayments()

    // abandoned cart (side-effects only)
    useAbandonedCart({
        cart,
        user,
        itemsTotal,
        totalWithInstallments: cardHook.totalWithInstallments,
        currentFrete,
        isAuthenticated,
    })

    // place order hook
    const placeOrderHook = usePlaceOrder({
        cart,
        clearCart,
        router,
        isAuthenticated,
        user,
        addresses,
        selectedAddressId,
        shippingOptions,
        selectedShippingId,
        selectedPaymentId: paymentsHook.selectedPaymentId,
        promotions,
        appliedCoupon: couponHook.appliedCoupon,
        currentFrete,
        totalWithInstallments: cardHook.totalWithInstallments,
        cardState: {
            cardNumber: cardHook.cardNumber,
            cardHolder: cardHook.cardHolder,
            cardExpMonth: cardHook.cardExpMonth,
            cardExpYear: cardHook.cardExpYear,
            cardCvv: cardHook.cardCvv,
            cardInstallments: cardHook.cardInstallments,
            detectedBrand: cardHook.detectedBrand,
            payableBase,
            selectedInstallmentObj: cardHook.installmentOptions.find((i: any) => i.n === (cardHook.cardInstallments ?? 1))
        }
    })

    // estados list (unchanged)
    const estadosBR = [
        "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
        "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
        "RS", "RO", "RR", "SC", "SP", "SE", "TO"
    ]

    // expose same API (you can add/remove fields as needed)
    return {
        // contexts
        user,
        isAuthenticated,
        cart,
        clearCart,
        // addresses (from useAddresses)
        ...addressesHook,
        // shipping (from useShipping)
        ...shippingHook,
        // payments
        ...paymentsHook,
        // card
        ...cardHook,
        // coupon
        ...couponHook,
        // place order
        ...placeOrderHook,
        // promos/totals
        itemsTotal,
        promotions,
        skippedPromotions,
        loadingPromo,
        promoError,
        freeGifts,
        productDiscount,
        shippingDiscount,
        currentFrete,
        payableBase,
        // constants
        estadosBR,
    }
}