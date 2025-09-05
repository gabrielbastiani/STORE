import React from 'react'
import { CircleDollarSign } from 'lucide-react'
import PixCard from './PixCard'
import BoletoCard from './BoletoCard'
import { currency, isBoletoPayment, isCardPayment, isPixPayment, OrderData } from './orderUtils'

type Props = {
    order: OrderData
    copyToClipboard: (text: string, label: string) => Promise<void>
    downloadPdfProxy: (paymentObj: any) => Promise<void>
    printPdfProxy: (paymentObj: any) => Promise<void>
    downloading: boolean
    isDownloadingCurrent: boolean
}

export default function PaymentSection({ order, copyToClipboard, downloadPdfProxy, printPdfProxy, downloading, isDownloadingCurrent }: Props) {
    const payment = order.payments?.[0]
    if (!payment) return null

    const paymentMethodLabel = isPixPayment(payment) ? 'PIX' : isBoletoPayment(payment) ? 'Boleto Bancário' : isCardPayment(payment) ? 'Cartão de Crédito' : (payment.method ?? '—')

    return (
        <div className="lg:col-span-3 bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-6"><CircleDollarSign className="w-6 h-6 text-blue-500" /><h2 className="text-xl font-semibold">Informações de Pagamento</h2></div>

            <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b"><span className="text-gray-600">Método de pagamento:</span><span className="font-medium">{paymentMethodLabel}</span></div>
                <div className="flex justify-between items-center py-2 border-b"><span className="text-gray-600">Status:</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${payment.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : payment.status === 'CONFIRMED' || payment.status === 'RECEIVED' ? 'bg-green-100 text-green-800' : payment.status === 'FAILED' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                        {payment.status === 'PENDING' && 'Aguardando Pagamento'}
                        {payment.status === 'CONFIRMED' && 'Confirmado'}
                        {payment.status === 'RECEIVED' && 'Recebido'}
                        {payment.status === 'FAILED' && 'Falhou'}
                        {!['PENDING', 'CONFIRMED', 'RECEIVED', 'FAILED'].includes(payment.status) && payment.status}
                    </span>
                </div>
                <div className="flex justify-between items-center py-2"><span className="text-gray-600">Valor total:</span><span className="font-bold text-green-600 text-lg">{currency(payment.amount ?? (order.total ?? 0))}</span></div>

                {isPixPayment(payment) && <PixCard payment={payment} copyToClipboard={copyToClipboard} />}
                {isBoletoPayment(payment) && (payment.boleto_url || payment.boleto_barcode) && (
                    <BoletoCard payment={payment} downloading={downloading} isDownloadingCurrent={isDownloadingCurrent} downloadPdfProxy={downloadPdfProxy} printPdfProxy={printPdfProxy} copyToClipboard={copyToClipboard} />
                )}
            </div>
        </div>
    )
}