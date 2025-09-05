import React from 'react'
import { CheckCircle } from 'lucide-react'
import { formatDateTime, OrderData } from './orderUtils'

type Props = { order: OrderData }

export default function OrderSuccessHeader({ order }: Props) {
    return (
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Pedido realizado com sucesso!</h1>
            <p className="text-gray-600 mb-4">Obrigado pela sua compra, {order.customer?.name || 'Cliente'}!</p>
            <div className="inline-block bg-gray-100 px-4 py-2 rounded-lg">
                <span className="text-sm text-gray-600">Pedido #</span>
                <span className="font-bold text-gray-800">{order?.id_order_store}</span>
            </div>
            {order.createdAt && (
                <p className="text-sm text-gray-500 mt-2">Realizado em {formatDateTime(order.createdAt)}</p>
            )}
        </div>
    )
}