'use client'

import { useEffect, useState } from 'react'
import { api } from '@/services/apiClient'
import type { PaymentOption } from '../types'

export default function usePayments() {
    
    const [paymentOptions, setPaymentOptions] = useState<PaymentOption[]>([])
    const [selectedPaymentId, setSelectedPaymentId] = useState<string | undefined>(undefined)

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
                    { id: 'asaas-pix', provider: 'Asaas', method: 'PIX', label: 'PIX', description: 'Pague com PIX' } as PaymentOption,
                    { id: 'asaas-boleto', provider: 'Asaas', method: 'BOLETO', label: 'Boleto', description: 'Pague com boleto' } as PaymentOption,
                    { id: 'asaas-card', provider: 'Asaas', method: 'CARD', label: 'Cartão', description: 'Cartão de crédito' } as PaymentOption,
                ])
            }
        })()
    }, [])

    return { paymentOptions, selectedPaymentId, setSelectedPaymentId }
}