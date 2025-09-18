"use client";

import React from "react";
import type { OrderItem as OrderItemType } from "../types/orders";
import { buildImageUrl, mapApiStatusToUi } from "../lib/orders";
import { formatCurrency } from "./helpers";

type Props = { items?: OrderItemType[] };

const ProductsTable: React.FC<Props> = ({ items }) => (
    <div className="border rounded overflow-hidden">
        <div className="p-4 border-b flex items-center"><h3 className="font-semibold">Produtos Adquiridos</h3></div>
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
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

export default ProductsTable;