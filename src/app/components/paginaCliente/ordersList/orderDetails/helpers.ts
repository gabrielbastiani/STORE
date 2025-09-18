export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export const formatCurrency = (v: number | undefined | null) =>
    Number(v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const CARD_BRAND_MAP: Record<string, string> = {
    VISA: "visa.png",
    MASTERCARD: "mastercard.png",
    ELO: "elo.png",
    HIPERCARD: "hipercard.png",
    AMEX: "amex.png",
    DINERS: "diners.png",
    DISCOVER: "discover.png",
    AURA: "aura.png",
    JCB: "jcb.png",
    MAESTRO: "maestro.png",
    DEFAULT: "no-image-card.png",
};

export const getCardBrandFile = (brand?: string | null) => {
    if (!brand) return `/card-brands/${CARD_BRAND_MAP.DEFAULT}`;
    const key = brand.toString().toUpperCase();
    return `/card-brands/${CARD_BRAND_MAP[key] ?? CARD_BRAND_MAP.DEFAULT}`;
};

export const maskCardNumber = (num?: string | null) => {
    if (!num) return "—";
    const s = num.toString();
    const last4 = s.slice(-4);
    return `**** **** **** ${last4}`;
};

export const getAsaasWebhookPayload = (payment?: any) => {
    return (
        payment?.gateway_response?.asaas_webhook_payload ??
        payment?.gateway_response?.raw?.asaas_webhook_payload ??
        null
    );
};

export const getGwRaw = (payment?: any) => {
    return payment?.gateway_response?.raw ?? payment?.gateway_response ?? null;
};

export const PRINT_CSS = `
@page { size: A4 portrait; margin: 10mm; }

@media print {
  body * { visibility: hidden !important; }
  .printable-order, .printable-order * { visibility: visible !important; }
  .printable-order { position: absolute !important; left: 0 !important; top: 0 !important; width: 210mm !important; height: 297mm !important; padding: 12mm !important; box-sizing: border-box !important; background: white !important; color: #000 !important; }
  .no-print { display: none !important; }
  .print-only { display: block !important; }

  .printable-order table { width: 100% !important; border-collapse: collapse !important; font-size: 12pt !important; }
  .printable-order th, .printable-order td { border: 1px solid #222 !important; padding: 6px !important; vertical-align: top !important; }

  .printable-order img { max-width: 40mm !important; max-height: 40mm !important; object-fit: contain !important; }

  tr, thead, tbody { page-break-inside: avoid !important; }
  .page-break { page-break-after: always; }

  .printable-order h1 { font-size: 18pt !important; margin-bottom: 8px !important; }
  .printable-order h2 { font-size: 14pt !important; margin-bottom: 6px !important; }

  .printable-order .p-4 { padding: 6px !important; }
  .printable-order .p-3 { padding: 6px !important; }
  .printable-order .space-y-1 > * + * { margin-top: 4px !important; }
  .printable-order .space-y-2 > * + * { margin-top: 6px !important; }
}

.print-only { display: none; }
`;