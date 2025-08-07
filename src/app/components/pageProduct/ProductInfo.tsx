import { Star } from "lucide-react";
import { ProductFormData, VariantFormData } from "Types/types";
import { useRouter } from "next/navigation";

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
  // Verifica se há promoção na variante selecionada
  const variantPromo = selectedVariant?.mainPromotion;

  const router = useRouter();

  return (
    <div className="space-y-6">
      {/* Título e avaliação */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
        <div className="flex items-center gap-2 mt-2">
          <div className="flex text-yellow-400">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-5 h-5 fill-current" />
            ))}
          </div>
          <span className="text-sm text-gray-600">(4.8) - 127 avaliações</span>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          SKU: {selectedVariant?.sku ?? product.skuMaster} | Marca: {product.brand}
        </p>
      </div>

      {/* Preço */}
      <div className="bg-white p-6 rounded-lg border">
        {hasDiscount ? (
          <div>
            <div className="flex items-center gap-3">
              <span className="text-xl text-gray-400 line-through">
                {formatPrice(selectedVariant!.price_of!)}
              </span>
              <span className="bg-red-500 text-white px-2 py-1 rounded-full text-sm font-bold">
                -{discount}%
              </span>
            </div>
            <div className="text-3xl font-bold text-green-600 mt-2">
              {formatPrice(selectedVariant!.price_per!)}
            </div>
          </div>
        ) : (
          <div className="text-3xl font-bold text-gray-900">
            {formatPrice(selectedVariant?.price_per ?? product.price_per)}
          </div>
        )}
        <p className="text-sm text-gray-600 mt-2">
          À vista no PIX ou em até 12x sem juros no cartão
        </p>

        {/* Promoção da Variante */}
        {variantPromo && (
          <div className="mt-4 p-3 border-l-4 border-blue-600 bg-blue-50 flex items-start gap-3">
            <div className="bg-blue-100 p-2 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-blue-600" viewBox="0 0 24 24">
                <path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z" />
              </svg>
            </div>
            <div className="text-sm">
              <div className="font-medium text-blue-800">{variantPromo.name}</div>
              <div>
                Válida de{" "}
                {new Date(variantPromo.startDate).toLocaleDateString("pt-BR")} até{" "}
                {new Date(variantPromo.endDate).toLocaleDateString("pt-BR")}
              </div>
              {variantPromo.hasCoupon ? (
                <div className="mt-1 text-blue-700">
                  Requer cupom – aplique no carrinho
                </div>
              ) : (
                <div className="mt-1 text-green-700">
                  Promoção automática (já será aplicada)
                </div>
              )}
              <button
                onClick={() => router.push("/cart")}
                className="mt-2 inline-block bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-sm"
              >
                Ir para o Carrinho
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}