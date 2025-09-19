"use client";

import React, { useContext } from "react";
import type { Order, ApiPayment } from "../types/orders";
import PrintHeader from "./PrintHeader";
import PaymentInfo from "./PaymentInfo";
import AddressSection from "./AddressSection";
import ProductsTable from "./ProductsTable";
import SummaryBox from "./SummaryBox";
import ActionButtons from "./ActionButtons";
import OrderChat from "./orderChat/OrderChat";
import { PRINT_CSS, getAsaasWebhookPayload, getGwRaw } from "./helpers";
import { mapApiStatusToUi, paymentMethodLabel } from "../lib/orders";
import { AuthContextStore } from "@/app/contexts/AuthContextStore";

type Props = Order & { onBack: () => void };

const OrderDetails: React.FC<Props> = ({ onBack, ...order }) => {
    if (!order) return <p>Pedido não encontrado.</p>;

    const { configs } = useContext(AuthContextStore);

    const {
        id_order_store,
        date,
        status: orderStatus,
        paymentLabel,
        total,
        discount,
        shipping,
        totalIpi,
        items,
        pickupAddress,
        raw,
    } = order;

    const subtotal = (items ?? []).reduce((s, it) => s + (it.totalPrice ?? 0), 0);

    const payment: ApiPayment | null | undefined = raw?.payment ?? null;
    const webhook = getAsaasWebhookPayload(payment);
    const gwRaw = getGwRaw(payment);
    const installmentNumber = webhook?.installmentNumber ?? gwRaw?.installmentNumber ?? gwRaw?.raw?.installmentNumber ?? null;

    return (
        <div className="printable-order space-y-6 text-black mx-auto p-4 bg-white">
            <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />

            <PrintHeader configs={configs} />

            <h1 className="text-2xl font-bold">Detalhes do Pedido</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border rounded p-4 space-y-3">
                    <h2 className="flex items-center text-lg font-semibold">Dados do Pedido</h2>

                    <div className="text-sm text-gray-700">
                        <div>
                            Data de Compra: <span className="font-medium">{date ?? raw?.created_at}</span>
                        </div>
                    </div>

                    <div className="bg-gray-100 p-3 rounded flex flex-col sm:flex-row items-start sm:items-center justify-between">
                        <div>
                            <div className="text-xs uppercase font-medium text-gray-600">Número do Pedido</div>
                            <div className="text-2xl font-bold">{id_order_store ?? order.id}</div>
                        </div>

                        <div className="mt-2 sm:mt-0 text-xs text-gray-600">
                            A confirmação do seu pedido foi enviada para o e-mail:
                            <br />
                            <span className="font-medium">{raw?.payment?.customer?.email ?? raw?.customer_id ?? "—"}</span>
                        </div>
                    </div>

                    <div className="text-sm space-y-1">
                        <div>
                            Status do Pedido: <span className="font-medium">{mapApiStatusToUi(orderStatus ?? raw?.status ?? undefined)}</span>
                        </div>
                        <div>
                            Prazo de entrega: <span className="font-medium">{order.trackingDays ?? raw?.estimatedDelivery ?? "—"}</span>
                        </div>
                        <div>
                            Forma de pagamento: <span className="font-medium">{paymentMethodLabel(payment?.method ?? raw?.payment?.method ?? paymentLabel ?? undefined)}</span>
                        </div>
                        <div>
                            Valor total: <span className="font-medium">
                                {Number(raw?.grandTotal ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                {raw?.payment?.installment_plan?.installments >= 13 ? ` com juros de ${raw?.payment?.installment_plan?.juros}%a.m` : null}
                            </span>
                        </div>
                    </div>

                    <PaymentInfo payment={payment} gwRaw={gwRaw} webhook={webhook} installmentNumber={installmentNumber} />
                </div>

                <AddressSection pickupAddress={pickupAddress} />
            </div>

            <ProductsTable items={items} />

            <SummaryBox subtotal={subtotal} discount={discount} shipping={shipping} totalIpi={totalIpi} total={total} raw={raw} />

            <ActionButtons onBack={onBack} />

            <OrderChat orderId={order.id} />
        </div>
    );
};

export default OrderDetails;