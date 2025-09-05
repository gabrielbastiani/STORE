"use client"

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";

type Props = {
    productId: string;
    thumbs: string[];
    onThumbClick: (productId: string, url: string) => void;
};

export default function ThumbsCarousel({ productId, thumbs, onThumbClick }: Props) {
    const elRef = useRef<HTMLDivElement | null>(null);
    const [hasOverflow, setHasOverflow] = useState(false);

    useEffect(() => {
        const el = elRef.current;
        if (!el) return;
        const update = () => setHasOverflow(el.scrollWidth > el.clientWidth + 2);
        update();

        const ro = new ResizeObserver(update);
        ro.observe(el);
        return () => ro.disconnect();
    }, [thumbs]);

    const scroll = (dir: "left" | "right") => {
        const el = elRef.current;
        if (!el) return;
        const amount = Math.max(120, Math.floor(el.clientWidth * 0.7));
        el.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
    };

    return (
        <div className="mt-3 relative">
            {hasOverflow ? (
                <button
                    onClick={() => scroll("left")}
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 p-1 rounded-full shadow-sm hidden sm:flex"
                    aria-label="Anterior"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M12.293 15.293a1 1 0 010-1.414L15.586 10l-3.293-3.879a1 1 0 111.414-1.414l4 4.707a1 1 0 010 1.414l-4 4.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        <path fillRule="evenodd" d="M4 10a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1z" clipRule="evenodd" />
                    </svg>
                </button>
            ) : null}

            <div ref={elRef} className="flex gap-2 overflow-x-auto no-scrollbar py-1" role="list" aria-label="Miniaturas">
                {thumbs.length === 0 ? (
                    <div className="w-14 h-14 rounded border bg-white flex items-center justify-center text-gray-400">—</div>
                ) : (
                    thumbs.map((t) => (
                        <button key={t} onClick={() => onThumbClick(productId, t)} className="w-14 h-14 flex-shrink-0 rounded border overflow-hidden bg-white" aria-label="Ver imagem">
                            <Image src={t} alt="thumb" width={64} height={64} style={{ objectFit: "contain", width: "100%", height: "100%" }} unoptimized />
                        </button>
                    ))
                )}
            </div>

            {hasOverflow ? (
                <button
                    onClick={() => scroll("right")}
                    className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 p-1 rounded-full shadow-sm hidden sm:flex"
                    aria-label="Próximo"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M7.707 4.707a1 1 0 010 1.414L4.414 10l3.293 3.879a1 1 0 11-1.414 1.414l-4-4.707a1 1 0 010-1.414l4-4.707a1 1 0 011.414 0z" clipRule="evenodd" />
                        <path fillRule="evenodd" d="M16 10a1 1 0 00-1-1H5a1 1 0 100 2h10a1 1 0 001-1z" clipRule="evenodd" />
                    </svg>
                </button>
            ) : null}
        </div>
    );
}