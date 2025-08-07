import { Minus, Plus } from "lucide-react";

interface QuantitySelectorProps {
  quantity: number;
  handleQuantityChange: (delta: number) => void;
  stockAvailable: number;
}

export default function QuantitySelector({
  quantity,
  handleQuantityChange,
  stockAvailable
}: QuantitySelectorProps) {
  return (
    <div className="flex items-center gap-4">
      <label className="text-sm font-medium text-gray-700">Quantidade:</label>

      <div className="flex items-center border border-gray-300 rounded-lg text-black">
        <button
          onClick={() => handleQuantityChange(-1)}
          disabled={quantity <= 1}
          className={`p-2 hover:bg-gray-100 ${quantity <= 1 ? "text-gray-300 cursor-not-allowed" : "hover:text-red-600"
            }`}
          aria-label="Diminuir quantidade"
        >
          <Minus className="w-4 h-4" />
        </button>

        <span className="px-4 py-2 border-x border-gray-300 min-w-[60px] text-center font-medium">
          {quantity}
        </span>

        <button
          onClick={() => handleQuantityChange(1)}
          disabled={quantity >= stockAvailable}
          className={`p-2 hover:bg-gray-100 ${quantity >= stockAvailable ? "text-gray-300 cursor-not-allowed" : "hover:text-green-600"
            }`}
          aria-label="Aumentar quantidade"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <span className="text-sm text-gray-600">
        {stockAvailable} disponível{stockAvailable !== 1 ? 's' : ''}
      </span>
    </div>
  );
}