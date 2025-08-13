"use client";

import React, { useState } from "react";
import { Ticket, Info } from "lucide-react";
import PromotionRulesModal from "./PromotionRulesModal";

interface ProductPromotionProps {
    promo: any;
    type: "principal" | "variante";
}

export default function ProductPromotion({ promo, type }: ProductPromotionProps) {
    const [modalOpen, setModalOpen] = useState(false);
    const [timeLeft, setTimeLeft] = useState<string | null>(null);

    // Cores diferentes para cada tipo de promoção
    const colorClasses = {
        principal: "bg-gradient-to-r from-amber-100 to-amber-50 border-amber-300 text-amber-800",
        variante: "bg-gradient-to-r from-blue-100 to-blue-50 border-blue-300 text-blue-800"
    };

    const iconColors = {
        principal: "text-amber-600",
        variante: "text-blue-600"
    };

    const badgeText = {
        principal: "PROMOÇÃO PRINCIPAL",
        variante: "PROMOÇÃO DA VARIANTE"
    };

    // Cálculo do tempo restante (mesmo método anterior)
    // ... 

    return (
        <div className={`mb-6 rounded-xl border ${colorClasses[type]} overflow-hidden shadow-sm`}>
            <div className="p-4 flex items-start">
                <div className={`flex-shrink-0 mt-1 ${iconColors[type]}`}>
                    <Ticket className="w-6 h-6" />
                </div>

                <div className="ml-3 flex-1">
                    <div className="flex items-center justify-between">
                        <div>
                            <span className="inline-block px-2 py-1 text-xs font-bold bg-white rounded-md mb-2">
                                {badgeText[type]}
                            </span>
                            <h3 className="text-lg font-bold">{promo.name}</h3>
                        </div>

                        <button
                            onClick={() => setModalOpen(true)}
                            className="text-sm font-medium hover:underline"
                        >
                            Regras
                        </button>
                    </div>

                    <p className="mt-2 text-sm">{promo.description}</p>

                    <div className="mt-3 flex items-center">
                        <span className="text-xs bg-white px-2 py-1 rounded-md">
                            {timeLeft ? `⏱️ Termina em: ${timeLeft}` : "Promoção contínua"}
                        </span>
                    </div>
                </div>
            </div>

            <PromotionRulesModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                promo={promo}
                promotionType={type}
            />
        </div>
    );
}