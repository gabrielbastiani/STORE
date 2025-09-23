import React from "react";

type Props = {
    page: number;
    totalPages: number;
    gotoPage: (p: number) => void;
    getVisiblePageRange: () => number[];
};

export default function Pagination({ page, totalPages, gotoPage, getVisiblePageRange }: Props) {
    return (
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-2">
            <div className="flex items-center gap-2">
                <button onClick={() => gotoPage(1)} disabled={page === 1} aria-disabled={page === 1} className={`px-3 py-1 rounded-md border text-gray-500 ${page === 1 ? 'opacity-60 cursor-not-allowed' : ''}`}>Primeira</button>
                <button onClick={() => gotoPage(page - 1)} disabled={page === 1} aria-disabled={page === 1} className={`px-3 py-1 rounded-md border text-gray-500 ${page === 1 ? 'opacity-60 cursor-not-allowed' : ''}`}>Anterior</button>
            </div>

            <div className="hidden sm:flex items-center gap-1">
                {getVisiblePageRange().map(p => (
                    <button key={p} onClick={() => gotoPage(p)} className={`px-3 py-1 rounded-md border text-gray-500 ${p === page ? 'bg-black text-white' : 'bg-white'}`}>{p}</button>
                ))}
            </div>

            <div className="sm:hidden">
                <label htmlFor="mobile-page-select" className="sr-only">Página</label>
                <select
                    id="mobile-page-select"
                    value={page}
                    onChange={(e) => gotoPage(Number(e.target.value))}
                    className="rounded-md border p-2 text-sm"
                    aria-label="Ir para página"
                >
                    {Array.from({ length: totalPages }).map((_, i) => {
                        const p = i + 1;
                        return <option key={p} value={p}>Página {p}</option>;
                    })}
                </select>
            </div>

            <div className="flex items-center gap-2">
                <button onClick={() => gotoPage(page + 1)} disabled={page === totalPages} aria-disabled={page === totalPages} className={`px-3 py-1 rounded-md border text-gray-500 ${page === totalPages ? 'opacity-60 cursor-not-allowed' : ''}`}>Próxima</button>
                <button onClick={() => gotoPage(totalPages)} disabled={page === totalPages} aria-disabled={page === totalPages} className={`px-3 py-1 rounded-md border text-gray-500 ${page === totalPages ? 'opacity-60 cursor-not-allowed' : ''}`}>Última</button>
            </div>
        </div>
    );
}