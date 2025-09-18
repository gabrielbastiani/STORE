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

    /**
     * Tenta normalizar e retornar:
     * { installmentsCount: number, perInstallmentValue: number, interest?: string | null }
     */
    const getInstallmentInfo = () => {
        // pode existir em vários lugares — usamos optional chaining
        const paymentInstallmentPlan =
            (order.payment && (order.payment as any).installment_plan) ??
            (order.raw?.payment && order.raw.payment.installment_plan) ??
            null;

        let installmentsCount: number | null = null;
        let perInstallmentValue: number | null = null;
        let interestRaw: any = null;

        if (paymentInstallmentPlan && typeof paymentInstallmentPlan === "object") {
            const maybeInst = Number(paymentInstallmentPlan.installments ?? paymentInstallmentPlan.instalments ?? paymentInstallmentPlan.count ?? NaN);
            const maybeVal = Number(paymentInstallmentPlan.value ?? paymentInstallmentPlan.perInstallment ?? paymentInstallmentPlan.amount ?? NaN);

            // possíveis campos de juros (aceitamos várias formas)
            interestRaw =
                paymentInstallmentPlan.juros ??
                paymentInstallmentPlan.interest ??
                paymentInstallmentPlan.interestMonthly ??
                paymentInstallmentPlan.interest_rate ??
                paymentInstallmentPlan.juros_percent ??
                paymentInstallmentPlan.interestPercent ??
                paymentInstallmentPlan.jurosPercent ??
                paymentInstallmentPlan.juros_porcentagem ??
                paymentInstallmentPlan.interest_rate_percent ??
                null;

            if (Number.isFinite(maybeInst) && maybeInst > 0) installmentsCount = maybeInst;
            if (Number.isFinite(maybeVal)) perInstallmentValue = maybeVal;
        }

        // fallback para campo simplificado order.installments (p.ex. 6)
        if (!installmentsCount) {
            const maybeFromOrderField = Number(order.installments ?? (order as any).installments ?? NaN);
            if (Number.isFinite(maybeFromOrderField) && maybeFromOrderField > 0) installmentsCount = maybeFromOrderField;
        }

        // se ainda não temos perInstallmentValue, tentamos pegar do raw.payment.value/amount ou calcular a partir do grandTotal
        if (!perInstallmentValue) {
            const grand = Number(order.raw?.grandTotal ?? order.raw?.total ?? order.total ?? 0);
            // se gateway retornou payment value (ex: payment.value / payment.amount)
            const paymentAmount = Number(order.raw?.payment?.value ?? order.raw?.payment?.amount ?? (order.payment && (order.payment as any).amount) ?? NaN);
            const baseAmount = Number.isFinite(paymentAmount) ? paymentAmount : (Number.isFinite(grand) ? grand : (order.total ?? 0));

            if (installmentsCount && installmentsCount > 0) {
                // calcula per parcela aproximado (fixa 2 casas)
                perInstallmentValue = Number((baseAmount / installmentsCount).toFixed(2));
            } else {
                // sem parcelas detectadas -> tratar como 1x (valor total)
                perInstallmentValue = Number(baseAmount ?? (order.total ?? 0));
                installmentsCount = 1;
            }
        }

        // garantia: valores válidos
        installmentsCount = installmentsCount && installmentsCount > 0 ? installmentsCount : 1;
        perInstallmentValue = Number(perInstallmentValue ?? (order.total ?? 0));

        // normaliza juros para string legível (se for número, adiciona % a.m.)
        let interestNormalized: string | null = null;
        if (interestRaw != null) {
            if (typeof interestRaw === "number" && Number.isFinite(interestRaw)) {
                // ex: 1.99 -> "1.99% a.m."
                interestNormalized = `${Number(interestRaw)}% a.m.`;
            } else if (typeof interestRaw === "string") {
                // tentar limpar e formatar: se for número em string -> adicionar % a.m.
                const num = parseFloat(interestRaw.replace(/[^0-9.,-]/g, "").replace(",", "."));
                if (!Number.isNaN(num)) {
                    interestNormalized = `${num}% a.m.`;
                } else {
                    // mantém string original (ex: "1.99% a.m.")
                    interestNormalized = interestRaw;
                }
            } else {
                // outros formatos - converter para string
                try {
                    interestNormalized = String(interestRaw);
                } catch {
                    interestNormalized = null;
                }
            }
        }

        return { installmentsCount, perInstallmentValue, interest: interestNormalized };
    };

    const { installmentsCount, perInstallmentValue, interest } = getInstallmentInfo();

    // Se 1 parcela, mostrar "À vista — R$ X" para melhor UX
    // Regra nova: se installmentsCount > 12 e tiver `interest`, mostrar juros (após o valor). Caso contrário NÃO mostrar juros.
    const installmentsDisplay = (installmentsCount && installmentsCount > 1)
        ? (installmentsCount > 12 && interest
            ? `${installmentsCount}x de ${formatCurrency(perInstallmentValue)} — juros ${interest}`
            : `${installmentsCount}x de ${formatCurrency(perInstallmentValue)}`
        )
        : `À vista — ${formatCurrency(perInstallmentValue)}`;

    // ---------- fim lógica parcelas ----------

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
                        <div className="mt-1 text-sm">{formatCurrency(Number(order.raw?.grandTotal ?? order.total ?? 0))}</div>
                        <div className="text-xs text-gray-500 mt-1">{installmentsDisplay}</div>
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