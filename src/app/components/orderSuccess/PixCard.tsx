import React from 'react'
import { QrCode, Copy, Clock } from 'lucide-react'
import { formatDateTime, generateQRCodeUrl, getPixBase64FromPayment } from './orderUtils'

type Props = {
    payment: any
    copyToClipboard: (text: string, label: string) => Promise<void>
}

export default function PixCard({ payment, copyToClipboard }: Props) {

    const pixBase64 = getPixBase64FromPayment(payment);

    return (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 mb-4">
                <QrCode className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-blue-800">Pagamento PIX</h3>
            </div>

            <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-shrink-0 text-center">
                    <div className="bg-white p-4 rounded-lg">
                        {pixBase64 ? (
                            <img src={`data:image/png;base64,${pixBase64}`} alt="QR Code PIX" width={200} height={200} className="border border-gray-200 rounded" />
                        ) : payment.pix_qr_code ? (
                            <img src={generateQRCodeUrl(payment.pix_qr_code)} alt="QR Code PIX" width={200} height={200} className="border border-gray-200 rounded" />
                        ) : (
                            <div className="w-40 h-40 flex items-center justify-center text-sm text-gray-500">QR indisponível</div>
                        )}
                    </div>
                    <p className="text-sm text-gray-600 mt-2">Escaneie com o app do seu banco</p>
                </div>

                <div className="flex-1 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Chave PIX (Copia e Cola):</label>
                        <div className="flex gap-2">
                            <input type="text" value={payment.pix_qr_code ?? ''} readOnly className="flex-1 p-3 border border-gray-300 rounded-lg bg-gray-50 text-sm" />
                            <button onClick={() => copyToClipboard(payment.pix_qr_code ?? '', 'Chave PIX')} className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"><Copy size={16} /></button>
                        </div>
                    </div>

                    {payment.pix_expiration && (
                        <div className="flex items-center gap-2 text-orange-600"><Clock size={16} /><span className="text-sm">Expira em: {formatDateTime(payment.pix_expiration)}</span></div>
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
    )
}