'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { toast } from 'react-toastify'
import { useTheme } from '@/app/contexts/ThemeContext'
import { NavbarCheckout } from '@/app/components/navbar/navbarCheckout'
import { FooterCheckout } from '@/app/components/footer/footerCheckout'
import { api } from '@/services/apiClient'
import { CheckCircle, Copy, Download, Clock, FileText, Truck, MapPin, QrCode, CircleDollarSign, CreditCard } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

interface OrderData {
    id: string | number
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

// Aceita Date | string | null para evitar erro de tipagem
const formatDateTime = (dateInput?: string | Date | null) => {
    if (!dateInput) return ''
    try {
        const date = dateInput instanceof Date ? dateInput : new Date(String(dateInput))
        if (isNaN(date.getTime())) return String(dateInput)
        return date.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    } catch {
        return String(dateInput)
    }
}

// Gerador de QR público (usado apenas se não houver base64 vindo do gateway)
const generateQRCodeUrl = (text: string) => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(text)}`
}

/* ---------- função que localiza a string de deliveryTime sem transformar nada ---------- */
const findDeliveryTimeString = (od: OrderData): string | null => {
    // 1) tenta sessionStorage: lastOrder:<id>
    try {
        const sessionKey = `lastOrder:${od.id}`
        const raw = sessionStorage.getItem(sessionKey)
        if (raw) {
            try {
                const parsed = JSON.parse(raw)
                const sp = parsed.orderData ?? parsed
                if (sp) {
                    // pode vir em shippingRaw.deliveryTime, shippingRaw.delivery_time, shippingRaw.deliveryTime
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

    // 2) check orderData.raw top-level fields
    const r = (od as any).raw ?? {}
    const directCandidates = [
        od.shippingMethod as any, // note: shippingMethod often is id or label
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
        if (typeof c === 'string' && c.trim() !== '') return c.trim()
    }

    // 3) procurar em arrays de opções: r.options, r.shippingOptions, r.quotes, r.options[]
    const arrays = [r.options, r.shippingOptions, r.quotes, r.shipping?.options, r.optionsArray].filter(Boolean)
    for (const arr of arrays) {
        if (!Array.isArray(arr)) continue
        // se orderData.shippingMethod é um id, tenta achar a opção correspondente
        const idStr = od.shippingMethod != null ? String(od.shippingMethod) : null
        if (idStr) {
            const found = arr.find((o: any) => String(o.id) === idStr || String(o.shippingId) === idStr || String(o.optionId) === idStr)
            if (found) {
                const cand = found.deliveryTime ?? found.delivery_time ?? found.delivery ?? null
                if (typeof cand === 'string' && cand.trim() !== '') return cand.trim()
            }
        }
        // fallback: se não encontrou por id, retorna o deliveryTime da primeira opção (ex.: no seu exemplo as opções já contêm deliveryTime)
        const first = arr[0]
        if (first) {
            const cand = first.deliveryTime ?? first.delivery_time ?? first.delivery ?? null
            if (typeof cand === 'string' && cand.trim() !== '') return cand.trim()
        }
    }

    // 4) procura em raw.shippingRaw ou raw.shipping
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

    // Função para copiar texto
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

            // Resolve id por compatibilidade: params pode ser um objeto ou uma Promise (app-router)
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
                // 1) load sessionStorage partial if exists (we'll still request API for full data)
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

                // 2) fetch api
                const response = await api.get(`/order/${id}`)
                const data = response.data

                if (!data) {
                    throw new Error('Dados do pedido não foram retornados pela API')
                }

                // Normaliza retorno da API para a interface OrderData
                const normalizedFromApi: OrderData = {
                    id: data.id ?? id,
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

                // 3) mescla sessionParsed para priorizar label se existir
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

    const payment = orderData.payments?.[0] // Pega o primeiro pagamento (se houver)
    const isPixPayment = payment?.method === 'PIX' || (payment?.method && String(payment.method).toUpperCase().includes('PIX'))
    const isBoletoPayment = payment?.method === 'BOLETO' || (payment?.method && String(payment.method).toUpperCase().includes('BOLETO'))
    const isCardPayment = payment?.method === 'CREDIT_CARD' || payment?.method === 'CARD' || (payment?.method && String(payment.method).toUpperCase().includes('CARD'))

    // Tenta extrair base64 do gateway_response quando disponível em vários caminhos
    const getPixBase64FromPayment = (p: any) => {
        return p?.pix_qr_image ??
            p?.pix_qr_image_base64 ??
            p?.gateway_response?.pix_qr_image ??
            p?.gateway_response?.raw?.pix_qr_image ??
            p?.gateway_response?.raw?.encodedImage ??
            null
    }

    const pixBase64 = getPixBase64FromPayment(payment)

    // Obtém a string bruta de prazo (ex.: "Em até 2–3 dias úteis")
    const rawDeliveryTime = findDeliveryTimeString(orderData)
    const deliveryTimeDisplay = rawDeliveryTime
        ? (rawDeliveryTime.toLowerCase().includes('prazo') ? rawDeliveryTime : `Prazo estimado: ${rawDeliveryTime}`)
        : null

    // Build shipping method display (prioriza labels legíveis em sessionStorage / raw)
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

    const shippingMethodDisplay = buildShippingMethod(orderData)

    // proxy helpers (mantive suas funções de download/print)
    function buildProxyUrlForPayment(paymentId: string, inline = false) {
        return `${API_URL}/payments/${encodeURIComponent(paymentId)}/boleto${inline ? '?print=1' : ''}`
    }
    function buildProxyUrlForOrder(orderId: string, inline = false) {
        return `${API_URL}/orders/${encodeURIComponent(orderId)}/boleto${inline ? '?print=1' : ''}`
    }

    async function downloadPdfProxy(paymentObj: any) {
        if (!paymentObj && !orderData?.id) return;
        let proxyUrl: string | null = null;
        if (paymentObj?.id) proxyUrl = buildProxyUrlForPayment(paymentObj.id, false);
        else if (orderData?.id) proxyUrl = buildProxyUrlForOrder(String(orderData.id), false);

        if (proxyUrl) {
            try {
                const res = await fetch(proxyUrl, { method: 'GET', credentials: 'same-origin' });
                if (!res.ok) throw new Error('Falha no proxy');
                const contentType = res.headers.get('content-type') ?? '';
                if (contentType.includes('application/pdf') || contentType.includes('application/octet-stream')) {
                    const blob = await res.blob();
                    const blobUrl = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = blobUrl;
                    a.download = `boleto-${paymentObj?.id ?? orderData?.id}.pdf`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    window.URL.revokeObjectURL(blobUrl);
                    return;
                }
                const finalUrl = res.url || proxyUrl;
                window.open(finalUrl, '_blank');
                return;
            } catch (err) {
                console.warn('Proxy boleto falhou, tentando URL original', err);
            }
        }

        if (paymentObj?.boleto_url) {
            try {
                const res = await fetch(paymentObj.boleto_url, { method: 'GET', credentials: 'same-origin' });
                if (res.ok && (res.headers.get('content-type') || '').includes('application/pdf')) {
                    const blob = await res.blob();
                    const blobUrl = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = blobUrl;
                    a.download = `boleto-${paymentObj.id ?? orderData?.id}.pdf`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    window.URL.revokeObjectURL(blobUrl);
                    return;
                }
            } catch { /* fallback open */ }
            window.open(paymentObj.boleto_url, '_blank');
        } else {
            toast.error('URL do boleto não disponível');
        }
    }

    async function printPdfProxy(paymentObj: any) {
        if (!paymentObj && !orderData?.id) return;
        let proxyUrl: string | null = null;
        if (paymentObj?.id) proxyUrl = buildProxyUrlForPayment(paymentObj.id, true);
        else if (orderData?.id) proxyUrl = buildProxyUrlForOrder(String(orderData.id), true);

        if (proxyUrl) {
            try {
                const res = await fetch(proxyUrl, { method: 'GET', credentials: 'same-origin' });
                if (!res.ok) throw new Error('Falha no proxy');
                const contentType = res.headers.get('content-type') ?? '';
                if (contentType.includes('application/pdf') || contentType.includes('application/octet-stream')) {
                    const blob = await res.blob();
                    const blobUrl = window.URL.createObjectURL(blob);
                    const printWindow = window.open('', '_blank');
                    if (!printWindow) { window.open(blobUrl, '_blank'); return; }
                    printWindow.document.write(`
                        <html>
                          <head><title>Imprimir Boleto</title></head>
                          <body style="margin:0">
                            <iframe src="${blobUrl}" style="width:100%;height:100vh;border:none"></iframe>
                            <script>
                              const iframe = document.querySelector('iframe');
                              iframe.onload = function() {
                                try {
                                  setTimeout(() => { iframe.contentWindow.focus(); iframe.contentWindow.print(); }, 500);
                                } catch(e) {
                                  window.open('${blobUrl}', '_blank');
                                }
                              }
                            <\/script>
                          </body>
                        </html>
                    `);
                    printWindow.document.close();
                    return;
                }
                const finalUrl = res.url || proxyUrl;
                window.open(finalUrl, '_blank');
                return;
            } catch (err) {
                console.warn('Proxy print falhou, fallback para boleto_url', err);
            }
        }

        if (paymentObj?.boleto_url) window.open(paymentObj.boleto_url, '_blank')
        else toast.error('URL do boleto não disponível para impressão')
    }

    return (
        <>
            <NavbarCheckout />
            <main className="flex-1 py-8 px-4 text-black" style={{ background: colors?.segundo_fundo_layout_site || '#e1e4e9' }}>
                <div className="max-w-4xl mx-auto">
                    {/* Header de Sucesso (largura total do container) */}
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
                            <span className="font-bold text-gray-800">{orderData.id}</span>
                            <button
                                onClick={() => copyToClipboard(String(orderData.id), 'ID do pedido')}
                                className="ml-2 text-gray-500 hover:text-gray-700"
                            >
                                <Copy size={16} />
                            </button>
                        </div>
                        {orderData.createdAt && (
                            <p className="text-sm text-gray-500 mt-2">
                                Realizado em {formatDateTime(orderData.createdAt)}
                            </p>
                        )}
                    </div>

                    {/* grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Informações de Pagamento */}
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
                                                    className="w-full md:w-auto flex items-center justify-center gap-2 bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition-colors"
                                                >
                                                    <Download size={16} /> Visualizar/Baixar Boleto
                                                </button>

                                                <button
                                                    onClick={() => printPdfProxy(payment)}
                                                    className="w-full md:w-auto flex items-center justify-center gap-2 border border-orange-600 text-orange-600 px-6 py-3 rounded-lg hover:bg-orange-50 transition-colors"
                                                >
                                                    🖨️ Imprimir Boleto
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

                            {/* Cartão */}
                            {isCardPayment && (
                                <div className="mt-6 p-4 bg-green-50 rounded-lg">
                                    <div className="flex items-center gap-2 mb-4">
                                        <CreditCard className="w-6 h-6 text-green-500" />
                                        <h3 className="font-semibold text-green-800">Cartão de Crédito</h3>
                                    </div>

                                    <div className="text-sm text-gray-600">
                                        <p>Pagamento processado com sucesso. Você receberá um e-mail com a confirmação.</p>
                                        {payment?.transaction_id && (
                                            <p className="mt-2">
                                                <span className="font-medium">ID da transação:</span> {payment.transaction_id}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Informações de Entrega */}
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
                                    {/* opcional: mostrar também o texto cru abaixo, se houver e se for diferente */}
                                    {/* no requirement você pediu o texto completo; já mostramos acima */}
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
                    </div>
                </div>
            </main>
            <FooterCheckout />
        </>
    )
}