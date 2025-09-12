import type { ApiPayment } from "../types/orders";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

/** Constrói URL de imagem (respeita URLs absolutas) */
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

export const mapApiStatusToUi = (rawStatus?: string | null): string => {
  if (!rawStatus) return "PROCESSANDO";
  const s = rawStatus.toString().trim().toUpperCase();

  // mapeamentos comuns (inclui status de payment gateways e labels em PT/EN)
  if (["CONFIRMED", "PAID", "COMPLETED", "FINISHED"].includes(s)) return "PAGO";
  if (["ENTREGUE"].includes(s)) return "ENTREGUE";
  if (["EM TRANSITO"].includes(s)) return "EM TRANSITO";
  if (["CANCELLED", "CANCELED", "REFUSED", "REFUNDED"].includes(s)) return "CANCELADO";
  if (["PENDING", "PROCESSING", "PROCESSANDO", "AWAITING_PAYMENT"].includes(s)) return "PROCESSANDO";
  if (["FAILED", "ERROR", "DECLINED"].includes(s)) return "FALHOU";
  if (["OVERDUE", "LATE"].includes(s)) return "ATRASADO";
  if (["PAID_OUT", "RECEIVED"].includes(s)) return "RECEBIDO";
  // fallback: se já estiver em PT use as palavras
  if (s === "ENTREGUE" || s === "CANCELADO" || s === "PROCESSANDO" || s === "PENDENTE" || s === "EM TRANSITO" || s === "PAGO") return s;
  // default
  return s;
};

/** Retorna label legível de método de pagamento (em MAIÚSCULAS, conforme solicitado) */
export const paymentMethodLabel = (method?: string | null, payment?: ApiPayment | null): string => {
  if (!method && payment?.method) method = payment.method;
  if (!method) return "NÃO INFORMADO";
  const m = method.toString().toUpperCase();
  if (m === "BOLETO") return "BOLETO";
  if (m === "CREDIT_CARD" || m === "CARTAO" || m === "CARTÃO" || m === "CARTAO_DE_CREDITO")
    return "CARTÃO DE CRÉDITO";
  if (m === "PIX") return "PIX";
  if (m === "BANK_TRANSFER" || m === "TRANSFER" || m === "TRANSFERENCIA") return "TRANSFERÊNCIA";
  return m;
};