'use client'

import { useEffect, useRef } from 'react'
import { setupAPIClient } from '@/services/api'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

export default function useAbandonedCart({
    cart,
    user,
    itemsTotal,
    totalWithInstallments,
    currentFrete,
    isAuthenticated,
}: {
    cart: any
    user: any
    itemsTotal: number
    totalWithInstallments: number
    currentFrete: number
    isAuthenticated?: boolean
}) {
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
            // não quebra a UI
            console.warn('Erro sendAbandonedViaClient', err)
        }
    }

    useEffect(() => {
        // mount: fetch addresses not responsibility aqui (só abandoned sync mount)
        let mounted = true
            ; (async () => {
                try {
                    if (isAuthenticated && user && cart) {
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
                    console.warn('useAbandonedCart mount error', err)
                }
            })()

        return () => {
            mounted = false
            if (syncTimerRef.current) { window.clearTimeout(syncTimerRef.current); syncTimerRef.current = null }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated, user?.id, cart?.id])

    // sync when selectedShipping / total changes
    useEffect(() => {
        if (!isAuthenticated || !user || !cart) return
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
    }, [currentFrete, totalWithInstallments, cart?.id])

    // sync when items change
    useEffect(() => {
        if (!isAuthenticated || !user || !cart) return
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

    // on exit: send with beacon/fetch keepalive
    useEffect(() => {
        if (!isAuthenticated || !user) return

        const handleSendOnExit = () => {
            const payload = mapCartToPayload(latestCartRef.current, latestUserRef.current, itemsTotal, totalWithInstallments)
            if (!payload || !payload.items || payload.items.length === 0) return

            const url = `${API_URL}/cart/abandoned`
            const data = JSON.stringify(payload)
            try {
                const blob = new Blob([data], { type: 'application/json' })
                if (navigator && typeof (navigator as any).sendBeacon === 'function') {
                    (navigator as any).sendBeacon(url, blob)
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
}