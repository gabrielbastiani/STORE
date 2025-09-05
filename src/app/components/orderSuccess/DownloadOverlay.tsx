import React from 'react'
import { CheckCircle, X } from 'lucide-react'

type Props = {
    show: boolean
    status: 'pending' | 'processing' | 'completed' | 'failed'
    onClose: () => void
}

export default function DownloadOverlay({ show, status, onClose }: Props) {
    if (!show) return null
    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 text-center">
                <div className="flex justify-center mb-6">
                    {status === 'processing' && <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-500"></div>}
                    {status === 'completed' && <CheckCircle className="w-16 h-16 text-green-500" />}
                    {status === 'failed' && <X className="w-16 h-16 text-red-500" />}
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-4">
                    {status === 'processing' && 'Gerando seu boleto...'}
                    {status === 'completed' && 'Boleto gerado com sucesso!'}
                    {status === 'failed' && 'Falha ao gerar boleto'}
                </h3>
                <p className="text-gray-600 mb-6">
                    {status === 'processing' && 'Aguarde enquanto preparamos seu boleto para download. Isso pode levar alguns instantes.'}
                    {status === 'completed' && 'O download do seu boleto foi iniciado. Verifique sua pasta de downloads.'}
                    {status === 'failed' && 'Não foi possível gerar o boleto. Tente novamente ou entre em contato com o suporte.'}
                </p>
                {status === 'processing' && (
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div className="bg-orange-500 h-2.5 rounded-full animate-pulse" style={{ width: '45%' }}></div>
                    </div>
                )}
                {(status === 'completed' || status === 'failed') && (
                    <button onClick={onClose} className="bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 transition-colors w-full">Fechar</button>
                )}
            </div>
        </div>
    )
}