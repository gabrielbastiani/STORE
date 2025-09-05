'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-toastify'
import { useTheme } from '@/app/contexts/ThemeContext'
import { NavbarCheckout } from '@/app/components/navbar/navbarCheckout'
import { FooterCheckout } from '@/app/components/footer/footerCheckout'
import { api } from '@/services/apiClient'
import { buildShippingMethod, findDeliveryTimeString, OrderData } from '@/app/components/orderSuccess/orderUtils'
import DownloadOverlay from '@/app/components/orderSuccess/DownloadOverlay'
import OrderSuccessHeader from '@/app/components/orderSuccess/OrderSuccessHeader'
import PaymentSection from '@/app/components/orderSuccess/PaymentSection'
import DeliverySection from '@/app/components/orderSuccess/DeliverySection'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

export default function OrderSuccessPage({ params }: { params: any }) {

    const router = useRouter()
    const { colors } = useTheme()
    const [orderData, setOrderData] = useState<OrderData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [downloadingBoleto, setDownloadingBoleto] = useState(false)
    const [downloadingBoletoId, setDownloadingBoletoId] = useState<string | null>(null)
    const [showDownloadOverlay, setShowDownloadOverlay] = useState(false)
    const [downloadStatus, setDownloadStatus] = useState<'pending' | 'processing' | 'completed' | 'failed'>('pending')

    useEffect(() => {
        let mounted = true
        const loadOrderData = async () => {
            setLoading(true)
            setError(null)

            let id: string | null = null
            try {
                if (params && typeof params.then === 'function') {
                    const resolved = await params
                    id = resolved?.id ?? null
                } else {
                    id = params?.id ?? null
                }
            } catch (e) {
                id = params?.id ?? null
            }

            if (!id) {
                if (mounted) { setError('ID do pedido não encontrado'); setLoading(false) }
                return
            }

            try {
                const sessionKey = `lastOrder:${id}`
                const sessionData = typeof window !== 'undefined' ? sessionStorage.getItem(sessionKey) : null
                let sessionParsed: any = null
                if (sessionData) {
                    try { sessionParsed = JSON.parse(sessionData) } catch { sessionParsed = null }
                }

                const response = await api.get(`/order/${id}`)
                const data = response.data
                if (!data) throw new Error('Dados do pedido não foram retornados pela API')

                const normalizedFromApi: OrderData = {
                    id: data.id ?? id,
                    id_order_store: data.id_order_store ?? undefined,
                    total: data.total ?? data.amount ?? undefined,
                    shippingCost: data.shippingCost ?? data.shipping_cost ?? data.shipping?.cost ?? undefined,
                    grandTotal: data.grandTotal ?? data.grand_total ?? undefined,
                    shippingAddress: data.shippingAddress ?? data.address ?? data.shipping?.address ?? undefined,
                    shippingMethod: data.shippingLabel ?? data.shippingMethod ?? data.shipping?.method ?? undefined,
                    customer: data.customer ?? undefined,
                    items: data.items ?? undefined,
                    payments: data.payments ?? (data.payment ? [data.payment] : undefined),
                    createdAt: data.createdAt ?? data.created_at ?? undefined,
                    raw: data,
                }

                if (sessionParsed) {
                    const sp = sessionParsed.orderData ?? sessionParsed
                    if (sp) {
                        if (sp.shippingLabel) normalizedFromApi.shippingMethod = sp.shippingLabel
                        if (sp.shippingRaw) { normalizedFromApi.raw = normalizedFromApi.raw ?? {}; normalizedFromApi.raw.shippingRaw = sp.shippingRaw }
                        if (!normalizedFromApi.createdAt && sp.createdAt) normalizedFromApi.createdAt = sp.createdAt
                    }
                }

                setOrderData(normalizedFromApi)
            } catch (err: any) {
                console.error('Erro ao carregar pedido:', err)
                const msg = err?.response?.data?.message ?? err?.message ?? 'Erro ao carregar dados do pedido'
                setError(msg)
            } finally { if (mounted) setLoading(false) }
        }
        loadOrderData()
        return () => { mounted = false }
    }, [params])

    const copyToClipboard = async (text: string, label: string) => {
        try {
            if (!text) throw new Error('vazio')
            await navigator.clipboard.writeText(text)
            toast.success(`${label} copiado para a área de transferência`)
        } catch {
            toast.error(`Não foi possível copiar ${label}`)
        }
    }

    async function downloadPdfProxy(paymentObj: any) {
        if (!paymentObj && !orderData?.id) return
        setDownloadingBoleto(true)
        setDownloadingBoletoId(paymentObj?.id || String(orderData?.id))
        setShowDownloadOverlay(true)
        setDownloadStatus('processing')

        const paymentId = paymentObj?.id || orderData?.id
        const proxyUrl = `${API_URL}/payments/${paymentId}/boleto`

        try {
            const link = document.createElement('a')
            link.href = proxyUrl
            link.target = '_blank'
            link.download = `boleto-${paymentId}.pdf`
            link.onclick = () => {
                setTimeout(() => { setDownloadStatus('completed'); setTimeout(() => { setShowDownloadOverlay(false); setDownloadingBoleto(false); setDownloadingBoletoId(null) }, 1000) }, 3000)
            }
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)

            setTimeout(() => {
                if (downloadStatus === 'processing') {
                    setDownloadStatus('completed')
                    setTimeout(() => { setShowDownloadOverlay(false); setDownloadingBoleto(false); setDownloadingBoletoId(null) }, 1000)
                }
            }, 8000)
        } catch (error) {
            console.error('Erro ao processar boleto:', error)
            setDownloadStatus('failed')
            toast.error('Não foi possível processar o boleto automaticamente')
            setTimeout(() => { setShowDownloadOverlay(false); setDownloadingBoleto(false); setDownloadingBoletoId(null) }, 3000)
        }
    }

    async function printPdfProxy(paymentObj: any) {
        if (!paymentObj && !orderData?.id) return
        setDownloadingBoleto(true)
        setDownloadingBoletoId(paymentObj?.id || String(orderData?.id))
        setShowDownloadOverlay(true)
        setDownloadStatus('processing')

        const paymentId = paymentObj?.id || orderData?.id
        const proxyUrl = `${API_URL}/payments/${paymentId}/boleto`
        const printWindow = window.open('', '_blank')
        if (!printWindow) {
            setDownloadStatus('failed')
            toast.error('Permita pop-ups para esta página para imprimir o boleto')
            setTimeout(() => { setShowDownloadOverlay(false); setDownloadingBoleto(false); setDownloadingBoletoId(null) }, 3000)
            return
        }

        try {
            const res = await fetch(proxyUrl, { method: 'GET', headers: { Accept: 'application/pdf' } })
            if (!res.ok) throw new Error(`Falha ao obter PDF: ${res.status}`)
            const blob = await res.blob()
            const blobUrl = URL.createObjectURL(blob)
            const html = `<!doctype html><html><head><title>Imprimir Boleto</title><meta charset="utf-8"></head><body style="margin:0;padding:0;"><iframe id="pdfFrame" src="${blobUrl}" style="border:none;width:100%;height:100vh;" frameborder="0"></iframe><script>(function(){var iframe=document.getElementById('pdfFrame');function tryPrint(){try{if(iframe&&iframe.contentWindow){iframe.contentWindow.focus();iframe.contentWindow.print();}else{window.print();}}catch(e){try{window.print();}catch(_){}}}iframe.onload=function(){setTimeout(tryPrint,300);}setTimeout(tryPrint,2000);window.onafterprint=function(){setTimeout(function(){window.close();},200);}setTimeout(function(){try{URL.revokeObjectURL('${blobUrl}');}catch(e){}},10000);})();</script></body></html>`
            printWindow.document.open()
            printWindow.document.write(html)
            printWindow.document.close()
            setDownloadStatus('completed')
            setTimeout(() => { setShowDownloadOverlay(false); setDownloadingBoleto(false); setDownloadingBoletoId(null) }, 1200)
        } catch (error) {
            console.error('Erro ao imprimir boleto:', error)
            setDownloadStatus('failed')
            toast.error('Não foi possível preparar o boleto para impressão automaticamente. Abrindo em nova aba...')
            try { printWindow.location.href = proxyUrl } catch (e) { try { printWindow.close() } catch (_) { } }
            setTimeout(() => { setShowDownloadOverlay(false); setDownloadingBoleto(false); setDownloadingBoletoId(null) }, 3000)
        }
    }

    const closeOverlay = () => { setShowDownloadOverlay(false); setDownloadingBoleto(false); setDownloadingBoletoId(null) }

    if (loading) {
        return (
            <>
                <NavbarCheckout />
                <main className="flex-1 flex items-center justify-center py-16" style={{ background: colors?.segundo_fundo_layout_site || '#e1e4e9' }}>
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
                        <p className="text-gray-600">Carregando dados do pedido...</p>
                    </div>
                </main>
                <FooterCheckout />
            </>
        )
    }

    if (error || !orderData) {
        return (
            <>
                <NavbarCheckout />
                <main className="flex-1 flex items-center justify-center py-16" style={{ background: colors?.segundo_fundo_layout_site || '#e1e4e9' }}>
                    <div className="text-center">
                        <div className="text-red-500 text-6xl mb-4">⚠️</div>
                        <h1 className="text-2xl font-bold text-gray-800 mb-2">Oops! Algo deu errado</h1>
                        <p className="text-gray-600 mb-6">{error || 'Pedido não encontrado'}</p>
                        <button onClick={() => router.push('/')} className="bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 transition-colors">Voltar ao início</button>
                    </div>
                </main>
                <FooterCheckout />
            </>
        )
    }

    const payment = orderData.payments?.[0]
    const rawDeliveryTime = findDeliveryTimeString(orderData)
    const deliveryTimeDisplay = rawDeliveryTime ? (rawDeliveryTime.toLowerCase().includes('prazo') ? rawDeliveryTime : `Prazo estimado: ${rawDeliveryTime}`) : null
    const shippingMethodDisplay = buildShippingMethod(orderData)
    const isDownloadingCurrentBoleto = downloadingBoleto && downloadingBoletoId === (payment?.id || String(orderData.id))

    return (
        <>
            <NavbarCheckout />
            <main className="flex-1 py-8 px-4 text-black relative" style={{ background: colors?.segundo_fundo_layout_site || '#e1e4e9' }}>
                <DownloadOverlay show={showDownloadOverlay} status={downloadStatus} onClose={closeOverlay} />

                <div className="max-w-4xl mx-auto">
                    <OrderSuccessHeader order={orderData} />

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <PaymentSection order={orderData} copyToClipboard={copyToClipboard} downloadPdfProxy={downloadPdfProxy} printPdfProxy={printPdfProxy} downloading={downloadingBoleto} isDownloadingCurrent={isDownloadingCurrentBoleto} />

                        <DeliverySection order={orderData} deliveryTimeDisplay={deliveryTimeDisplay} shippingMethodDisplay={shippingMethodDisplay} />

                        <div className="lg:col-span-3 bg-white rounded-2xl shadow-lg p-6">
                            <button onClick={() => router.push('/meus-dados')} className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 rounded">Ver meus pedidos</button>
                        </div>
                    </div>
                </div>
            </main>
            <FooterCheckout />
        </>
    )
}