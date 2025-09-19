'use client'

import React from 'react'
import type { PaymentOption } from './types'
import CardForm from './CardForm'

type Props = {
    paymentOptions: PaymentOption[]
    selectedPaymentId?: string
    setSelectedPaymentId: (id: string) => void
    // card related props:
    cardNumber: string
    cardHolder: string
    cardExpMonth: string
    cardExpYear: string
    cardCvv: string
    cardInstallments: number | null
    detectedBrand: string
    onCardNumberChange: (v: string) => void
    onCardHolderChange: (v: string) => void
    onExpMonthChange: (v: string) => void
    onExpYearChange: (v: string) => void
    onCvvChange: (v: string) => void
    setCardInstallments: (n: number) => void
    installmentOptions: Array<{ n: number; label: string; perInstallment: number; interestMonthly: number; interestApplied: boolean }>
    brandImageSrc: (brand: string) => string
}

export default function PaymentSection(props: Props) {
    
    const {
        paymentOptions, selectedPaymentId, setSelectedPaymentId,
        cardNumber, cardHolder, cardExpMonth, cardExpYear, cardCvv, cardInstallments, detectedBrand,
        onCardNumberChange, onCardHolderChange, onExpMonthChange, onExpYearChange, onCvvChange, setCardInstallments, installmentOptions, brandImageSrc
    } = props

    return (
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

                        {/* Cartão */}
                        {selectedPaymentId === p.id && String(p.method).toLowerCase().includes('card') && (
                            <CardForm
                                cardNumber={cardNumber} cardHolder={cardHolder} cardExpMonth={cardExpMonth} cardExpYear={cardExpYear}
                                cardCvv={cardCvv} cardInstallments={cardInstallments} detectedBrand={detectedBrand}
                                installmentOptions={installmentOptions}
                                onCardNumberChange={onCardNumberChange}
                                onCardHolderChange={onCardHolderChange}
                                onExpMonthChange={onExpMonthChange}
                                onExpYearChange={onExpYearChange}
                                onCvvChange={onCvvChange}
                                setCardInstallments={setCardInstallments}
                                brandImageSrc={brandImageSrc}
                            />
                        )}
                    </div>
                ))}
            </div>
        </section>
    )
}