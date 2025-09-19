"use client";

import React from "react";

type Props = {
    open: boolean;
    url?: string | null;
    filename?: string | null;
    onClose: () => void;
};

export default function ImageModal({ open, url, filename, onClose }: Props) {
    if (!open || !url) return null;
    return (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
            <div className="relative max-w-[95%] max-h-[95%] bg-transparent" onClick={(e) => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-2 right-2 z-50 bg-white/90 rounded-full p-1 text-black" aria-label="Fechar">✕</button>

                <div className="flex flex-col items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={filename ?? "Preview"} className="max-h-[80vh] object-contain rounded shadow-lg" />

                    <div className="flex gap-2 items-center">
                        {filename && <div className="text-sm text-white/90 bg-black/40 px-3 py-1 rounded">{filename}</div>}
                        <a href={url} download={filename ?? ""} target="_blank" rel="noreferrer" className="px-3 py-1 bg-white text-black rounded">Baixar</a>
                    </div>
                </div>
            </div>
        </div>
    );
}