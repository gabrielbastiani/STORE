'use client'

import { useMemo, useState } from 'react'
import { detectCardBrandFromNumber, formatCardNumberForDisplay, cvcLengthForBrand, generateInstallmentOptions, DEFAULT_MONTHLY_INTEREST } from '@/app/components/checkout/utils/paymentHelpers'

export default function useCard(payableBase: number) {
    const [cardNumber, setCardNumber] = useState('')
    const [cardHolder, setCardHolder] = useState('')
    const [cardExpMonth, setCardExpMonth] = useState('')
    const [cardExpYear, setCardExpYear] = useState('')
    const [cardCvv, setCardCvv] = useState('')
    const [cardInstallments, setCardInstallments] = useState<number | null>(1)
    const [detectedBrand, setDetectedBrand] = useState<string>('unknown')

    const currentBrand = detectedBrand ?? 'unknown'
    const installmentOptions = useMemo(() => generateInstallmentOptions(payableBase, currentBrand), [payableBase, currentBrand])
    const selectedInstallmentObj = installmentOptions.find(i => i.n === (cardInstallments ?? 1))
    const totalWithInstallments = selectedInstallmentObj ? Number((selectedInstallmentObj.perInstallment * selectedInstallmentObj.n).toFixed(2)) : payableBase

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

    function brandImageSrc(brand: string) { return `/card-brands/${brand}.png` }

    return {
        cardNumber,
        cardHolder,
        cardExpMonth,
        cardExpYear,
        cardCvv,
        cardInstallments,
        detectedBrand,
        onCardNumberChange,
        onCardHolderChange,
        onExpMonthChange,
        onExpYearChange,
        onCvvChange,
        setCardInstallments,
        installmentOptions,
        totalWithInstallments,
        brandImageSrc,
        DEFAULT_MONTHLY_INTEREST,
    }
}