"use client";

import React from "react";
import { X } from "lucide-react";
import type { FilterState } from "./types/orders"; // we'll provide this type file below

type Props = {
    filters: FilterState;
    setFilters: (s: FilterState) => void;
    applyFiltersNow: () => void;
    onClearFilters: () => void;
    applyDisabled: boolean;
    total: number;
};

const FiltersBar: React.FC<Props> = ({ filters, setFilters, applyFiltersNow, onClearFilters, applyDisabled, total }) => {
    return (
        <div className="bg-white border rounded p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                    <label className="text-xs font-medium">Busca (produto / sku / pedido)</label>
                    <input
                        type="text"
                        placeholder="Nome do produto, SKU ou número do pedido"
                        value={filters.q}
                        onChange={(e) => setFilters({ ...filters, q: e.target.value })}
                        onKeyDown={(e) => { if (e.key === "Enter") applyFiltersNow(); }}
                        className="w-full border rounded px-2 py-1"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-medium">SKU do produto</label>
                    <input
                        type="text"
                        placeholder="Ex: 1922.5002"
                        value={filters.sku}
                        onChange={(e) => setFilters({ ...filters, sku: e.target.value })}
                        onKeyDown={(e) => { if (e.key === "Enter") applyFiltersNow(); }}
                        className="w-full border rounded px-2 py-1"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-medium">Número do Pedido</label>
                    <input
                        type="text"
                        placeholder="2025-000050"
                        value={filters.orderNumber}
                        onChange={(e) => setFilters({ ...filters, orderNumber: e.target.value })}
                        onKeyDown={(e) => { if (e.key === "Enter") applyFiltersNow(); }}
                        className="w-full border rounded px-2 py-1"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                <div>
                    <label className="text-xs font-medium">Forma de Pagamento</label>
                    <select
                        value={filters.paymentMethod}
                        onChange={(e) => setFilters({ ...filters, paymentMethod: e.target.value })}
                        className="w-full border rounded px-2 py-1"
                    >
                        <option value="">— qualquer —</option>
                        <option value="CREDIT_CARD">CARTÃO DE CRÉDITO</option>
                        <option value="BOLETO">BOLETO</option>
                        <option value="PIX">PIX</option>
                        <option value="BANK_TRANSFER">BANK_TRANSFER</option>
                    </select>
                </div>

                <div>
                    <label className="text-xs font-medium">Status do Pedido</label>
                    <select
                        value={filters.status}
                        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                        className="w-full border rounded px-2 py-1"
                    >
                        <option value="">— qualquer —</option>
                        <option value="PENDING">PENDING</option>
                        <option value="CONFIRMED">CONFIRMED</option>
                        <option value="PAGO">PAGO</option>
                        <option value="CANCELLED">CANCELLED</option>
                        <option value="ENTREGUE">ENTREGUE</option>
                        <option value="ESTORNADO">ESTORNADO</option>
                    </select>
                </div>

                <div>
                    <label className="text-xs font-medium">Data (de)</label>
                    <input
                        type="date"
                        value={filters.dateFrom}
                        onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                        className="w-full border rounded px-2 py-1"
                    />
                </div>

                <div>
                    <label className="text-xs font-medium">Data (até)</label>
                    <input
                        type="date"
                        value={filters.dateTo}
                        onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                        className="w-full border rounded px-2 py-1"
                    />
                </div>
            </div>

            <div className="flex items-center gap-3 mt-4">
                <button
                    onClick={applyFiltersNow}
                    className={`px-3 py-1 rounded ${applyDisabled ? "bg-gray-300 text-gray-700 cursor-not-allowed" : "bg-orange-600 text-white"}`}
                    disabled={applyDisabled}
                >
                    Aplicar filtros
                </button>
                <button onClick={onClearFilters} className="px-3 py-1 border rounded">Limpar</button>
                <div className="text-sm text-gray-600 ml-auto">Resultados: <strong>{total}</strong></div>
            </div>
        </div>
    );
};

export default FiltersBar;