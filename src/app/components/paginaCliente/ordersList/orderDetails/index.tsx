"use client"

import React from "react";
import { useRouter } from "next/navigation";
import { Printer, ArrowLeft } from "lucide-react";

type OrderItem = {
    id: string;
    image: string;
    name: string;
    variant: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    status: string;
    statusDate: string;
    ipi?: number;
};

type Address = {
    recipient_name: string;
    street: string;
    number: string;
    neighborhood: string;
    cep: string;
    city: string;
    state: string;
    country: string;
    complement?: string;
    reference?: string;
    obs?: string;
};

type OrderDetailsProps = {
    orderNumber: string;
    purchaseDate: string;
    status: string;
    deliveryTime: string;
    paymentMethodLabel: string;
    total: number;
    discount?: number;
    shippingLabel: string;
    totalIpi?: number;
    items: OrderItem[];
    pickupAddress: Address;
};

export const OrderDetails: React.FC<OrderDetailsProps> = ({
    orderNumber,
    purchaseDate,
    status,
    deliveryTime,
    paymentMethodLabel,
    total,
    discount,
    shippingLabel,
    totalIpi,
    items,
    pickupAddress,
}) => {
    const router = useRouter();

    const formatCurrency = (v: number) =>
        v.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
        });

    const subtotal = items.reduce((sum, i) => sum + i.totalPrice, 0);

    return (
        <div className="space-y-6 text-black max-w-4xl mx-auto p-4">
            <h1 className="text-2xl font-bold">Detalhes do Pedido</h1>

            {/* Dados do Pedido + Endereço de Retirada */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Dados do Pedido */}
                <div className="border rounded p-4 space-y-3">
                    <h2 className="flex items-center text-lg font-semibold">
                        <svg
                            className="h-5 w-5 mr-2 text-gray-700"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 6h16M4 10h16M4 14h16M4 18h16"
                            />
                        </svg>
                        Dados do Pedido
                    </h2>
                    <div className="text-sm text-gray-700">
                        <div>Data de Compra: <span className="font-medium">{purchaseDate}</span></div>
                    </div>
                    <div className="bg-gray-100 p-3 rounded flex flex-col sm:flex-row items-start sm:items-center justify-between">
                        <div>
                            <div className="text-xs uppercase font-medium text-gray-600">Número do Pedido</div>
                            <div className="text-2xl font-bold">{orderNumber}</div>
                        </div>
                        <div className="mt-2 sm:mt-0 text-xs text-gray-600">
                            A confirmação do seu pedido foi enviada para o e‑mail:<br />
                            <span className="font-medium">seu.email@exemplo.com</span>
                        </div>
                    </div>
                    <div className="text-sm space-y-1">
                        <div>Status: <span className="font-medium">{status}</span></div>
                        <div>Prazo de entrega: <span className="font-medium">{deliveryTime}</span></div>
                        <div>Forma de pagamento: <span className="font-medium">{paymentMethodLabel}</span></div>
                        <div>Valor total: <span className="font-medium">{formatCurrency(total)}</span></div>
                    </div>
                </div>

                {/* Endereço de Retirada */}
                <div className="border rounded p-4 space-y-2">
                    <h2 className="flex items-center text-lg font-semibold">
                        <svg
                            className="h-5 w-5 mr-2 text-gray-700"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M17.657 16.657L13.414 12.414a4 4 0 10-5.657 5.657l4.243 4.243a8 8 0 0011.314-11.314l-4.243 4.243z"
                            />
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                        </svg>
                        Endereço de Retirada
                    </h2>
                    <div className="text-sm space-y-1">
                        <div><span className="font-medium">Nome do Destinatário:</span> {pickupAddress.recipient_name}</div>
                        <div><span className="font-medium">Logradouro:</span> {pickupAddress.street}</div>
                        <div><span className="font-medium">Número:</span> {pickupAddress.number}</div>
                        <div><span className="font-medium">Bairro:</span> {pickupAddress.neighborhood}</div>
                        <div><span className="font-medium">CEP:</span> {pickupAddress.cep}</div>
                        <div><span className="font-medium">Cidade:</span> {pickupAddress.city}</div>
                        <div><span className="font-medium">Estado:</span> {pickupAddress.state}</div>
                        <div><span className="font-medium">País:</span> {pickupAddress.country}</div>
                        {pickupAddress.complement && (
                            <div><span className="font-medium">Complemento:</span> {pickupAddress.complement}</div>
                        )}
                        {pickupAddress.reference && (
                            <div><span className="font-medium">Referência:</span> {pickupAddress.reference}</div>
                        )}
                        {pickupAddress.obs && (
                            <div><span className="font-medium">Obs:</span> {pickupAddress.obs}</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Produtos Adquiridos */}
            <div className="border rounded overflow-hidden">
                <div className="p-4 border-b flex items-center">
                    <svg
                        className="h-5 w-5 mr-2 text-gray-700"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 6h16M4 10h16M4 14h16M4 18h16"
                        />
                    </svg>
                    <h3 className="font-semibold">Produtos Adquiridos</h3>
                </div>
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b">
                            <th className="py-2 text-left">Itens do Pedido</th>
                            <th className="py-2 text-left">Qtde</th>
                            <th className="py-2 text-left">Preço Unitário</th>
                            <th className="py-2 text-left">Valor</th>
                            <th className="py-2 text-left">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((it) => (
                            <tr key={it.id} className="border-b">
                                <td className="py-2 flex items-center space-x-2">
                                    <img
                                        src={it.image}
                                        alt={it.name}
                                        className="h-10 w-10 object-cover rounded"
                                    />
                                    <div>
                                        <div>{it.name}</div>
                                        <div className="text-xs text-gray-500">{it.variant}</div>
                                    </div>
                                </td>
                                <td className="py-2">{it.quantity}</td>
                                <td className="py-2">{formatCurrency(it.unitPrice)}</td>
                                <td className="py-2">{formatCurrency(it.totalPrice)}</td>
                                <td className="py-2">
                                    <div className="text-xs">{it.status} {it.statusDate}</div>
                                    {it.ipi != null && (
                                        <div className="text-xs text-gray-500">
                                            Valor de IPI: {formatCurrency(it.ipi)}
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Resumo de valores */}
                <div className="p-4 text-sm max-w-md ml-auto space-y-1">
                    <div className="flex justify-between">
                        <span>Subtotal de Produtos:</span>
                        <span>{formatCurrency(subtotal)}</span>
                    </div>
                    {typeof discount === "number" && (
                        <div className="flex justify-between text-red-600">
                            <span>Desconto Forma Pagamento:</span>
                            <span>{formatCurrency(discount)}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-green-600">
                        <span>Valor do Frete:</span>
                        <span>{shippingLabel}</span>
                    </div>
                    {typeof totalIpi === "number" && (
                        <div className="flex justify-between">
                            <span>Valor Total das Alíquotas:</span>
                            <span>{formatCurrency(totalIpi)}</span>
                        </div>
                    )}
                    <div className="flex justify-between font-semibold border-t pt-2">
                        <span>TOTAL DO PEDIDO:</span>
                        <span>{formatCurrency(total)}</span>
                    </div>
                </div>
            </div>

            {/* Ações */}
            <div className="flex justify-between">
                <button
                    onClick={() => router.back()}
                    className="flex items-center bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                    <ArrowLeft className="mr-2" size={16} /> Voltar
                </button>
                <button
                    onClick={() => window.print()}
                    className="flex items-center bg-blue-900 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                    <Printer className="mr-2" size={16} /> Imprimir
                </button>
            </div>
        </div>
    );
};