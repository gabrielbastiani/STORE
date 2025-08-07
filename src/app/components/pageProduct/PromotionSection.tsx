import { useRouter } from "next/navigation";
import { Promotion } from "Types/types";

interface PromotionSectionProps {
  promo: Promotion;
}

export default function PromotionSection({ promo }: PromotionSectionProps) {
  const router = useRouter();

  return (
    <div className="bg-white p-4 rounded-lg border mb-6">
      <div className="flex items-start gap-4">
        <div className="bg-blue-100 p-3 rounded-full">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-blue-600" viewBox="0 0 24 24">
            <path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z" />
          </svg>
        </div>

        <div className="flex-1">
          <h2 className="text-xl font-semibold text-black mb-2">
            Promoção: {promo.name}
          </h2>
          <p className="text-sm text-gray-700 mb-2">{promo.description}</p>

          <div className="flex flex-wrap gap-3 mb-3">
            <div className="bg-blue-50 px-3 py-1 rounded-full text-xs text-blue-700">
              <span className="font-medium">Início:</span>{" "}
              {new Date(promo.startDate).toLocaleDateString("pt-BR")}
            </div>

            <div className="bg-blue-50 px-3 py-1 rounded-full text-xs text-blue-700">
              <span className="font-medium">Término:</span>{" "}
              {new Date(promo.endDate).toLocaleDateString("pt-BR")}
            </div>

            <div className={`px-3 py-1 rounded-full text-xs ${promo.hasCoupon
                ? "bg-orange-100 text-orange-700"
                : "bg-green-100 text-green-700"
              }`}>
              {promo.hasCoupon ? "Requer cupom" : "Promoção automática"}
            </div>

            <div className={`px-3 py-1 rounded-full text-xs ${promo.cumulative
                ? "bg-purple-100 text-purple-700"
                : "bg-yellow-100 text-yellow-700"
              }`}>
              {promo.cumulative ? "Cumulativa" : "Não cumulativa"}
            </div>
          </div>

          <button
            onClick={() => router.push("/cart")}
            className="mt-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm"
          >
            Ir para o Carrinho
          </button>
        </div>
      </div>
    </div>
  );
}