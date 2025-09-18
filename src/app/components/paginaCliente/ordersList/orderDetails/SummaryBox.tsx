"use client";

import React from "react";
import { formatCurrency } from "./helpers";

type Props = {
    subtotal: number;
    discount?: number | null;
    shipping?: any;
    totalIpi?: number | null;
    total?: number | null;
    raw?: any;
};

const SummaryBox: React.FC<Props> = ({ subtotal, discount, shipping, totalIpi, total, raw }) => (
    <div className="p-4 text-sm max-w-md ml-auto space-y-1">
        <div className="flex justify-between"><span>Subtotal de Produtos:</span><span>{formatCurrency(subtotal)}</span></div>
        {typeof discount === "number" && <div className="flex justify-between text-red-600"><span>Desconto Forma Pagamento:</span><span>{formatCurrency(discount)}</span></div>}
        <div className="flex justify-between text-green-600"><span>Valor do Frete:</span><span>{shipping ?? "—"}</span></div>
        {typeof totalIpi === "number" && <div className="flex justify-between"><span>Valor Total das Alíquotas:</span><span>{formatCurrency(totalIpi)}</span></div>}
        <div className="flex justify-between font-semibold border-t pt-2"><span>TOTAL DO PEDIDO:</span><span>{formatCurrency(raw?.grandTotal)}</span></div>
    </div>
);

export default SummaryBox;