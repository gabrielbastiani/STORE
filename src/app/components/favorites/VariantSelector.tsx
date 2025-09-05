"use client"

import React from "react";
import { formatCurrency } from "./utils";

type Props = {
    availableVariants: any[];
    selectedVariantId: string | null;
    onSelect: (variantId: string) => void;
};

export default function VariantSelector({ availableVariants, selectedVariantId, onSelect }: Props) {
    if (!availableVariants || availableVariants.length <= 1) return null;
    return (
        <div>
            <label className="text-sm text-black">Variantes: </label>
            <select value={selectedVariantId ?? ""} onChange={(e) => onSelect(e.target.value)} className="p-2 mt-1 w-full sm:w-auto rounded border-gray-200 text-sm text-black">
                {availableVariants.map((v: any) => (
                    <option className="text-black" key={v.id} value={v.id}>
                        {v.sku} — {v.price_per ? formatCurrency(v.price_per) : formatCurrency(v.price_of)} — estoque: {v.stock}
                    </option>
                ))}
            </select>
        </div>
    );
}