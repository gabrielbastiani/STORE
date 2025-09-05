"use client"

import React from "react";

type Props = {
    quantity: number;
    setQuantity: (q: number) => void;
};

export default function QuantityControl({ quantity, setQuantity }: Props) {
    return (
        <div className="flex items-center rounded-lg border border-gray-200 overflow-hidden">
            <button className="px-3 py-2 text-lg" onClick={() => setQuantity(Math.max(1, quantity - 1))} aria-label="Diminuir quantidade">
                -
            </button>
            <div className="px-4 py-2 text-sm w-14 text-center">{quantity}</div>
            <button className="px-3 py-2 text-lg" onClick={() => setQuantity(quantity + 1)} aria-label="Aumentar quantidade">
                +
            </button>
        </div>
    );
}