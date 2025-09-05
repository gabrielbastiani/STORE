"use client"

import { useState, useEffect, useContext } from "react";
import { setupAPIClient } from "@/services/api";
import { toast } from "react-toastify";
import {
    ChevronDown,
    ChevronUp,
    ArrowLeft,
    Printer,
} from "lucide-react";
import { AuthContextStore } from "@/app/contexts/AuthContextStore";

//
// Tipagens
//
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

type Order = {
    id: string;
    number: string;
    date: string;
    paymentMethod: string;
    paymentLabel: string;
    status: "ENTREGUE" | "CANCELADO" | "PROCESSANDO";
    total: number;
    installments: number;
    storePickup?: string;
    trackingCode?: string;
    trackingDays?: string;
    items: OrderItem[];
    discount?: number;
    shipping?: string;
    totalIpi?: number;
    pickupAddress: Address;
};

//
// Componente de detalhes
//
interface OrderDetailsProps extends Order {
    onBack: () => void;
}

const OrderDetails: React.FC<OrderDetailsProps> = ({
    id,
    number,
    date,
    paymentMethod,
    paymentLabel,
    status,
    total,
    installments,
    storePickup,
    trackingCode,
    trackingDays,
    items,
    discount,
    shipping,
    totalIpi,
    pickupAddress,
    onBack,
}) => {
    const formatCurrency = (v: number) =>
        v.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
        });
    const subtotal = items.reduce((sum, i) => sum + i.totalPrice, 0);

    return (
        <div className="space-y-6 text-black max-w-4xl mx-auto p-4">
            <h1 className="text-2xl font-bold">Detalhes do Pedido</h1>

            {/* Dados do Pedido / Endereço */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Dados do Pedido */}
                <div className="border rounded p-4 space-y-3">
                    <h2 className="text-lg font-semibold">Dados do Pedido</h2>
                    <div className="text-sm text-gray-700">
                        <div>
                            Data de Compra: <strong>{date}</strong>
                        </div>
                    </div>
                    <div className="bg-gray-100 p-3 rounded flex flex-col sm:flex-row items-start sm:items-center justify-between">
                        <div>
                            <div className="text-xs uppercase font-medium text-gray-600">
                                Número do Pedido
                            </div>
                            <div className="text-2xl font-bold">{number}</div>
                        </div>
                        <div className="mt-2 sm:mt-0 text-xs text-gray-600">
                            A confirmação do seu pedido foi enviada para o e‑mail:
                            <br />
                            <strong>seu.email@exemplo.com</strong>
                        </div>
                    </div>
                    <div className="text-sm space-y-1">
                        <div>
                            Status: <strong>{status}</strong>
                        </div>
                        <div>
                            Prazo de entrega: <strong>{storePickup || trackingDays}</strong>
                        </div>
                        <div>
                            Forma de pagamento: <strong>{paymentLabel}</strong>
                        </div>
                        <div>
                            Valor total: <strong>{formatCurrency(total)}</strong>
                        </div>
                    </div>
                </div>

                {/* Endereço de Retirada */}
                <div className="border rounded p-4 space-y-1 text-sm">
                    <h2 className="text-lg font-semibold">Endereço de Retirada</h2>
                    <div>
                        <strong>Nome do Destinatário:</strong> {pickupAddress.recipient_name}
                    </div>
                    <div>
                        <strong>Logradouro:</strong> {pickupAddress.street}
                    </div>
                    <div>
                        <strong>Número:</strong> {pickupAddress.number}
                    </div>
                    <div>
                        <strong>Bairro:</strong> {pickupAddress.neighborhood}
                    </div>
                    <div>
                        <strong>CEP:</strong> {pickupAddress.cep}
                    </div>
                    <div>
                        <strong>Cidade:</strong> {pickupAddress.city}
                    </div>
                    <div>
                        <strong>Estado:</strong> {pickupAddress.state}
                    </div>
                    <div>
                        <strong>País:</strong> {pickupAddress.country}
                    </div>
                    {pickupAddress.complement && (
                        <div>
                            <strong>Complemento:</strong> {pickupAddress.complement}
                        </div>
                    )}
                    {pickupAddress.reference && (
                        <div>
                            <strong>Referência:</strong> {pickupAddress.reference}
                        </div>
                    )}
                    {pickupAddress.obs && (
                        <div>
                            <strong>Obs:</strong> {pickupAddress.obs}
                        </div>
                    )}
                </div>
            </div>

            {/* Produtos Adquiridos */}
            <div className="border rounded overflow-hidden">
                <div className="p-4 border-b flex items-center">
                    <h3 className="font-semibold">Produtos Adquiridos</h3>
                </div>
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b">
                            <th className="py-2 text-left">Item</th>
                            <th className="py-2 text-left">Qtde</th>
                            <th className="py-2 text-left">Preço Unit.</th>
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
                                    <div className="text-xs">
                                        {it.status} {it.statusDate}
                                    </div>
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

                {/* Resumo */}
                <div className="p-4 text-sm max-w-md ml-auto space-y-1">
                    <div className="flex justify-between">
                        <span>Subtotal de Produtos:</span>
                        <span>{formatCurrency(subtotal)}</span>
                    </div>
                    {discount != null && (
                        <div className="flex justify-between text-red-600">
                            <span>Desconto Forma Pagamento:</span>
                            <span>{formatCurrency(discount)}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-green-600">
                        <span>Valor do Frete:</span>
                        <span>{shipping}</span>
                    </div>
                    {totalIpi != null && (
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
                    onClick={onBack}
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

//
// Componente principal: lista ou detalhes
//
export const OrdersList: React.FC = () => {

    const { user } = useContext(AuthContextStore)
    
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});

    // Carrega pedidos
    useEffect(() => {
        async function load() {
            try {
                const api = setupAPIClient();
                const { data } = await api.get<Order[]>(`/customer/orders?customer_id=${user?.id}`);
                setOrders(data);
            } catch (err) {
                console.error(err);
                toast.error("Erro ao carregar pedidos");
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    const toggle = (id: string) =>
        setExpanded((e) => ({ ...e, [id]: !e[id] }));

    const formatCurrency = (v: number) =>
        v.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
        });

    if (loading) {
        return <p>Carregando pedidos…</p>;
    }

    // Se um pedido está selecionado, renderiza os detalhes
    if (selectedOrder) {
        return (
            <OrderDetails
                {...selectedOrder}
                onBack={() => setSelectedOrder(null)}
            />
        );
    }

    // Caso contrário, renderiza a lista
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Meus Pedidos</h1>

            {orders.map((order) => (
                <div key={order.id} className="border rounded overflow-hidden">
                    {/* Resumo */}
                    <div className="flex flex-col md:flex-row items-center">
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 md:grid-cols-5 gap-4 p-4">
                            {/* Número do pedido */}
                            <div>
                                <div className="text-xs uppercase font-medium border-b pb-1">
                                    Número do Pedido
                                </div>
                                <div className="mt-1 text-sm font-semibold">
                                    {order.number}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                    {order.date}
                                </div>
                            </div>

                            {/* Forma de pagamento */}
                            <div>
                                <div className="text-xs uppercase font-medium border-b pb-1">
                                    Forma de Pagamento
                                </div>
                                <div className="mt-1 text-sm">
                                    {order.paymentMethod}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                    {order.paymentLabel}
                                </div>
                            </div>

                            {/* Status */}
                            <div>
                                <div className="text-xs uppercase font-medium border-b pb-1">
                                    Status do Pedido
                                </div>
                                <div
                                    className={`
                    inline-block px-3 py-1 rounded-full text-xs font-semibold mt-1
                    ${order.status === "ENTREGUE" && "bg-blue-900 text-white"}
                    ${order.status === "CANCELADO" && "bg-red-500 text-white"}
                    ${order.status === "PROCESSANDO" && "bg-yellow-500 text-white"}
                  `}
                                >
                                    PED.{" "}
                                    {order.status === "ENTREGUE"
                                        ? "ENTREGUE"
                                        : order.status === "CANCELADO"
                                            ? "CANCELADO"
                                            : "PROCESSANDO"}
                                </div>
                            </div>

                            {/* Valor total */}
                            <div>
                                <div className="text-xs uppercase font-medium border-b pb-1">
                                    Valor Total
                                </div>
                                <div className="mt-1 text-sm">
                                    {formatCurrency(order.total)}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                    {order.installments} x de{" "}
                                    {formatCurrency(order.total)}
                                </div>
                            </div>

                            {/* Retirada ou rastreio */}
                            <div>
                                <div className="text-xs uppercase font-medium border-b pb-1">
                                    {order.storePickup
                                        ? "Retirada na Loja"
                                        : "Código de Rastreo"}
                                </div>
                                <div className="mt-1 text-sm">
                                    {order.storePickup || order.trackingCode}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                    {order.storePickup
                                        ? order.storePickup
                                        : order.trackingDays}
                                </div>
                            </div>
                        </div>

                        {/* Botões */}
                        <div className="flex items-center">
                            <button
                                onClick={() => toggle(order.id)}
                                className={`
                  px-4 py-2 flex items-center justify-center
                  ${expanded[order.id] ? "bg-blue-900" : "bg-blue-800"}
                  hover:bg-blue-700 text-white
                `}
                            >
                                {expanded[order.id] ? (
                                    <ChevronUp size={24} />
                                ) : (
                                    <ChevronDown size={24} />
                                )}
                            </button>
                            <button
                                onClick={() => setSelectedOrder(order)}
                                className="ml-2 text-blue-600 underline"
                            >
                                Visualizar pedido completo
                            </button>
                        </div>
                    </div>

                    {/* Detalhes rápidos */}
                    {expanded[order.id] && (
                        <div className="p-4 border-t bg-gray-50">
                            {/* produtos e resumo resumido */}
                            <div className="text-sm">
                                {/* aqui você pode manter seu código de detalhes resumidos */}
                                Itens do pedido: {order.items.length} produtos
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};