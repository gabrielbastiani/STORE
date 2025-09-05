'use client'

import React from 'react'
import { cvcLengthForBrand } from './utils/paymentHelpers'

type InstallmentOpt = { n: number; label: string; perInstallment: number; interestMonthly: number; interestApplied: boolean }

type Props = {
    cardNumber: string
    cardHolder: string
    cardExpMonth: string
    cardExpYear: string
    cardCvv: string
    cardInstallments: number | null
    detectedBrand: string
    installmentOptions: InstallmentOpt[]
    onCardNumberChange: (v: string) => void
    onCardHolderChange: (v: string) => void
    onExpMonthChange: (v: string) => void
    onExpYearChange: (v: string) => void
    onCvvChange: (v: string) => void
    setCardInstallments: (n: number) => void
    brandImageSrc: (brand: string) => string
}

export default function CardForm(props: Props) {
    const {
        cardNumber, cardHolder, cardExpMonth, cardExpYear, cardCvv, cardInstallments, detectedBrand, installmentOptions,
        onCardNumberChange, onCardHolderChange, onExpMonthChange, onExpYearChange, onCvvChange, setCardInstallments, brandImageSrc
    } = props

    return (
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
                        <input value={cardCvv} onChange={(e) => onCvvChange(e.target.value)} className="p-2 border rounded mt-1" placeholder={String(cvcLengthForBrand(detectedBrand))} />
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
    )
}