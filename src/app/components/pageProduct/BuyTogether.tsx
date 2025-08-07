import Image from "next/image";
import { Minus, Plus, ShoppingCart } from "lucide-react";
import { ProductFormData } from "Types/types";

interface BuyTogetherProps {
  buyTogether: {
    id: string;
    name: string;
    product: ProductFormData[];
  };
  onAddItem: (productId: string, quantity: number) => void;
  togetherQty: Record<string, number>;
  changeTogetherQty: (id: string, delta: number) => void;
  addAllTogether: () => void;
  adding: boolean;
  API_URL: string | undefined;
}

export default function BuyTogether({
  buyTogether,
  togetherQty,
  changeTogetherQty,
  addAllTogether,
  onAddItem,
  adding,
  API_URL
}: BuyTogetherProps) {
  return (
    <div className="bg-white p-4 rounded-lg border mb-6">
      <h2 className="text-xl font-semibold mb-4 text-black">
        Compre Junto: {buyTogether.name}
      </h2>

      <div className="flex overflow-x-auto space-x-4 pb-2">
        {buyTogether.product.map(p => (
          <div
            key={p.id}
            className="flex-shrink-0 w-64 bg-gray-50 rounded-lg border p-4 flex flex-col justify-between"
          >
            {/* Imagem do produto */}
            <div className="flex justify-center mb-3">
              {p.images && p.images.length > 0 ? (
                <Image
                  src={`${API_URL}/files/${p.images[0].url}`}
                  alt={p.images[0].altText || p.name}
                  width={120}
                  height={120}
                  className="object-contain"
                />
              ) : (
                <div className="bg-gray-200 border-2 border-dashed rounded-xl w-16 h-16" />
              )}
            </div>

            {/* Nome e preço */}
            <div className="mb-3">
              <div className="font-medium text-gray-700 truncate">{p.name}</div>
              <div className="text-lg font-semibold text-gray-900">
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL"
                }).format(p.price_per)}
              </div>
            </div>

            {/* Controle de quantidade e botão de adicionar */}
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => changeTogetherQty(p.id!, -1)}
                  className="p-2 border border-gray-300 rounded disabled:opacity-50 hover:bg-gray-100"
                  disabled={togetherQty[p.id!] <= 1}
                >
                  <Minus className="w-4 h-4 text-gray-700" />
                </button>
                <span className="w-8 text-center text-black">
                  {togetherQty[p.id!] ?? 1}
                </span>
                <button
                  onClick={() => changeTogetherQty(p.id!, +1)}
                  className="p-2 border border-gray-300 rounded disabled:opacity-50 hover:bg-gray-100"
                  disabled={togetherQty[p.id!] >= (p.stock ?? 0)}
                >
                  <Plus className="w-4 h-4 text-gray-700" />
                </button>
              </div>
              <button
                onClick={() => onAddItem(p.id!, togetherQty[p.id!])}
                disabled={adding || (p.stock ?? 0) === 0}
                className="w-full bg-orange-600 text-white py-2 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <ShoppingCart className="w-5 h-5" />
                Adicionar
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Botão para adicionar todos */}
      <div className="mt-4 text-center">
        <button
          onClick={addAllTogether}
          disabled={adding}
          className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50"
        >
          Adicionar Todos ao Carrinho
        </button>
      </div>
    </div>
  );
}