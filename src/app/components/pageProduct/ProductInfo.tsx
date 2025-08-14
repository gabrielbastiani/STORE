"use client";

import React, { useMemo, useState, useEffect } from "react";
import { Star } from "lucide-react";
import { ProductFormData, VariantFormData } from "Types/types";
import PromotionSection from "./PromotionSection";
import { setupAPIClient } from "@/services/api";

interface ProductInfoProps {
  product: ProductFormData;
  selectedVariant: VariantFormData | null;
  formatPrice: (v: number) => string;
  hasDiscount: boolean;
  discount: number;
}

interface ReviewStats {
  averageRating: number;
  totalReviews: number;
}

export default function ProductInfo({
  product,
  selectedVariant,
  formatPrice,
  hasDiscount,
  discount
}: ProductInfoProps) {
  const [reviewStats, setReviewStats] = useState<ReviewStats | null>(null);
  const [loadingReviews, setLoadingReviews] = useState(true);

  // Calcular economia
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

  // Buscar estatísticas de avaliações
  useEffect(() => {
    const api = setupAPIClient();
    const fetchReviewStats = async () => {
      try {
        const response = await api.get(`/review?product_id=${product.id}`);
        setReviewStats(response.data);
      } catch (error) {
        console.error("Failed to fetch review stats:", error);
      } finally {
        setLoadingReviews(false);
      }
    };

    if (product?.id) {
      fetchReviewStats();
    }
  }, [product?.id]);

  // Calcular estrelas para exibição
  const renderStars = () => {
    if (!reviewStats || reviewStats.averageRating === 0) {
      return null;
    }

    const fullStars = Math.floor(reviewStats.averageRating);
    const hasHalfStar = reviewStats.averageRating % 1 >= 0.5;

    return (
      <div className="flex text-yellow-400" aria-hidden>
        {[...Array(5)].map((_, i) => {
          if (i < fullStars) {
            return <Star key={i} className="w-5 h-5 fill-current" />;
          } else if (i === fullStars && hasHalfStar) {
            return (
              <div key={i} className="relative">
                <Star className="w-5 h-5 text-gray-300" />
                <div className="absolute top-0 left-0 overflow-hidden" style={{ width: '50%' }}>
                  <Star className="w-5 h-5 fill-current" />
                </div>
              </div>
            );
          } else {
            return <Star key={i} className="w-5 h-5 text-gray-300" />;
          }
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Informações do produto */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{(product as any)?.name}</h1>
        <div className="flex items-center gap-2 mt-2">
          {loadingReviews ? (
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 text-gray-300" />
              ))}
              <span className="text-sm text-gray-600 ml-2">Carregando...</span>
            </div>
          ) : reviewStats && reviewStats.totalReviews > 0 ? (
            <>
              {renderStars()}
              <span className="text-sm text-gray-600">
                ({reviewStats.averageRating.toFixed(1)}) - {reviewStats.totalReviews} avaliações
              </span>
            </>
          ) : (
            <span className="text-sm text-gray-600">Sem avaliações ainda</span>
          )}
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