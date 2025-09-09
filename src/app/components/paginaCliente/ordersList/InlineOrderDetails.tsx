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
    pickupAddress,
    paymentLabel,
    raw,
  } = order;

  const subtotal = items.reduce((s, it) => s + (it.totalPrice ?? 0), 0);

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
                    {typeof it.ipi === "number" && (
                      <div className="text-gray-500 mt-1">Valor de IPI: {formatCurrency(it.ipi)}</div>
                    )}
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

          {typeof discount === "number" && (
            <div className="flex justify-between text-red-600">
              <span>Desconto Forma Pagamento:</span>
              <span className="font-medium">{formatCurrency(discount)}</span>
            </div>
          )}

          <div className="flex justify-between text-green-600">
            <span>Valor do Frete:</span>
            <span className="font-medium">{shipping ?? "—"}</span>
          </div>

          {typeof totalIpi === "number" && (
            <div className="flex justify-between">
              <span>Valor Total das Alíquotas:</span>
              <span className="font-medium">{formatCurrency(totalIpi)}</span>
            </div>
          )}

          <div className="flex justify-between font-semibold border-t pt-2">
            <span>TOTAL DO PEDIDO:</span>
            <span className="font-medium">{formatCurrency(total ?? raw?.grandTotal)}</span>
          </div>

          {/* Forma de pagamento */}
          <div className="mt-4 text-sm border-t pt-3">
            <div>Forma de pagamento: <strong>{paymentLabel ?? raw?.payment?.method ?? "—"}</strong></div>
            <div>Pagamento à vista</div>
          </div>

          {/* Botão "Visualizar pedido completo" — abaixo do resumo, conforme solicitado */}
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