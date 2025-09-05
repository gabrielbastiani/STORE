import React from 'react'
import { Truck, MapPin } from 'lucide-react'
import { currency, OrderData } from './orderUtils';

type Props = { order: OrderData; deliveryTimeDisplay: string | null; shippingMethodDisplay: string }

export default function DeliverySection({ order, deliveryTimeDisplay, shippingMethodDisplay }: Props) {
    return (
        <div className="lg:col-span-3 bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-6"><Truck className="w-6 h-6 text-blue-500" /><h2 className="text-xl font-semibold">Informações de Entrega</h2></div>

            <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b"><span className="text-gray-600">Frete:</span><span className="font-medium">{currency(order.shippingCost ?? 0)}</span></div>

                <div className="flex justify-between items-center py-2 border-b"><span className="text-gray-600">Método de envio:</span><span className="font-medium">{shippingMethodDisplay}</span></div>

                <div className="flex flex-col gap-1 py-2 border-b"><div className="flex justify-between items-center"><span className="text-gray-600">Previsão de entrega:</span><span className="font-medium">{deliveryTimeDisplay ?? 'Prazo indisponível'}</span></div></div>

                {order.shippingAddress && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-start gap-2"><MapPin className="w-5 h-5 text-gray-500 mt-0.5" /><div><h4 className="font-medium text-gray-800 mb-1">Endereço de entrega:</h4><p className="text-gray-600">{order.shippingAddress}</p></div></div>
                    </div>
                )}
            </div>
        </div>
    )
}