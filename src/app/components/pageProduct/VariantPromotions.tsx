"use client";

import React, { useState } from "react";
import { Ticket, Info } from "lucide-react";
import PromotionRulesModal from "./PromotionRulesModal";

interface VariantPromotionsProps {
  promotions: any[];
  variantName: string;
}

export default function VariantPromotions({ promotions, variantName }: VariantPromotionsProps) {
  
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPromotion, setSelectedPromotion] = useState<any | null>(null);

  const handleShowRules = (promo: any) => {
    setSelectedPromotion(promo);
    setModalOpen(true);
  };

  return (
    <div className="mt-4 border-t pt-4">
      <h3 className="text-lg font-bold mb-3">Promoções da Variante: <span className="text-blue-600">{variantName}</span></h3>

      <div className="space-y-3">
        {promotions.map((promo, index) => (
          <div key={index} className="bg-amber-50 border border-amber-200 rounded p-3">
            <div className="flex items-start">
              <div className="flex-shrink-0 mt-1">
                <Ticket className="w-5 h-5 text-amber-600" />
              </div>
              <div className="ml-3 flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-amber-800">{promo.name}</h4>
                  <button
                    onClick={() => handleShowRules(promo)}
                    className="text-xs text-amber-700 underline"
                  >
                    Ver regras
                  </button>
                </div>
                <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                  {promo.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedPromotion && (
        <PromotionRulesModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          promo={selectedPromotion}
          variantName={variantName}
        />
      )}
    </div>
  );
}