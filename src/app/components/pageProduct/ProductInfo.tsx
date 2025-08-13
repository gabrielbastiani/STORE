"use client"

import React, { useMemo } from "react";
import { Star } from "lucide-react";
import { ProductFormData, VariantFormData } from "Types/types";
import PromotionSection from "./PromotionSection";

interface ProductInfoProps {
  product: ProductFormData;
  selectedVariant: VariantFormData | null;
  formatPrice: (v: number) => string;
  hasDiscount: boolean;
  discount: number;
}

export default function ProductInfo({
  product,
  selectedVariant,
  formatPrice,
  hasDiscount,
  discount
}: ProductInfoProps) {
  // Calcular economia (valor e porcentagem) com base nos preços disponíveis
  const savings = useMemo(() => {
    const orig = selectedVariant?.price_of ?? (product as any)?.price_of;
    const nowP = selectedVariant?.price_per ?? (product as any)?.price_per;
    if (typeof orig === "number" && typeof nowP === "number" && orig > nowP) {
      const value = orig - nowP;
      const pct = Math.round((value / orig) * 100);
      return { value, pct };
    }
    return null;
  }, [selectedVariant, product]);

  return (
    <div className="space-y-6">
      {/* Informações do produto */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{(product as any)?.name}</h1>
        <div className="flex items-center gap-2 mt-2">
          <div className="flex text-yellow-400" aria-hidden>
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-5 h-5 fill-current" />
            ))}
          </div>
          <span className="text-sm text-gray-600">(4.8) - 127 avaliações</span>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          SKU: {selectedVariant?.sku ?? (product as any)?.skuMaster} |
          Marca: {(product as any)?.brand ?? "—"}
        </p>
      </div>

      {/* Preço e ações */}
      <div className="bg-white p-6 rounded-lg border grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
        <div className="md:col-span-2">
          {/* Exibição de preço */}
          {hasDiscount ? (
            <div>
              <div className="flex items-center gap-3">
                <span className="text-xl text-gray-400 line-through">
                  {formatPrice((selectedVariant as any)!.price_of!)}
                </span>
                <span className="bg-red-500 text-white px-2 py-1 rounded-full text-sm font-bold">
                  -{discount}%
                </span>
              </div>
              <div className="text-3xl font-bold text-green-600 mt-2">
                {formatPrice((selectedVariant as any)!.price_per!)}
              </div>
            </div>
          ) : (
            <div className="text-3xl font-bold text-gray-900">
              {formatPrice(selectedVariant?.price_per ?? (product as any)?.price_per)}
            </div>
          )}

          {/* Economia */}
          {savings && (
            <div className="mt-2 text-sm text-green-700 font-medium">
              Você economiza {formatPrice(savings.value)} ({savings.pct}%)
            </div>
          )}

          <p className="text-sm text-gray-600 mt-2">
            À vista no PIX ou em até 12x sem juros no cartão
          </p>
        </div> 
      </div>

      {product?.mainPromotion && <PromotionSection promo={product.mainPromotion} />}

    </div>
  );
}