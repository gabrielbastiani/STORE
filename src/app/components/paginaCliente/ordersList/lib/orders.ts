import type { ApiPayment } from "../types/orders";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export const buildImageUrl = (partial?: string | null): string | null => {
    if (!partial) return null;
    if (partial.startsWith("http://") || partial.startsWith("https://")) return partial;
    const cleaned = partial.startsWith("/") ? partial.slice(1) : partial;
    return `${API_URL.replace(/\/$/, "")}/files/${cleaned}`;
};

export const formatDateBR = (iso?: string | null): string => {
    if (!iso) return "";
    try {
        const d = new Date(iso);
        return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
    } catch {
        return iso ?? "";
    }
};

export const mapApiStatusToUi = (apiStatus?: string | null): string => {
    if (!apiStatus) return "PROCESSANDO";
    const s = apiStatus.toUpperCase();
    if (s === "COMPLETED" || s === "DELIVERED" || s === "ENTREGUE") return "ENTREGUE";
    if (s === "CANCELLED" || s === "CANCELED" || s === "CANCELADO") return "CANCELADO";
    if (s === "PENDING" || s === "PROCESSING" || s === "PROCESSANDO") return "PROCESSANDO";
    return apiStatus.toUpperCase();
};

export const paymentMethodLabel = (method?: string | null, payment?: ApiPayment | null): string => {
    if (!method && payment?.method) method = payment.method;
    if (!method) return "NÃO INFORMADO";
    const m = method.toUpperCase();
    if (m === "BOLETO") return "BOLETO";
    if (m === "CREDIT_CARD" || m === "CARTAO" || m === "CARTÃO" || m === "CARTAO_DE_CREDITO")
        return "CARTÃO DE CRÉDITO";
    if (m === "PIX") return "PIX";
    if (m === "BANK_TRANSFER" || m === "TRANSFER" || m === "TRANSFERENCIA")
        return "TRANSFERÊNCIA";
    return m;
};