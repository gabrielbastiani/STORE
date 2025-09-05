export interface OrderData {
    id: string | number
    id_order_store: string
    total?: number
    shippingCost?: number
    grandTotal?: number
    shippingAddress?: string | null
    shippingMethod?: string | null
    customer?: { id: string; name?: string | null; email?: string | null }
    items?: Array<{ id?: string | number; product_id: string; price: number; quantity: number; name?: string | null }>
    payments?: Array<any>
    createdAt?: Date | string | null
    raw?: any
}

export const currency = (v: number) => v?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) ?? 'R$ 0,00'

export function parseDatePreserveLocal(input?: string | Date | null): Date | null {
    if (input === null || input === undefined) return null
    if (input instanceof Date) return input
    const s = String(input).trim()
    if (!s) return null

    const midnightZ = s.match(/^(\d{4})-(\d{2})-(\d{2})T00:00:00(?:\.\d+)?Z$/)
    if (midnightZ) {
        const year = Number(midnightZ[1])
        const month = Number(midnightZ[2]) - 1
        const day = Number(midnightZ[3])
        return new Date(year, month, day)
    }

    if (/[zZ]$|[+\-]\d{2}:\d{2}$/.test(s)) {
        const d = new Date(s)
        return isNaN(d.getTime()) ? null : d
    }

    const dateOnly = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (dateOnly) {
        const year = Number(dateOnly[1])
        const month = Number(dateOnly[2]) - 1
        const day = Number(dateOnly[3])
        return new Date(year, month, day)
    }

    const dt = s.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?$/)
    if (dt) {
        const year = Number(dt[1])
        const month = Number(dt[2]) - 1
        const day = Number(dt[3])
        const hour = Number(dt[4]) || 0
        const minute = Number(dt[5]) || 0
        const second = Number(dt[6]) || 0
        const ms = dt[7] ? Number((dt[7] + '000').slice(0, 3)) : 0
        return new Date(year, month, day, hour, minute, second, ms)
    }

    const fallback = new Date(s)
    if (!isNaN(fallback.getTime())) return fallback
    return null
}

export const formatDateTime = (dateInput?: string | Date | null) => {
    const d = parseDatePreserveLocal(dateInput)
    if (!d) return ''
    return d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })
}

export const generateQRCodeUrl = (text: string) => `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(text)}`

export const findDeliveryTimeString = (od: OrderData): string | null => {
    try {
        const sessionKey = `lastOrder:${od.id}`
        const raw = typeof window !== 'undefined' ? sessionStorage.getItem(sessionKey) : null
        if (raw) {
            try {
                const parsed = JSON.parse(raw)
                const sp = parsed.orderData ?? parsed
                if (sp) {
                    const cand =
                        sp.shippingRaw?.deliveryTime ??
                        sp.shippingRaw?.delivery_time ??
                        sp.shippingRaw?.delivery ??
                        sp.shippingRaw?.deadline ??
                        sp.shippingLabel ??
                        sp.shippingMethod ??
                        null
                    if (typeof cand === 'string' && cand.trim() !== '') return cand.trim()
                }
            } catch { }
        }
    } catch { }

    const r = (od as any).raw ?? {}
    const directCandidates = [
        od.shippingMethod as any,
        r.deliveryTime,
        r.delivery_time,
        r.shipping?.deliveryTime,
        r.shipping?.delivery_time,
        r.shippingRaw?.deliveryTime,
        r.shippingRaw?.delivery_time,
        r.shippingRaw?.delivery,
        r.shippingRaw?.deadline,
        r.delivery?.deliveryTime,
    ]
    for (const c of directCandidates) {
        if (typeof c === 'string' && c.trim() !== '00:00') return c.trim()
    }

    const arrays = [r.options, r.shippingOptions, r.quotes, r.shipping?.options, r.optionsArray].filter(Boolean)
    for (const arr of arrays) {
        if (!Array.isArray(arr)) continue
        const idStr = od.shippingMethod != null ? String(od.shippingMethod) : null
        if (idStr) {
            const found = arr.find((o: any) => String(o.id) === idStr || String(o.shippingId) === idStr || String(o.optionId) === idStr)
            if (found) {
                const cand = found.deliveryTime ?? found.delivery_time ?? found.delivery ?? null
                if (typeof cand === 'string' && cand.trim() !== '') return cand.trim()
            }
        }
        const first = arr[0]
        if (first) {
            const cand = first.deliveryTime ?? first.delivery_time ?? first.delivery ?? null
            if (typeof cand === 'string' && cand.trim() !== '') return cand.trim()
        }
    }

    const fallbackCandidates = [r.shippingRaw, r.shipping, r.freight, r.shipment, r]
    for (const candObj of fallbackCandidates) {
        if (!candObj) continue
        const cand = candObj.deliveryTime ?? candObj.delivery_time ?? candObj.delivery ?? candObj.deadline ?? null
        if (typeof cand === 'string' && cand.trim() !== '') return cand.trim()
    }

    return null
}

export const buildShippingMethod = (od: OrderData) => {
    const raw = (od as any).raw ?? {}
    if (od.shippingMethod && typeof od.shippingMethod === 'string' && od.shippingMethod.trim() !== '' && !/^\d+$/.test(String(od.shippingMethod))) {
        return od.shippingMethod
    }

    try {
        const sessionKey = `lastOrder:${od.id}`
        const rawSession = typeof window !== 'undefined' ? sessionStorage.getItem(sessionKey) : null
        if (rawSession) {
            const parsed = JSON.parse(rawSession)
            const sp = parsed.orderData ?? parsed
            if (sp) {
                if (sp.shippingLabel) return sp.shippingLabel
                if (sp.shippingRaw?.name) return sp.shippingRaw.name
            }
        }
    } catch { }

    const candidates = [
        raw.shippingRaw,
        raw.shipping,
        raw.options?.find?.((o: any) => String(o.id) === String(od.shippingMethod)) ?? null,
        raw.shippingOptions?.find?.((o: any) => String(o.id) === String(od.shippingMethod)) ?? null,
        raw.options?.[0] ?? null,
        raw.shipping?.name ?? raw.provider ?? raw.carrier ?? null
    ]
    for (const c of candidates) {
        if (!c) continue
        if (typeof c === 'string' && c.trim() !== '') return c
        if (typeof c.name === 'string' && c.name.trim() !== '') return c.name
        if (typeof c.service === 'string' && c.service.trim() !== '') return c.service
        if (typeof c.provider === 'string' && c.provider.trim() !== '') return c.provider
        if (typeof c.carrier === 'string' && c.carrier.trim() !== '') return c.carrier
    }

    if (od.shippingMethod != null) {
        const s = String(od.shippingMethod)
        if (/^\d+$/.test(s)) return `Transportadora #${s}`
        if (s.trim() !== '') return s
    }
    return 'Padrão'
}

export const getPixBase64FromPayment = (p: any) => {
    return p?.pix_qr_image ?? p?.pix_qr_image_base64 ?? p?.gateway_response?.pix_qr_image ?? p?.gateway_response?.raw?.pix_qr_image ?? p?.gateway_response?.raw?.encodedImage ?? null
}

export const isPixPayment = (payment?: any) => payment?.method === 'PIX' || (payment?.method && String(payment.method).toUpperCase().includes('PIX'))
export const isBoletoPayment = (payment?: any) => payment?.method === 'BOLETO' || (payment?.method && String(payment.method).toUpperCase().includes('BOLETO'))
export const isCardPayment = (payment?: any) => payment?.method === 'CREDIT_CARD' || payment?.method === 'CARD' || (payment?.method && String(payment.method).toUpperCase().includes('CARD'))