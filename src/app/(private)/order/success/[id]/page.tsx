'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-toastify'
import { useTheme } from '@/app/contexts/ThemeContext'
import { NavbarCheckout } from '@/app/components/navbar/navbarCheckout'
import { FooterCheckout } from '@/app/components/footer/footerCheckout'
import { api } from '@/services/apiClient'
import { CheckCircle, Copy, Download, Clock, FileText, Truck, MapPin, QrCode, CircleDollarSign, CreditCard, Loader2, X } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

interface OrderData {
    id: string | number
    id_order_store: string
    total?: number
    shippingCost?: number
    grandTotal?: number
    shippingAddress?: string | null
    shippingMethod?: string | null
    customer?: {
        id: string
        name?: string | null
        email?: string | null
        phone?: string | null
        cpf?: string | null
        asaas_customer_id?: string | null
    } | null
    items?: Array<{
        id?: string | number
        product_id: string
        price: number
        quantity: number
        name?: string | null
    }>
    payments?: Array<{
        id: any
        amount: number
        method: string
        status: string
        transaction_id?: string | null
        asaas_payment_id?: string | null
        boleto_url?: string | null
        boleto_barcode?: string | null
        pix_qr_code?: string | null
        pix_expiration?: string | null
        gateway_response?: any
        created_at?: string | null
    }>
    createdAt?: Date | string | null
    raw?: any
}

const currency = (v: number) =>
    v?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) ?? 'R$ 0,00'

function parseDatePreserveLocal(input?: string | Date | null): Date | null {
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

    // data apenas YYYY-MM-DD
    const dateOnly = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (dateOnly) {
        const year = Number(dateOnly[1])
        const month = Number(dateOnly[2]) - 1
        const day = Number(dateOnly[3])
        return new Date(year, month, day)
    }

    // data-hora sem timezone: YYYY-MM-DDTHH:MM(:ss(.ms)?)?
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

    // fallback: tentar new Date()
    const fallback = new Date(s)
    if (!isNaN(fallback.getTime())) return fallback
    return null
}

const formatDateTime = (dateInput?: string | Date | null) => {
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

// Gerador de QR público (usado apenas se não houver base64 vindo do gateway)
const generateQRCodeUrl = (text: string) => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(text)}`
}

/* ---------- função que localiza a string de deliveryTime sem transformar nada ---------- */
const findDeliveryTimeString = (od: OrderData): string | null => {
    try {
        const sessionKey = `lastOrder:${od.id}`
        const raw = sessionStorage.getItem(sessionKey)
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
            } catch { /* ignore */ }
        }
    } catch { /* ignore sessionStorage errors */ }

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
/* ---------- fim função ---------- */

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

    const copyToClipboard = async (text: string, label: string) => {
        try {
            if (!text) throw new Error('vazio')
            await navigator.clipboard.writeText(text)
            toast.success(`${label} copiado para a área de transferência`)
        } catch {
            toast.error(`Não foi possível copiar ${label}`)
        }
    }

    useEffect(() => {
        let mounted = true

        const loadOrderData = async () => {
            setLoading(true)
            setError(null)

            // resolve id (params pode ser promise no App Router)
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
                if (mounted) {
                    setError('ID do pedido não encontrado')
                    setLoading(false)
                }
                return
            }

            try {
                const sessionKey = `lastOrder:${id}`
                const sessionData = sessionStorage.getItem(sessionKey)
                let sessionParsed: any = null
                if (sessionData) {
                    try {
                        sessionParsed = JSON.parse(sessionData)
                    } catch {
                        sessionParsed = null
                    }
                }

                const response = await api.get(`/order/${id}`)
                const data = response.data

                if (!data) {
                    throw new Error('Dados do pedido não foram retornados pela API')
                }

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
                        if (sp.shippingLabel) {
                            normalizedFromApi.shippingMethod = sp.shippingLabel
                        }
                        if (sp.shippingRaw) {
                            normalizedFromApi.raw = normalizedFromApi.raw ?? {}
                            normalizedFromApi.raw.shippingRaw = sp.shippingRaw
                        }
                        if (!normalizedFromApi.createdAt && sp.createdAt) normalizedFromApi.createdAt = sp.createdAt
                    }
                }

                setOrderData(normalizedFromApi)

            } catch (err: any) {
                console.error('Erro ao carregar pedido:', err)
                const msg = err?.response?.data?.message ?? err?.message ?? 'Erro ao carregar dados do pedido'
                setError(msg)
            } finally {
                if (mounted) setLoading(false)
            }
        }

        loadOrderData()

        return () => { mounted = false }
    }, [params])

    const buildShippingMethod = (od: OrderData) => {
        const raw = (od as any).raw ?? {}
        if (od.shippingMethod && typeof od.shippingMethod === 'string' && od.shippingMethod.trim() !== '' && !/^\d+$/.test(String(od.shippingMethod))) {
            return od.shippingMethod
        }

        try {
            const sessionKey = `lastOrder:${od.id}`
            const rawSession = sessionStorage.getItem(sessionKey)
            if (rawSession) {
                const parsed = JSON.parse(rawSession)
                const sp = parsed.orderData ?? parsed
                if (sp) {
                    if (sp.shippingLabel) return sp.shippingLabel
                    if (sp.shippingRaw?.name) return sp.shippingRaw.name
                }
            }
        } catch { /* ignore */ }

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

    const shippingMethodDisplay = orderData ? buildShippingMethod(orderData) : ''

    async function downloadPdfProxy(paymentObj: any) {
        if (!paymentObj && !orderData?.id) return;

        setDownloadingBoleto(true);
        setDownloadingBoletoId(paymentObj?.id || String(orderData?.id));
        setShowDownloadOverlay(true);
        setDownloadStatus('processing');

        const paymentId = paymentObj?.id || orderData?.id;
        const proxyUrl = `${API_URL}/payments/${paymentId}/boleto`;

        try {
            // Usar uma abordagem mais confiável com link temporário
            const link = document.createElement('a');
            link.href = proxyUrl;
            link.target = '_blank';
            link.download = `boleto-${paymentId}.pdf`;

            // Adicionar evento para detectar quando o download é iniciado
            link.onclick = () => {
                // Fechar o modal após um tempo suficiente para o download iniciar
                setTimeout(() => {
                    setDownloadStatus('completed');
                    setTimeout(() => {
                        setShowDownloadOverlay(false);
                        setDownloadingBoleto(false);
                        setDownloadingBoletoId(null);
                    }, 1000);
                }, 3000);
            };

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Timeout de segurança para garantir que não fique travado
            setTimeout(() => {
                if (downloadStatus === 'processing') {
                    setDownloadStatus('completed');
                    setTimeout(() => {
                        setShowDownloadOverlay(false);
                        setDownloadingBoleto(false);
                        setDownloadingBoletoId(null);
                    }, 1000);
                }
            }, 8000);

        } catch (error) {
            console.error('Erro ao processar boleto:', error);
            setDownloadStatus('failed');
            toast.error('Não foi possível processar o boleto automaticamente');

            setTimeout(() => {
                setShowDownloadOverlay(false);
                setDownloadingBoleto(false);
                setDownloadingBoletoId(null);
            }, 3000);
        }
    }

    async function printPdfProxy(paymentObj: any) {
        if (!paymentObj && !orderData?.id) return;

        setDownloadingBoleto(true);
        setDownloadingBoletoId(paymentObj?.id || String(orderData?.id));
        setShowDownloadOverlay(true);
        setDownloadStatus('processing');

        const paymentId = paymentObj?.id || orderData?.id;
        const proxyUrl = `${API_URL}/payments/${paymentId}/boleto?print=1`;

        try {
            // Abrir em nova janela para impressão
            const printWindow = window.open(proxyUrl, '_blank');

            if (!printWindow) {
                setDownloadStatus('failed');
                toast.error('Permita pop-ups para esta página para imprimir o boleto');
                setTimeout(() => {
                    setShowDownloadOverlay(false);
                    setDownloadingBoleto(false);
                    setDownloadingBoletoId(null);
                }, 3000);
                return;
            }

            // Verificar se a janela foi carregada com sucesso
            const checkWindow = setInterval(() => {
                if (printWindow.closed) {
                    clearInterval(checkWindow);
                    setDownloadStatus('completed');
                    setTimeout(() => {
                        setShowDownloadOverlay(false);
                        setDownloadingBoleto(false);
                        setDownloadingBoletoId(null);
                    }, 1000);
                } else if (printWindow.document.readyState === 'complete') {
                    clearInterval(checkWindow);
                    setDownloadStatus('completed');
                    setTimeout(() => {
                        setShowDownloadOverlay(false);
                        setDownloadingBoleto(false);
                        setDownloadingBoletoId(null);
                    }, 1000);
                }
            }, 500);

            // Timeout para garantir que não fique travado
            setTimeout(() => {
                clearInterval(checkWindow);
                setDownloadStatus('completed');
                setTimeout(() => {
                    setShowDownloadOverlay(false);
                    setDownloadingBoleto(false);
                    setDownloadingBoletoId(null);
                }, 1000);
            }, 10000);

        } catch (error) {
            console.error('Erro ao imprimir boleto:', error);
            setDownloadStatus('failed');
            toast.error('Não foi possível preparar o boleto para impressão');

            setTimeout(() => {
                setShowDownloadOverlay(false);
                setDownloadingBoleto(false);
                setDownloadingBoletoId(null);
            }, 3000);
        }
    }

    const closeOverlay = () => {
        setShowDownloadOverlay(false);
        setDownloadingBoleto(false);
        setDownloadingBoletoId(null);
    }

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
                        <button
                            onClick={() => router.push('/')}
                            className="bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 transition-colors"
                        >
                            Voltar ao início
                        </button>
                    </div>
                </main>
                <FooterCheckout />
            </>
        )
    }

    const payment = orderData.payments?.[0]
    const isPixPayment = payment?.method === 'PIX' || (payment?.method && String(payment.method).toUpperCase().includes('PIX'))
    const isBoletoPayment = payment?.method === 'BOLETO' || (payment?.method && String(payment.method).toUpperCase().includes('BOLETO'))
    const isCardPayment = payment?.method === 'CREDIT_CARD' || payment?.method === 'CARD' || (payment?.method && String(payment.method).toUpperCase().includes('CARD'))

    const getPixBase64FromPayment = (p: any) => {
        return p?.pix_qr_image ??
            p?.pix_qr_image_base64 ??
            p?.gateway_response?.pix_qr_image ??
            p?.gateway_response?.raw?.pix_qr_image ??
            p?.gateway_response?.raw?.encodedImage ??
            null
    }

    const pixBase64 = getPixBase64FromPayment(payment)

    const rawDeliveryTime = findDeliveryTimeString(orderData)
    const deliveryTimeDisplay = rawDeliveryTime
        ? (rawDeliveryTime.toLowerCase().includes('prazo') ? rawDeliveryTime : `Prazo estimado: ${rawDeliveryTime}`)
        : null

    const isDownloadingCurrentBoleto = downloadingBoleto && downloadingBoletoId === (payment?.id || String(orderData.id))

    return (
        <>
            <NavbarCheckout />
            <main className="flex-1 py-8 px-4 text-black relative" style={{ background: colors?.segundo_fundo_layout_site || '#e1e4e9' }}>

                {/* Overlay de Download */}
                {showDownloadOverlay && (
                    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
                        <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 text-center">
                            <div className="flex justify-center mb-6">
                                {downloadStatus === 'processing' && (
                                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-500"></div>
                                )}
                                {downloadStatus === 'completed' && (
                                    <CheckCircle className="w-16 h-16 text-green-500" />
                                )}
                                {downloadStatus === 'failed' && (
                                    <X className="w-16 h-16 text-red-500" />
                                )}
                            </div>

                            <h3 className="text-xl font-bold text-gray-800 mb-4">
                                {downloadStatus === 'processing' && 'Gerando seu boleto...'}
                                {downloadStatus === 'completed' && 'Boleto gerado com sucesso!'}
                                {downloadStatus === 'failed' && 'Falha ao gerar boleto'}
                            </h3>

                            <p className="text-gray-600 mb-6">
                                {downloadStatus === 'processing' && 'Aguarde enquanto preparamos seu boleto para download. Isso pode levar alguns instantes.'}
                                {downloadStatus === 'completed' && 'O download do seu boleto foi iniciado. Verifique sua pasta de downloads.'}
                                {downloadStatus === 'failed' && 'Não foi possível gerar o boleto. Tente novamente ou entre em contato com o suporte.'}
                            </p>

                            {downloadStatus === 'processing' && (
                                <div className="w-full bg-gray-200 rounded-full h-2.5">
                                    <div className="bg-orange-500 h-2.5 rounded-full animate-pulse" style={{ width: '45%' }}></div>
                                </div>
                            )}

                            {(downloadStatus === 'completed' || downloadStatus === 'failed') && (
                                <button
                                    onClick={closeOverlay}
                                    className="bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 transition-colors w-full"
                                >
                                    Fechar
                                </button>
                            )}
                        </div>
                    </div>
                )}

                <div className="max-w-4xl mx-auto">
                    {/* Header de Sucesso */}
                    <div className="bg-white rounded-2xl shadow-lg p-8 mb-6 text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                            <CheckCircle className="w-8 h-8 text-green-500" />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-800 mb-2">Pedido realizado com sucesso!</h1>
                        <p className="text-gray-600 mb-4">
                            Obrigado pela sua compra, {orderData.customer?.name || 'Cliente'}!
                        </p>
                        <div className="inline-block bg-gray-100 px-4 py-2 rounded-lg">
                            <span className="text-sm text-gray-600">Pedido #</span>
                            <span className="font-bold text-gray-800">{orderData?.id_order_store}</span>
                        </div>
                        {orderData.createdAt && (
                            <p className="text-sm text-gray-500 mt-2">
                                Realizado em {formatDateTime(orderData.createdAt)}
                            </p>
                        )}
                    </div>

                    {/* grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Pagamento (full width) */}
                        <div className="lg:col-span-3 bg-white rounded-2xl shadow-lg p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <CircleDollarSign className="w-6 h-6 text-blue-500" />
                                <h2 className="text-xl font-semibold">Informações de Pagamento</h2>
                            </div>

                            {payment && (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center py-2 border-b">
                                        <span className="text-gray-600">Método de pagamento:</span>
                                        <span className="font-medium">
                                            {isPixPayment && 'PIX'}
                                            {isBoletoPayment && 'Boleto Bancário'}
                                            {isCardPayment && 'Cartão de Crédito'}
                                            {!isPixPayment && !isBoletoPayment && !isCardPayment && (payment.method ?? '—')}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b">
                                        <span className="text-gray-600">Status:</span>
                                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${payment.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                                            payment.status === 'CONFIRMED' || payment.status === 'RECEIVED' ? 'bg-green-100 text-green-800' :
                                                payment.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                                                    'bg-gray-100 text-gray-800'
                                            }`}>
                                            {payment.status === 'PENDING' && 'Aguardando Pagamento'}
                                            {payment.status === 'CONFIRMED' && 'Confirmado'}
                                            {payment.status === 'RECEIVED' && 'Recebido'}
                                            {payment.status === 'FAILED' && 'Falhou'}
                                            {!['PENDING', 'CONFIRMED', 'RECEIVED', 'FAILED'].includes(payment.status) && payment.status}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center py-2">
                                        <span className="text-gray-600">Valor total:</span>
                                        <span className="font-bold text-green-600 text-lg">{currency(payment.amount ?? (orderData.total ?? 0))}</span>
                                    </div>
                                </div>
                            )}

                            {/* PIX */}
                            {isPixPayment && payment && (
                                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                                    <div className="flex items-center gap-2 mb-4">
                                        <QrCode className="w-5 h-5 text-blue-600" />
                                        <h3 className="font-semibold text-blue-800">Pagamento PIX</h3>
                                    </div>

                                    <div className="flex flex-col md:flex-row gap-6">
                                        <div className="flex-shrink-0 text-center">
                                            <div className="bg-white p-4 rounded-lg">
                                                {pixBase64 ? (
                                                    <img
                                                        src={`data:image/png;base64,${pixBase64}`}
                                                        alt="QR Code PIX"
                                                        width={200}
                                                        height={200}
                                                        className="border border-gray-200 rounded"
                                                    />
                                                ) : payment.pix_qr_code ? (
                                                    <img
                                                        src={generateQRCodeUrl(payment.pix_qr_code)}
                                                        alt="QR Code PIX"
                                                        width={200}
                                                        height={200}
                                                        className="border border-gray-200 rounded"
                                                    />
                                                ) : (
                                                    <div className="w-40 h-40 flex items-center justify-center text-sm text-gray-500">QR indisponível</div>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-600 mt-2">
                                                Escaneie com o app do seu banco
                                            </p>
                                        </div>

                                        <div className="flex-1 space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Chave PIX (Copia e Cola):
                                                </label>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={payment.pix_qr_code ?? ''}
                                                        readOnly
                                                        className="flex-1 p-3 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                                                    />
                                                    <button
                                                        onClick={() => copyToClipboard(payment.pix_qr_code ?? '', 'Chave PIX')}
                                                        className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                                    >
                                                        <Copy size={16} />
                                                    </button>
                                                </div>
                                            </div>

                                            {payment.pix_expiration && (
                                                <div className="flex items-center gap-2 text-orange-600">
                                                    <Clock size={16} />
                                                    <span className="text-sm">
                                                        Expira em: {formatDateTime(payment.pix_expiration)}
                                                    </span>
                                                </div>
                                            )}

                                            <div className="text-sm text-gray-600">
                                                <p className="font-medium mb-1">Como pagar:</p>
                                                <ol className="list-decimal list-inside space-y-1">
                                                    <li>Abra o app do seu banco</li>
                                                    <li>Escaneie o QR Code ou copie e cole a chave PIX</li>
                                                    <li>Confirme o pagamento</li>
                                                </ol>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Boleto */}
                            {isBoletoPayment && payment && (payment.boleto_url || payment.boleto_barcode) && (
                                <div className="mt-6 p-4 bg-orange-50 rounded-lg">
                                    <div className="flex items-center gap-2 mb-4">
                                        <FileText className="w-5 h-5 text-orange-600" />
                                        <h3 className="font-semibold text-orange-800">Boleto Bancário</h3>
                                    </div>

                                    <div className="space-y-4">
                                        {payment.boleto_url && (
                                            <div className="flex gap-2 flex-wrap">
                                                <button
                                                    onClick={() => downloadPdfProxy(payment)}
                                                    disabled={downloadingBoleto}
                                                    className="w-full md:w-auto flex items-center justify-center gap-2 bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {isDownloadingCurrentBoleto ? (
                                                        <>
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                            Gerando boleto...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Download size={16} />
                                                            Visualizar/Baixar Boleto
                                                        </>
                                                    )}
                                                </button>

                                                <button
                                                    onClick={() => printPdfProxy(payment)}
                                                    disabled={downloadingBoleto}
                                                    className="w-full md:w-auto flex items-center justify-center gap-2 border border-orange-600 text-orange-600 px-6 py-3 rounded-lg hover:bg-orange-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {isDownloadingCurrentBoleto ? (
                                                        <>
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                            Preparando...
                                                        </>
                                                    ) : (
                                                        <>
                                                            🖨️ Imprimir Boleto
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        )}

                                        {payment.boleto_barcode && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Código de barras:
                                                </label>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={payment.boleto_barcode}
                                                        readOnly
                                                        className="flex-1 p-3 border border-gray-300 rounded-lg bg-gray-50 text-sm font-mono"
                                                    />
                                                    <button
                                                        onClick={() => copyToClipboard(payment.boleto_barcode!, 'Código de barras')}
                                                        className="px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                                                    >
                                                        <Copy size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        <div className="text-sm text-gray-600">
                                            <p className="font-medium mb-1">Como pagar:</p>
                                            <ol className="list-decimal list-inside space-y-1">
                                                <li>Clique no botão para visualizar/baixar o boleto</li>
                                                <li>Pague em qualquer banco, lotérica ou internet banking</li>
                                                <li>O prazo de vencimento está indicado no boleto</li>
                                            </ol>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Entrega (full width) */}
                        <div className="lg:col-span-3 bg-white rounded-2xl shadow-lg p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <Truck className="w-6 h-6 text-blue-500" />
                                <h2 className="text-xl font-semibold">Informações de Entrega</h2>
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center py-2 border-b">
                                    <span className="text-gray-600">Frete:</span>
                                    <span className="font-medium">{currency(orderData.shippingCost ?? 0)}</span>
                                </div>

                                <div className="flex justify-between items-center py-2 border-b">
                                    <span className="text-gray-600">Método de envio:</span>
                                    <span className="font-medium">{shippingMethodDisplay}</span>
                                </div>

                                <div className="flex flex-col gap-1 py-2 border-b">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600">Previsão de entrega:</span>
                                        <span className="font-medium">{deliveryTimeDisplay ?? 'Prazo indisponível'}</span>
                                    </div>
                                </div>

                                {orderData.shippingAddress && (
                                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                                        <div className="flex items-start gap-2">
                                            <MapPin className="w-5 h-5 text-gray-500 mt-0.5" />
                                            <div>
                                                <h4 className="font-medium text-gray-800 mb-1">Endereço de entrega:</h4>
                                                <p className="text-gray-600">{orderData.shippingAddress}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

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