"use client";

import React from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import InlineOrderDetails from "./InlineOrderDetails";
import type { Order } from "./types/orders";
import { mapApiStatusToUi } from "./lib/orders";

type Props = {
    order: Order;
    expanded: boolean;
    toggle: (id: string) => void;
    onViewFull: (order: Order) => void; // nova prop
};

const STATUS_STYLES: Record<string, string> = {
    ENTREGUE: "bg-blue-700 text-white",
    CANCELADO: "bg-red-500 text-white",
    PROCESSANDO: "bg-yellow-500 text-white",
    PENDENTE: "bg-orange-500 text-white",
    PAGO: "bg-green-500 text-white",
    ESTORNADO: "bg-pink-500 text-white",
    FALHOU: "bg-red-800 text-white",
    ATRASADO: "bg-gray-500 text-white",
    COMPLETO: "bg-lime-300 text-black",
    REVERSO: "bg-rose-500 text-white",
    RECEBIDO: "bg-green-700 text-white",
};

const STATUS_LABELS: Record<string, string> = {
    ENTREGUE: "ENTREGUE",
    CANCELADO: "CANCELADO",
    PROCESSANDO: "EM PROCESSAMENTO",
    PENDENTE: "PENDENTE",
    PAGO: "PAGO",
    ESTORNADO: "ESTORNADO",
    FALHOU: "FALHOU",
    ATRASADO: "ATRASADO",
    COMPLETO: "COMPLETO",
    REVERSO: "REVERSO",
    RECEBIDO: "RECEBIDO",
};

const OrderCard: React.FC<Props> = ({ order, expanded, toggle, onViewFull }) => {
    const sourceStatus = order.raw?.payment?.status ?? order.raw?.status ?? order.status;
    const displayStatusNormalized = mapApiStatusToUi(sourceStatus);
    const statusClass = STATUS_STYLES[displayStatusNormalized] ?? "bg-gray-200 text-gray-800";
    const statusLabel = STATUS_LABELS[displayStatusNormalized] ?? displayStatusNormalized ?? "DESCONHECIDO";

    const formatCurrency = (v: number) =>
        v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

    return (
        <div className="border rounded overflow-hidden relative">
            <div className="flex flex-col md:flex-row items-center">
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 md:grid-cols-5 gap-4 p-4">
                    <div>
                        <div className="text-xs uppercase font-medium border-b pb-1">Número do Pedido</div>
                        <div className="mt-1 text-sm font-semibold">{order.id_order_store}</div>
                        <div className="text-xs text-gray-500 mt-1">{order.date}</div>
                    </div>

                    <div>
                        <div className="text-xs uppercase font-medium border-b pb-1">Forma de Pagamento</div>
                        <div className="mt-1 text-sm">{order.paymentMethod}</div>
                        <div className="text-xs text-gray-500 mt-1">{order.paymentLabel}</div>
                    </div>

                    <div>
                        <div className="text-xs uppercase font-medium border-b pb-1">Status do Pedido</div>
                        <div className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mt-1 ${statusClass}`}>
                            PED. {statusLabel}
                        </div>
                    </div>

                    <div>
                        <div className="text-xs uppercase font-medium border-b pb-1">Valor Total</div>
                        <div className="mt-1 text-sm">{formatCurrency(order.raw?.grandTotal || 0)}</div>
                        <div className="text-xs text-gray-500 mt-1">{order.installments ?? 1} x de {formatCurrency(order.total)}</div>
                    </div>

                    <div>
                        <div className="text-xs uppercase font-medium border-b pb-1">{order.storePickup ? "Retirada na Loja" : "Código de Rastreo"}</div>
                        <div className="mt-1 text-sm">{order.storePickup || order.trackingCode || "—"}</div>
                        <div className="text-xs text-gray-500 mt-1">{order.storePickup ? order.storePickup : order.trackingDays}</div>
                    </div>
                </div>

                <div className="flex items-stretch">
                    <div
                        className={`w-12 flex items-center justify-center cursor-pointer ${expanded ? "bg-orange-900 text-white" : "bg-orange-800 text-white"}`}
                        onClick={() => toggle(order.id)}
                        role="button"
                        aria-expanded={Boolean(expanded)}
                        aria-controls={`order-details-${order.id}`}
                        title={expanded ? "Fechar detalhes" : "Abrir detalhes"}
                    >
                        {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                </div>
            </div>

            {expanded && (
                <div id={`order-details-${order.id}`}>
                    {/* IMPORTANT: encaminha o evento para o pai para abrir o modal/página completa */}
                    <InlineOrderDetails order={order} onViewFull={() => onViewFull(order)} />
                </div>
            )}
        </div>
    );
};

export default OrderCard;