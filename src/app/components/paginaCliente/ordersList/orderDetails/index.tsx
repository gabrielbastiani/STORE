"use client";

import React, { useContext } from "react";
import { Printer, ArrowLeft } from "lucide-react";
import type { Order, OrderItem as OrderItemType, ApiPayment } from "../types/orders";
import { buildImageUrl, formatDateBR, mapApiStatusToUi, paymentMethodLabel } from "../lib/orders";
import { AuthContextStore } from "@/app/contexts/AuthContextStore";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

type OrderDetailsProps = Order & {
    onBack: () => void;
};

const formatCurrency = (v: number | undefined | null) =>
    Number(v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const CARD_BRAND_MAP: Record<string, string> = {
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

const getCardBrandFile = (brand?: string | null) => {
    if (!brand) return `/card-brands/${CARD_BRAND_MAP.DEFAULT}`;
    const key = brand.toString().toUpperCase();
    return `/card-brands/${CARD_BRAND_MAP[key] ?? CARD_BRAND_MAP.DEFAULT}`;
};

const maskCardNumber = (num?: string | null) => {
    if (!num) return "—";
    const s = num.toString();
    const last4 = s.slice(-4);
    return `**** **** **** ${last4}`;
};

const getAsaasWebhookPayload = (payment?: ApiPayment | null) => {
    return payment?.gateway_response?.asaas_webhook_payload ?? payment?.gateway_response?.raw?.asaas_webhook_payload ?? null;
};

const getGwRaw = (payment?: ApiPayment | null) => {
    return payment?.gateway_response?.raw ?? payment?.gateway_response ?? null;
};

const getPaymentStatusLabel = (payment?: ApiPayment | null) => {
    const webhook = getAsaasWebhookPayload(payment);
    const gwRaw = getGwRaw(payment);
    const rawStatus = webhook?.status ?? gwRaw?.status ?? payment?.status ?? null;
    return mapApiStatusToUi(rawStatus ?? undefined);
};

/* CSS de impressão movido para constante para evitar confusão do parser */
const PRINT_CSS = `
@page {
  size: A4 portrait;
  margin: 10mm;
}

/* Print styles */
@media print {
  /* hide everything... */
  body * {
    visibility: hidden !important;
  }

  /* ...except the printable area */
  .printable-order, .printable-order * {
    visibility: visible !important;
  }

  /* position the printable area at the top-left and size to A4 */
  .printable-order {
    position: absolute !important;
    left: 0 !important;
    top: 0 !important;
    width: 210mm !important;
    height: 297mm !important;
    padding: 12mm !important;
    box-sizing: border-box !important;
    background: white !important;
    color: #000 !important;
  }

  /* hide controls */
  .no-print {
    display: none !important;
  }

  /* print-only header (shown only on print) */
  .print-only { display: block !important; }

  /* table formatting */
  .printable-order table {
    width: 100% !important;
    border-collapse: collapse !important;
    font-size: 12pt !important;
  }
  .printable-order th, .printable-order td {
    border: 1px solid #222 !important;
    padding: 6px !important;
    vertical-align: top !important;
  }

  /* images sizing for print */
  .printable-order img {
    max-width: 40mm !important;
    max-height: 40mm !important;
    object-fit: contain !important;
  }

  /* avoid breaking rows across pages */
  tr, thead, tbody {
    page-break-inside: avoid !important;
  }

  /* allow page break between main sections */
  .page-break { page-break-after: always; }

  /* make headings slightly larger */
  .printable-order h1 { font-size: 18pt !important; margin-bottom: 8px !important; }
  .printable-order h2 { font-size: 14pt !important; margin-bottom: 6px !important; }

  /* reduce margins/paddings that could overflow */
  .printable-order .p-4 { padding: 6px !important; }
  .printable-order .p-3 { padding: 6px !important; }
  .printable-order .space-y-1 > * + * { margin-top: 4px !important; }
  .printable-order .space-y-2 > * + * { margin-top: 6px !important; }
}

/* hide print-only UI on screen */
.print-only { display: none; }
`;

export const OrderDetails: React.FC<OrderDetailsProps> = ({ onBack, ...order }) => {
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

    const paymentStatusLabel = getPaymentStatusLabel(payment);

    const creditCardBrand =
        gwRaw?.creditCard?.creditCardBrand ??
        gwRaw?.raw?.creditCard?.creditCardBrand ??
        gwRaw?.creditCardBrand ??
        null;

    const creditCardNumber =
        gwRaw?.creditCard?.creditCardNumber ??
        gwRaw?.raw?.creditCard?.creditCardNumber ??
        gwRaw?.creditCardNumber ??
        null;

    const installmentNumber =
        webhook?.installmentNumber ??
        gwRaw?.installmentNumber ??
        gwRaw?.raw?.installmentNumber ??
        null;

    const boletoBarcode = payment?.boleto_barcode ?? gwRaw?.boleto_barcode ?? gwRaw?.raw?.boleto_barcode ?? null;
    const boletoUrl = payment?.boleto_url ?? gwRaw?.invoiceUrl ?? gwRaw?.raw?.invoiceUrl ?? null;
    const bankSlipUrl = gwRaw?.bankSlipUrl ?? gwRaw?.raw?.bankSlipUrl ?? null;

    const pixQrCode = payment?.pix_qr_code ?? gwRaw?.pix_qr_code ?? gwRaw?.raw?.pix_qr_code ?? null;
    const pixExpiration = payment?.pix_expiration ?? gwRaw?.pix_expiration ?? gwRaw?.raw?.pix_expiration ?? null;
    const pixImage =
        payment?.gateway_response?.pix_qr_image ??
        gwRaw?.pix_qr_image ??
        gwRaw?.raw?.pix_qr_image ??
        null;

    const transactionReceiptUrl =
        gwRaw?.transactionReceiptUrl ?? gwRaw?.raw?.transactionReceiptUrl ?? null;

    return (
        <div className="printable-order space-y-6 text-black mx-auto p-4 bg-white">
            {/* injeta CSS de impressão */}
            <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />

            {/* optional print-only header (company info, visible only on printed page) */}
            <div className="print-only mb-2">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div>
                        {/* Se tiver logo público, substitua /logo.png */}
                        {configs?.logo ? (
                            // cria a URL completa apenas se configs.logo estiver disponível
                            <img src={`${API_URL}/files/${configs.logo}`} alt="Logo" style={{ height: 36, objectFit: "contain" }} />
                        ) : (
                            <img src="/logo.png" alt="Logo" style={{ height: 36, objectFit: "contain" }} />
                        )}
                    </div>
                    <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: 700 }}>{configs?.name ?? "Nome da Loja"}</div>
                        <div style={{ fontSize: 12 }}>CNPJ/CPF: {configs?.cnpj || configs?.cpf}</div>
                        <div style={{ fontSize: 12 }}>Telefone: {configs?.phone ?? "—"}</div>
                    </div>
                </div>
                <hr />
            </div>

            <h1 className="text-2xl font-bold">Detalhes do Pedido</h1>

            {/* Dados do Pedido + Endereço */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Dados do Pedido */}
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
                            Valor total: <span className="font-medium">{formatCurrency(total ?? raw?.grandTotal)}</span>
                        </div>
                    </div>

                    {payment && (
                        /* Mantém visible na tela, mas oculta na impressão */
                        <div className="mt-3 text-sm p-3 bg-yellow-50 border rounded no-print">
                            <div className="font-semibold mb-2">Informações de Pagamento</div>

                            <div>ID do pagamento: <strong>{payment.id ?? "—"}</strong></div>
                            <div>Método: <strong>{paymentMethodLabel(payment.method ?? undefined)}</strong></div>
                            <div>Valor: <strong>{formatCurrency(payment.amount)}</strong></div>
                            <div>Status: <strong>{paymentStatusLabel}</strong></div>

                            {payment.method?.toUpperCase?.() === "CREDIT_CARD" && (
                                <div className="mt-3 space-y-2">
                                    <div>Parcelado: <strong>{installmentNumber ?? (payment.installment_plan ?? "—")}</strong></div>

                                    <div className="flex items-center space-x-3">
                                        <img src={getCardBrandFile(creditCardBrand)} alt={creditCardBrand ?? "Bandeira"} className="h-8 w-12 object-contain" />
                                        <div>
                                            <div className="text-sm">{creditCardBrand ?? "—"}</div>
                                            <div className="text-xs text-gray-500">{creditCardNumber ? maskCardNumber(creditCardNumber) : "—"}</div>
                                        </div>
                                    </div>

                                    {transactionReceiptUrl && (
                                        <div>
                                            <a href={transactionReceiptUrl} target="_blank" rel="noreferrer" className="underline text-blue-600">Abrir comprovante</a>
                                        </div>
                                    )}
                                </div>
                            )}

                            {payment.method?.toUpperCase?.() === "BOLETO" && (
                                <div className="mt-3 space-y-2">
                                    <div>
                                        <a href={boletoUrl ?? undefined} target="_blank" rel="noreferrer" className="underline text-blue-600">Abrir Boleto</a>
                                    </div>

                                    <div>Código de barras: <strong>{boletoBarcode ?? "—"}</strong></div>

                                    {bankSlipUrl && (
                                        <div>
                                            Link (bankSlip): <a href={bankSlipUrl} target="_blank" rel="noreferrer" className="underline text-blue-600">{bankSlipUrl}</a>
                                        </div>
                                    )}

                                    {gwRaw?.invoiceNumber ?? gwRaw?.raw?.invoiceNumber ? (
                                        <div className="text-xs text-gray-600">
                                            Invoice: {gwRaw?.invoiceNumber ?? gwRaw?.raw?.invoiceNumber} — Pago em: {formatDateBR(gwRaw?.raw?.paymentDate ?? gwRaw?.raw?.confirmedDate ?? gwRaw?.confirmedDate ?? null) || "—"}
                                        </div>
                                    ) : null}
                                </div>
                            )}

                            {payment.method?.toUpperCase?.() === "PIX" && (
                                <div className="mt-3 space-y-2">
                                    <div>Chave/Código PIX: <strong>{pixQrCode ?? "—"}</strong></div>
                                    <div>Expiração do PIX: <strong>{pixExpiration ? formatDateBR(pixExpiration) : "—"}</strong></div>

                                    {pixImage ? (
                                        <div className="mt-2">
                                            <img
                                                src={pixImage.startsWith("data:") ? pixImage : `data:image/png;base64,${pixImage}`}
                                                alt="QR Code PIX"
                                                className="h-40 w-40 object-contain border p-1 bg-white"
                                            />
                                        </div>
                                    ) : (
                                        <div className="text-xs text-gray-500">QR Code não disponível</div>
                                    )}
                                </div>
                            )}

                            <div className="mt-3 text-xs text-gray-700 space-y-1">
                                {gwRaw?.raw?.transactionReceiptUrl || gwRaw?.transactionReceiptUrl ? (
                                    <div>Receipt: <a href={gwRaw?.raw?.transactionReceiptUrl ?? gwRaw?.transactionReceiptUrl} target="_blank" rel="noreferrer" className="underline text-blue-600">Abrir recibo</a></div>
                                ) : null}

                                {webhook?.confirmedDate ? (
                                    <div>Confirmado em: <strong>{formatDateBR(webhook.confirmedDate)}</strong></div>
                                ) : gwRaw?.raw?.confirmedDate ? (
                                    <div>Confirmado em: <strong>{formatDateBR(gwRaw.raw.confirmedDate)}</strong></div>
                                ) : null}
                            </div>
                        </div>
                    )}
                </div>

                {/* Endereço */}
                <div className="border rounded p-4 space-y-2">
                    <h2 className="flex items-center text-lg font-semibold">Endereço de Retirada</h2>
                    <div className="text-sm space-y-1">
                        <div><span className="font-medium">Nome do Destinatário:</span> {pickupAddress?.recipient_name ?? "—"}</div>
                        <div><span className="font-medium">Logradouro:</span> {pickupAddress?.street ?? "—"}</div>
                        <div><span className="font-medium">Número:</span> {pickupAddress?.number ?? "—"}</div>
                        <div><span className="font-medium">Bairro:</span> {pickupAddress?.neighborhood ?? "—"}</div>
                        <div><span className="font-medium">CEP:</span> {pickupAddress?.cep ?? "—"}</div>
                        <div><span className="font-medium">Cidade:</span> {pickupAddress?.city ?? "—"}</div>
                        <div><span className="font-medium">Estado:</span> {pickupAddress?.state ?? "—"}</div>
                        <div><span className="font-medium">País:</span> {pickupAddress?.country ?? "—"}</div>
                        {pickupAddress?.complement && <div><span className="font-medium">Complemento:</span> {pickupAddress.complement}</div>}
                        {pickupAddress?.reference && <div><span className="font-medium">Referência:</span> {pickupAddress.reference}</div>}
                        {pickupAddress?.obs && <div><span className="font-medium">Obs:</span> {pickupAddress.obs}</div>}
                    </div>
                </div>
            </div>

            {/* Produtos */}
            <div className="border rounded overflow-hidden">
                <div className="p-4 border-b flex items-center">
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
                        {(items ?? []).map((it: OrderItemType) => (
                            <tr key={it.id} className="border-b">
                                <td className="py-2 flex items-center space-x-2">
                                    <img src={buildImageUrl(it.image ?? undefined) ?? ""} alt={it.name} className="h-10 w-10 object-cover rounded" />
                                    <div>
                                        <div>{it.name}</div>
                                        <div className="text-xs text-gray-500">{it.variant ?? "—"}</div>
                                    </div>
                                </td>
                                <td className="py-2">{it.quantity}</td>
                                <td className="py-2">{formatCurrency(it.unitPrice)}</td>
                                <td className="py-2">{formatCurrency(it.totalPrice)}</td>
                                <td className="py-2">
                                    <div className="text-xs">{mapApiStatusToUi(it.status ?? undefined)} {it.statusDate}</div>
                                    {typeof it.ipi === "number" && <div className="text-xs text-gray-500">Valor de IPI: {formatCurrency(it.ipi)}</div>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Resumo */}
                <div className="p-4 text-sm max-w-md ml-auto space-y-1">
                    <div className="flex justify-between"><span>Subtotal de Produtos:</span><span>{formatCurrency(subtotal)}</span></div>
                    {typeof discount === "number" && <div className="flex justify-between text-red-600"><span>Desconto Forma Pagamento:</span><span>{formatCurrency(discount)}</span></div>}
                    <div className="flex justify-between text-green-600"><span>Valor do Frete:</span><span>{shipping ?? "—"}</span></div>
                    {typeof totalIpi === "number" && <div className="flex justify-between"><span>Valor Total das Alíquotas:</span><span>{formatCurrency(totalIpi)}</span></div>}
                    <div className="flex justify-between font-semibold border-t pt-2"><span>TOTAL DO PEDIDO:</span><span>{formatCurrency(total ?? raw?.grandTotal)}</span></div>
                </div>
            </div>

            {/* Ações (escondidas na impressão) */}
            <div className="flex justify-between no-print">
                <button onClick={onBack} className="flex items-center bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
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

export default OrderDetails;