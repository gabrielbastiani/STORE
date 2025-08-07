import React from "react";
import { ShoppingCart, Check, Heart, Share2 } from "lucide-react";
import ShareMenu from "./ShareMenu";
import { ProductFormData } from "Types/types"; 

interface ActionButtonsProps {
  product: ProductFormData;
  quantity: number;
  stockAvailable: number;
  adding: boolean;
  handleAddToCart: () => void;
  isFavorite: boolean;
  toggleFavorite: () => void;
  showShareMenu: boolean;
  setShowShareMenu: (show: boolean) => void;
  shareProduct: (platform: string) => void;
}

export default function ActionButtons({
  stockAvailable,
  adding,
  handleAddToCart,
  isFavorite,
  toggleFavorite,
  showShareMenu,
  setShowShareMenu,
  shareProduct
}: ActionButtonsProps) {
  return (
    <div className="space-y-3">
      {/* Botão principal - Adicionar ao Carrinho */}
      <button
        onClick={handleAddToCart}
        disabled={stockAvailable === 0 || adding}
        className={`w-full py-4 rounded-lg font-semibold text-lg flex items-center justify-center gap-2 ${stockAvailable === 0
            ? "bg-gray-400 text-white cursor-not-allowed"
            : adding
              ? "bg-red-700 text-white"
              : "bg-red-600 text-white hover:bg-red-700"
          }`}
      >
        {adding ? (
          <Check className="animate-spin w-5 h-5" />
        ) : (
          <ShoppingCart className="w-5 h-5" />
        )}
        {stockAvailable === 0
          ? "Produto Esgotado"
          : adding
            ? "Adicionando..."
            : "Adicionar ao Carrinho"}
      </button>

      {/* Botões secundários */}
      <div className="flex gap-3">
        {/* Botão Favoritar */}
        <button
          onClick={toggleFavorite}
          className={`flex-1 border py-3 rounded-lg font-medium flex items-center justify-center gap-2 ${isFavorite
              ? "text-red-600 border-red-600 bg-red-50 hover:bg-red-100"
              : "text-gray-500 border-gray-300 hover:bg-gray-50"
            }`}
        >
          <Heart
            className={`w-5 h-5 ${isFavorite ? "fill-current" : ""}`}
          />
          {isFavorite ? "Favoritado" : "Favoritar"}
        </button>

        {/* Botão Compartilhar com menu dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowShareMenu(!showShareMenu)}
            className="text-gray-500 flex-1 border border-gray-300 py-3 rounded-lg font-medium hover:bg-gray-50 flex items-center justify-center gap-2 w-full"
          >
            <Share2 className="w-5 h-5" /> Compartilhar
          </button>

          {/* Menu de Compartilhamento */}
          <ShareMenu
            showShareMenu={showShareMenu}
            shareProduct={shareProduct}
          />
        </div>
      </div>
    </div>
  );
}