"use client";

import { useState, useEffect, useContext } from "react";
import { setupAPIClient } from "@/services/api";
import { toast } from "react-toastify";
import { ChevronUp, ChevronDown } from "lucide-react";
import { AuthContextStore } from "@/app/contexts/AuthContextStore";
import type { ApiOrder, ApiOrderItem, ApiImage, ApiPayment, Order, OrderItem } from "./types/orders";
import OrderDetails from "./orderDetails";
import InlineOrderDetails from "./InlineOrderDetails";
import { buildImageUrl, formatDateBR, mapApiStatusToUi, paymentMethodLabel } from "./lib/orders";

/**
 * Mapeia um ApiOrder (raw) para o Order consumido pela UI.
 * Observe: priorizamos api.payment?.status como fonte de verdade do status do pedido.
 */
const mapApiOrderToUI = (api: ApiOrder): Order => {
    const itemsApi: ApiOrderItem[] = api.items ?? [];

    const items: OrderItem[] = itemsApi.map((it) => {
        const image = (it.product?.images ?? []).find((img: ApiImage) => img.isPrimary) ?? (it.product?.images ?? [])[0];

        let variantLabel: string | null = null;
        if (it.product?.variants && it.product.variants.length > 0) {
            const v = it.product.variants[0];
            if (v?.variantAttribute && v.variantAttribute.length > 0) {
                const attr = v.variantAttribute[0];
                variantLabel = `${attr.key}: ${attr.value}`;
            }
        }

        const unitPrice = Number(it.price ?? 0);
        const quantity = Number(it.quantity ?? 0);

        // NOTE: item.status here we set based on payment status OR api.status to keep consistência.
        const itemStatusNormalized = mapApiStatusToUi(api.payment?.status ?? api.status);

        return {
            id: it.id,
            image: buildImageUrl(image?.url ?? null),
            name: it.product?.name ?? "Produto",
            variant: variantLabel,
            quantity,
            unitPrice,
            totalPrice: +(unitPrice * quantity),
            status: itemStatusNormalized,
            statusDate: formatDateBR(it.created_at ?? api.created_at ?? null),
            ipi: null,
            productId: it.product_id,
            sku: it.product?.skuMaster ?? null,
        };
    });

    const pickupAddress = {
        recipient_name: api.shippingAddress ?? undefined,
        street: api.shippingAddress ?? undefined,
        number: undefined,
        neighborhood: undefined,
        cep: undefined,
        city: undefined,
        state: undefined,
        country: undefined,
        complement: undefined,
        reference: undefined,
        obs: undefined,
    };

    const shippingText =
        typeof api.shippingCost === "number"
            ? api.shippingCost.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
            : api.shippingAddress ?? null;

    let installments = 1;
    if (api.payment?.installment_plan && typeof api.payment.installment_plan === "number") {
        installments = api.payment.installment_plan;
    }

    // Prioriza status do payment se existir, senão usa api.status
    const normalizedStatus = mapApiStatusToUi(api.payment?.status ?? api.status);

    return {
        id: api.id,
        id_order_store: api.id_order_store ?? undefined,
        date: formatDateBR(api.created_at ?? null),
        paymentMethod: api.payment?.method ?? undefined,
        paymentLabel: paymentMethodLabel(api.payment?.method ?? undefined, api.payment ?? null),
        status: normalizedStatus, // status normalizado para UI
        total: Number(api.total ?? api.grandTotal ?? 0),
        installments,
        storePickup: undefined,
        trackingCode: api.trackingCode ?? undefined,
        trackingDays: api.estimatedDelivery ?? undefined,
        items,
        discount: null,
        shipping: shippingText,
        totalIpi: null,
        pickupAddress,
        raw: api,
    };
};

export const OrdersList: React.FC = () => {
    
    const { user } = useContext(AuthContextStore);

    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});

    console.log(orders)

    // ===== status maps (keys devem ser os valores retornados por mapApiStatusToUi) =====
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
    // ================================================================================

    useEffect(() => {
        async function load() {
            try {
                const api = setupAPIClient();
                const { data } = await api.get<ApiOrder[]>(`/customer/orders?customer_id=${user?.id}`);
                const uiOrders = (data ?? []).map(mapApiOrderToUI);
                setOrders(uiOrders);
            } catch (err) {
                console.error(err);
                toast.error("Erro ao carregar pedidos");
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [user?.id]);

    const toggle = (id: string) => setExpanded((e) => ({ ...e, [id]: !e[id] }));

    const formatCurrency = (v: number) =>
        v.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
        });

    if (loading) {
        return <p>Carregando pedidos…</p>;
    }

    // se selecionado, renderiza o detalhe completo (página modal-like)
    if (selectedOrder) {
        return <OrderDetails {...selectedOrder} onBack={() => setSelectedOrder(null)} />;
    }

    return (
        <div className="space-y-6 text-black">
            {orders.map((order) => {
                // Display status: prioriza raw.payment.status -> raw.status -> order.status
                const sourceStatus = order.raw?.payment?.status ?? order.raw?.status ?? order.status;
                const displayStatusNormalized = mapApiStatusToUi(sourceStatus);
                const statusClass = STATUS_STYLES[displayStatusNormalized] ?? "bg-gray-200 text-gray-800";
                const statusLabel = STATUS_LABELS[displayStatusNormalized] ?? displayStatusNormalized ?? "DESCONHECIDO";

                return (
                    <div key={order.id} className="border rounded overflow-hidden relative">
                        {/* bloco principal do pedido */}
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
                                    <div className="mt-1 text-sm">{formatCurrency(order.total)}</div>
                                    <div className="text-xs text-gray-500 mt-1">{order.installments ?? 1} x de {formatCurrency(order.total)}</div>
                                </div>

                                <div>
                                    <div className="text-xs uppercase font-medium border-b pb-1">{order.storePickup ? "Retirada na Loja" : "Código de Rastreo"}</div>
                                    <div className="mt-1 text-sm">{order.storePickup || order.trackingCode || "—"}</div>
                                    <div className="text-xs text-gray-500 mt-1">{order.storePickup ? order.storePickup : order.trackingDays}</div>
                                </div>
                            </div>

                            {/* coluna da seta vertical à direita */}
                            <div className="flex items-stretch">
                                <div
                                    className={`w-12 flex items-center justify-center cursor-pointer ${expanded[order.id] ? "bg-blue-900 text-white" : "bg-blue-800 text-white"}`}
                                    onClick={() => toggle(order.id)}
                                    role="button"
                                    aria-expanded={Boolean(expanded[order.id])}
                                    aria-controls={`order-details-${order.id}`}
                                    title={expanded[order.id] ? "Fechar detalhes" : "Abrir detalhes"}
                                >
                                    <div>
                                        {expanded[order.id] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* painel inline com detalhes — fica logo abaixo do bloco principal */}
                        {expanded[order.id] && (
                            <div id={`order-details-${order.id}`}>
                                <InlineOrderDetails order={order} onViewFull={() => setSelectedOrder(order)} />
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default OrdersList;