"use client"

import React from "react";
import type { Order, OrderItem } from "./types/orders";
import { buildImageUrl } from "./lib/orders";

type InlineOrderDetailsProps = {
  order: Order;
  onViewFull: () => void;
};

const formatCurrency = (v: number | undefined | null) =>
  Number(v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const InlineOrderDetails: React.FC<InlineOrderDetailsProps> = ({ order, onViewFull }) => {
  const {
    items = [],
    discount,
    shipping,
    totalIpi,
    total,
    paymentLabel,
    raw,
    promotionsApplied,
    promotionSummary,
  } = order as any;

  const subtotal = items.reduce((s: any, it: { totalPrice: any; }) => s + (it.totalPrice ?? 0), 0);

  // extrai shipping numeric original (raw.shippingCost) se disponível
  const originalShippingNumber = typeof raw?.shippingCost === "number" ? raw.shippingCost : null;

  // valor efetivo do frete após promoção = originalShippingNumber - (qualquer shippingDiscount do promotionSummary)
  const shippingDiscountFromPromotions = promotionSummary?.breakdown?.reduce?.((acc: number, p: any) => {
    return acc + (p.breakdown?.shippingDiscount ?? 0);
  }, 0) ?? 0;

  const effectiveShipping = (originalShippingNumber ?? 0) - (shippingDiscountFromPromotions ?? 0);

  // total de descontos (se veio do backend)
  const totalDiscount = promotionSummary?.discountTotal ?? discount ?? 0;

  return (
    <div className="border-t bg-white p-6">
      <div className="max-w-6xl mx-auto">
        <h4 className="text-lg font-semibold mb-3 flex items-center">
          <svg className="h-5 w-5 mr-2 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
          Produtos Adquiridos
        </h4>

        <div className="overflow-x-auto">
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
              {items.map((it: OrderItem) => (
                <tr key={it.id} className="border-b">
                  <td className="py-3 flex items-center space-x-3">
                    <img
                      src={buildImageUrl(it.image ?? undefined) ?? ""}
                      alt={it.name ?? "Produto"}
                      className="h-14 w-14 object-cover rounded"
                    />
                    <div>
                      <div className="font-medium">{it.name}</div>
                      <div className="text-xs text-gray-500">{it.variant ?? "—"}</div>
                    </div>
                  </td>
                  <td className="py-3">{it.quantity}</td>
                  <td className="py-3">{formatCurrency(it.unitPrice)}</td>
                  <td className="py-3">{formatCurrency(it.totalPrice)}</td>
                  <td className="py-3 text-xs">
                    <div>{it.status ?? "—"}</div>
                    <div className="text-gray-400">{it.statusDate ?? ""}</div>
                    {/* {typeof it.ipi === "number" && (
                      <div className="text-gray-500 mt-1">Valor de IPI: {formatCurrency(it.ipi)}</div>
                    )} */}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Resumo */}
        <div className="mt-6 max-w-md ml-auto space-y-2">
          <div className="flex justify-between">
            <span>Subtotal de Produtos:</span>
            <span className="font-medium">{formatCurrency(subtotal)}</span>
          </div>

          {/* Se houver promoções aplicadas, listá-las */}
          {Array.isArray(promotionsApplied) && promotionsApplied.length > 0 && (
            <div className="mt-2 border p-3 rounded bg-gray-50">
              <div className="text-sm font-semibold mb-2">Promoções aplicadas</div>
              {promotionsApplied.map((p: any) => (
                <div key={p.id} className="mb-2">
                  <div className="flex justify-between">
                    {/* AQUI: prioriza titlePromotion vindo de promotionUsages */}
                    <div className="text-sm font-medium">
                      {p?.rawUsage?.titlePromotion ?? p?.titlePromotion ?? p?.promotion?.titlePromotion ?? p?.name ?? "Promoção"}
                    </div>
                    <div className="text-sm font-medium">{formatCurrency(p.computed?.discountTotal ?? 0)}</div>
                  </div>

                  {/* breakdown por item */}
                  {Array.isArray(p.computed?.breakdown?.items) && p.computed.breakdown.items.length > 0 && (
                    <ul className="text-xs text-gray-600 mt-1 ml-2 list-disc list-inside">
                      {p.computed.breakdown.items.map((b: any, idx: number) => (
                        <li key={idx}>
                          {b.label} — <strong>{formatCurrency(b.amount)}</strong>
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* frete grátis / desconto frete */}
                  {p.computed?.breakdown?.shippingDiscount > 0 && (
                    <div className="text-xs text-gray-600 mt-1 ml-2">Desconto no frete: {formatCurrency(p.computed.breakdown.shippingDiscount)}</div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* valor de desconto total em destaque */}
          {totalDiscount > 0 && (
            <div className="flex justify-between text-red-600">
              <span>Desconto(s) aplicado(s):</span>
              <span className="font-medium">- {formatCurrency(totalDiscount)}</span>
            </div>
          )}

          {/* Frete - mostrar original e efetivo caso tenha redução */}
          {originalShippingNumber !== null ? (
            <div className="flex justify-between text-green-600">
              <span>Valor do Frete:</span>
              <div className="text-right">
                {shippingDiscountFromPromotions > 0 ? (
                  <>
                    <div className="text-xs line-through text-gray-400">{formatCurrency(originalShippingNumber)}</div>
                    <div className="font-medium">{formatCurrency(effectiveShipping)}</div>
                  </>
                ) : (
                  <div className="font-medium">{formatCurrency(originalShippingNumber)}</div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex justify-between text-green-600">
              <span>Valor do Frete:</span>
              <span className="font-medium">{shipping ?? "—"}</span>
            </div>
          )}

          {/* {typeof totalIpi === "number" && (
            <div className="flex justify-between">
              <span>Valor Total das Alíquotas:</span>
              <span className="font-medium">{formatCurrency(totalIpi)}</span>
            </div>
          )} */}

          <div className="flex justify-between font-semibold border-t pt-2">
            <span>TOTAL DO PEDIDO:</span>
            <span className="font-medium">{formatCurrency(raw?.grandTotal)}</span>
          </div>

          <div className="mt-4 text-sm border-t pt-3">
            <div>Forma de pagamento: <strong>{paymentLabel ?? raw?.payment?.method ?? "—"}</strong></div>
          </div>

          <div className="mt-4">
            <button
              onClick={onViewFull}
              className="w-full block text-center bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-50"
            >
              Visualizar pedido completo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InlineOrderDetails;