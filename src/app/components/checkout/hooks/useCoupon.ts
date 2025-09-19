'use client'

import { useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

export default function useCoupon({ cart, user, cepFromSelectedAddress, currentFrete }: { cart: any, user?: any, cepFromSelectedAddress?: string, currentFrete?: number }) {
    
    const [couponInput, setCouponInput] = useState('')
    const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null)
    const [validatingCoupon, setValidatingCoupon] = useState(false)

    async function applyCoupon() {
        const code = couponInput.trim();
        if (!code) return;
        setValidatingCoupon(true);
        try {
            const res = await axios.post(`${API_URL}/coupon/validate`, {
                cartItems: (cart.items || []).map((i: any) => ({
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

    return {
        couponInput,
        setCouponInput,
        appliedCoupon,
        validatingCoupon,
        applyCoupon,
        removeCoupon,
    }
}