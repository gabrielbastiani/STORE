"use client";

import React from "react";
import { X } from "lucide-react";
import type { FilterState } from "./types/orders";
import { paymentMethodLabel } from "./lib/orders";

type Props = {
    activeFilters: FilterState;
    removeActiveFilter: (key: string) => void;
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

const ActiveBadges: React.FC<Props> = ({ activeFilters, removeActiveFilter }) => {
    const badges: { key: string; label: string }[] = [];
    if (activeFilters.q) badges.push({ key: "q", label: `Busca: "${activeFilters.q}"` });
    if (activeFilters.sku) badges.push({ key: "sku", label: `SKU: ${activeFilters.sku}` });
    if (activeFilters.orderNumber) badges.push({ key: "orderNumber", label: `Pedido: ${activeFilters.orderNumber}` });
    if (activeFilters.paymentMethod) badges.push({ key: "paymentMethod", label: paymentMethodLabel(activeFilters.paymentMethod) || activeFilters.paymentMethod });
    if (activeFilters.status) badges.push({ key: "status", label: STATUS_LABELS[activeFilters.status] ?? activeFilters.status });
    if (activeFilters.dateFrom && activeFilters.dateTo) {
        badges.push({ key: "dateRange", label: `Data: ${activeFilters.dateFrom} → ${activeFilters.dateTo}` });
    } else {
        if (activeFilters.dateFrom) badges.push({ key: "dateFrom", label: `Data ≥ ${activeFilters.dateFrom}` });
        if (activeFilters.dateTo) badges.push({ key: "dateTo", label: `Data ≤ ${activeFilters.dateTo}` });
    }

    if (badges.length === 0) return null;

    return (
        <div className="mt-3 flex flex-wrap gap-2 items-center">
            <div className="text-xs text-gray-600 mr-2">Filtros ativos:</div>
            {badges.map((b) => (
                <div key={b.key} className="flex items-center gap-2 bg-gray-100 border rounded-full px-3 py-1 text-sm">
                    <span>{b.label}</span>
                    <button
                        onClick={() => removeActiveFilter(b.key)}
                        title="Remover filtro"
                        className="rounded-full p-1 hover:bg-gray-200"
                    >
                        <X size={12} />
                    </button>
                </div>
            ))}
            <button onClick={() => removeActiveFilter("clearAll")} className="ml-2 px-2 py-1 text-sm border rounded bg-white">
                Limpar todos
            </button>
        </div>
    );
};

export default ActiveBadges;