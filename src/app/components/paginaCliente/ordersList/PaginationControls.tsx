"use client";

import React, { useMemo } from "react";

type Props = {
    page: number;
    totalPages: number;
    total: number;
    perPage: number;
    setPage: (p: number) => void;
    setPerPage: (per: number) => void;
};

const getPageNumbers = (current: number, totalPg: number, maxButtons = 7): (number | string)[] => {
    const pages: (number | string)[] = [];
    if (totalPg <= maxButtons) {
        for (let i = 1; i <= totalPg; i++) pages.push(i);
        return pages;
    }

    const half = Math.floor(maxButtons / 2);
    let start = Math.max(1, current - half);
    let end = Math.min(totalPg, start + maxButtons - 1);

    if (end - start + 1 < maxButtons) {
        start = Math.max(1, end - maxButtons + 1);
    }

    if (start > 1) {
        pages.push(1);
        if (start > 2) pages.push("...");
    }

    for (let i = start; i <= end; i++) pages.push(i);

    if (end < totalPg) {
        if (end < totalPg - 1) pages.push("...");
        pages.push(totalPg);
    }

    return pages;
};

const PaginationControls: React.FC<Props> = ({ page, totalPages, total, perPage, setPage, setPerPage }) => {
    const pageNumbers = useMemo(() => getPageNumbers(page, totalPages, 7), [page, totalPages]);

    const onPrev = () => { if (page > 1) setPage(page - 1); };
    const onNext = () => { if (page < totalPages) setPage(page + 1); };

    return (
        <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-3">
                <button onClick={() => setPage(1)} disabled={page <= 1} className={`px-2 py-1 rounded border ${page <= 1 ? "opacity-50 cursor-not-allowed" : ""}`}>« Primeiro</button>
                <button onClick={onPrev} disabled={page <= 1} className={`px-2 py-1 rounded border ${page <= 1 ? "opacity-50 cursor-not-allowed" : ""}`}>‹</button>

                <div className="flex items-center gap-1">
                    {pageNumbers.map((p, idx) =>
                        typeof p === "string" ? (
                            <span key={`dots-${idx}`} className="px-3 py-1 text-sm text-gray-500">…</span>
                        ) : (
                            <button
                                key={p}
                                onClick={() => setPage(p as number)}
                                className={`px-3 py-1 rounded ${p === page ? "bg-orange-600 text-white" : "border"}`}
                            >
                                {p}
                            </button>
                        )
                    )}
                </div>

                <button onClick={onNext} disabled={page >= totalPages} className={`px-2 py-1 rounded border ${page >= totalPages ? "opacity-50 cursor-not-allowed" : ""}`}>›</button>
                <button onClick={() => setPage(totalPages)} disabled={page >= totalPages} className={`px-2 py-1 rounded border ${page >= totalPages ? "opacity-50 cursor-not-allowed" : ""}`}>Último »</button>
            </div>

            <div className="flex items-center gap-3">
                <div className="text-sm text-gray-600">Itens por página:</div>
                <select value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }} className="border rounded px-2 py-1">
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                </select>

                <div className="text-sm text-gray-600 ml-4">Total: <strong>{total}</strong></div>
            </div>
        </div>
    );
};

export default PaginationControls;