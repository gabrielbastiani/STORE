const MAX_INSTALLMENTS_BY_BRAND: Record<string, number> = {
    visa: 21, mastercard: 21, amex: 12, elo: 12, hipercard: 12,
    diners: 12, discover: 12, jcb: 12, maestro: 12, aura: 12, unknown: 12
}
const NO_INTEREST_MAX_BY_BRAND: Record<string, number> = {
    visa: 12, mastercard: 12, amex: 6, elo: 6, hipercard: 6,
    diners: 6, discover: 6, jcb: 6, maestro: 6, aura: 6, unknown: 3
}
export const DEFAULT_MONTHLY_INTEREST = 1.99

export function currency(v: number) {
    return v?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) ?? 'R$ 0,00'
}

export function detectCardBrandFromNumber(numRaw: string): string {
    const n = (numRaw || '').replace(/\D/g, '')
    if (!n) return 'unknown'
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
        if (re[k].test(n)) return k
    }
    return 'unknown'
}

export function formatCardNumberForDisplay(numRaw: string, brand: string) {
    const n = (numRaw || '').replace(/\D/g, '')
    if (brand === 'amex') {
        return n.replace(/^(.{4})(.{6})(.{0,5}).*$/, (_m, a, b, c) => [a, b, c].filter(Boolean).join(' ')).trim()
    }
    return n.replace(/(.{4})/g, '$1 ').trim()
}

export function cvcLengthForBrand(brand: string) {
    return brand === 'amex' ? 4 : 3
}

export function generateInstallmentOptions(total: number, brand: string) {
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