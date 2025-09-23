import React from "react";

type Props = {
    searchTerm: string;
    setSearchTerm: (s: string) => void;
    pageSize: number;
    setPageSize: (n: number) => void;
    dateFrom: string | null;
    dateTo: string | null;
    setDateFrom: (s: string | null) => void;
    setDateTo: (s: string | null) => void;
    onClear: () => void;
    onRefresh: () => void;
};

export default function SearchFilters({ searchTerm, setSearchTerm, pageSize, setPageSize, dateFrom, dateTo, setDateFrom, setDateTo, onClear, onRefresh }: Props) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4 text-black">
            <div className="flex-1 flex gap-2 w-full">
                <input
                    type="search"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Buscar em perguntas e respostas..."
                    className="w-full rounded-lg border p-2 text-sm placeholder-black/40 focus:outline-none focus:ring-2 focus:ring-orange-400 border-black/10"
                />

                <select
                    value={pageSize}
                    onChange={e => setPageSize(Number(e.target.value))}
                    className="w-28 sm:w-auto rounded-lg border p-2 text-sm bg-white border-black/10"
                >
                    {[5, 10, 20, 50].map(n => <option key={n} value={n}>{n} / página</option>)}
                </select>
            </div>

            <div className="flex gap-2 items-center mt-1 sm:mt-0">
                <label className="text-xs text-black/70">De</label>
                <input type="date" value={dateFrom ?? ''} onChange={e => setDateFrom(e.target.value || null)} className="rounded-lg border p-2 text-sm border-black/10" />
                <label className="text-xs text-black/70">Até</label>
                <input type="date" value={dateTo ?? ''} onChange={e => setDateTo(e.target.value || null)} className="rounded-lg border p-2 text-sm border-black/10" />
            </div>

            <div className="flex items-center gap-2 ml-auto">
                <button onClick={onClear} className="text-sm px-3 py-1 rounded-lg border border-black/10 text-black">Limpar filtros</button>
                <button onClick={onRefresh} className="text-sm px-3 py-1 rounded-lg border border-orange-500 bg-orange-500 text-white">Atualizar</button>
            </div>
        </div>
    );
}