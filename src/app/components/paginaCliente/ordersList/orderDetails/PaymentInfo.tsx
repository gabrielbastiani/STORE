"use client";

import React from "react";
import type { ApiPayment } from "../types/orders";
import { paymentMethodLabel } from "../lib/orders";
import { formatCurrency, getCardBrandFile, maskCardNumber, getAsaasWebhookPayload, getGwRaw } from "./helpers";

type Props = {
    payment?: ApiPayment | null;
    gwRaw?: any;
    webhook?: any;
    installmentNumber?: any;
};

const getPaymentStatusLabel = (payment?: ApiPayment | null) => {
    const webhook = getAsaasWebhookPayload(payment);
    const gwRaw = getGwRaw(payment);
    const rawStatus = webhook?.status ?? gwRaw?.status ?? payment?.status ?? null;
    // import mapApiStatusToUi lazily to avoid circular import
    // but payment status mapping is not critical here; use string if map not available
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { mapApiStatusToUi } = require("../lib/orders");
        return mapApiStatusToUi(rawStatus ?? undefined);
    } catch {
        return String(rawStatus ?? "—");
    }
};

const PaymentInfo: React.FC<Props> = ({ payment, gwRaw, webhook, installmentNumber }) => {
    if (!payment) return null;

    const paymentStatusLabel = getPaymentStatusLabel(payment);

    const creditCardBrand =
        gwRaw?.creditCard?.creditCardBrand ?? gwRaw?.raw?.creditCard?.creditCardBrand ?? gwRaw?.creditCardBrand ?? null;
    const creditCardNumber =
        gwRaw?.creditCard?.creditCardNumber ?? gwRaw?.raw?.creditCard?.creditCardNumber ?? gwRaw?.creditCardNumber ?? null;
    const pixImage = payment?.gateway_response?.pix_qr_image ?? gwRaw?.pix_qr_image ?? gwRaw?.raw?.pix_qr_image ?? null;

    return (
        <div className="mt-3 text-sm p-3 bg-yellow-50 border rounded no-print">
            <div className="font-semibold mb-2">Informações de Pagamento</div>

            <div>ID do pagamento: <strong>{payment.id ?? "—"}</strong></div>
            <div>Método: <strong>{paymentMethodLabel(payment.method ?? undefined)}</strong></div>
            <div>Valor: <strong>{formatCurrency(payment.amount)}</strong></div>
            <div>Status: <strong>{paymentStatusLabel}</strong></div>

            {payment.method?.toUpperCase?.() === "CREDIT_CARD" && (
                <div className="mt-3 space-y-2">
                    <div>Parcelado: <strong>{payment.installment_plan.installments}x - {formatCurrency(payment.installment_plan.value)}</strong></div>

                    <div className="flex items-center space-x-3">
                        <img src={getCardBrandFile(creditCardBrand)} alt={creditCardBrand ?? "Bandeira"} className="h-8 w-12 object-contain" />
                        <div>
                            <div className="text-sm">{creditCardBrand ?? "—"}</div>
                            <div className="text-xs text-gray-500">{creditCardNumber ? maskCardNumber(creditCardNumber) : "—"}</div>
                        </div>
                    </div>
                </div>
            )}

            {payment.method?.toUpperCase?.() === "BOLETO" && (
                <div className="mt-3 space-y-2">
                    <div>
                        <a href={payment?.boleto_url ?? undefined} target="_blank" rel="noreferrer" className="underline text-blue-600">Abrir Boleto</a>
                    </div>
                </div>
            )}

            {payment.method?.toUpperCase?.() === "PIX" && (
                <div className="mt-3 space-y-2">
                    <div>Chave/Código PIX: <strong>{payment?.pix_qr_code ?? "—"}</strong></div>
                    {pixImage && (
                        <div className="mt-2">
                            <img src={pixImage.startsWith("data:") ? pixImage : `data:image/png;base64,${pixImage}`} alt="QR Code PIX" className="h-40 w-40 object-contain border p-1 bg-white" />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default PaymentInfo;