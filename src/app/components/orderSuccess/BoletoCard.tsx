import React from 'react'
import { FileText, Download, Loader2 } from 'lucide-react'

type Props = {
    payment: any
    downloading: boolean
    isDownloadingCurrent: boolean
    downloadPdfProxy: (paymentObj: any) => Promise<void>
    printPdfProxy: (paymentObj: any) => Promise<void>
    copyToClipboard: (text: string, label: string) => Promise<void>
}

export default function BoletoCard({ payment, downloading, isDownloadingCurrent, downloadPdfProxy, printPdfProxy, copyToClipboard }: Props) {
    return (
        <div className="mt-6 p-4 bg-orange-50 rounded-lg">
            <div className="flex items-center gap-2 mb-4"><FileText className="w-5 h-5 text-orange-600" /><h3 className="font-semibold text-orange-800">Boleto Bancário</h3></div>

            <div className="space-y-4">
                {payment.boleto_url && (
                    <div className="flex gap-2 flex-wrap">
                        <button onClick={() => downloadPdfProxy(payment)} disabled={downloading} className="w-full md:w-auto flex items-center justify-center gap-2 bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                            {isDownloadingCurrent ? (<><Loader2 className="w-4 h-4 animate-spin" />Gerando boleto...</>) : (<><Download size={16} />Visualizar/Baixar Boleto</>)}
                        </button>

                        <button onClick={() => printPdfProxy(payment)} disabled={downloading} className="w-full md:w-auto flex items-center justify-center gap-2 border border-orange-600 text-orange-600 px-6 py-3 rounded-lg hover:bg-orange-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                            {isDownloadingCurrent ? (<><Loader2 className="w-4 h-4 animate-spin" />Preparando...</>) : (<>🖨️ Imprimir Boleto</>)}
                        </button>
                    </div>
                )}

                {payment.boleto_barcode && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Código de barras:</label>
                        <div className="flex gap-2">
                            <input type="text" value={payment.boleto_barcode} readOnly className="flex-1 p-3 border border-gray-300 rounded-lg bg-gray-50 text-sm font-mono" />
                            <button onClick={() => copyToClipboard(payment.boleto_barcode, 'Código de barras')} className="px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"><Download size={16} /></button>
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
    )
}