import Image from "next/image";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect } from "react";

interface ZoomModalProps {
  currentImages: {
    url: string;
    alt?: string; // Corrigido: altText para alt (para alinhar com ProductPage)
  }[];
  selectedImageIndex: number;
  setSelectedImageIndex: (index: number) => void;
  setIsZoomed: (zoomed: boolean) => void;
}

export default function ZoomModal({
  currentImages,
  selectedImageIndex,
  setSelectedImageIndex,
  setIsZoomed,
}: ZoomModalProps) {
  // Funções de navegação
  const goToPrevImage = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newIndex = selectedImageIndex === 0 ? currentImages.length - 1 : selectedImageIndex - 1;
    setSelectedImageIndex(newIndex);
  };

  const goToNextImage = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newIndex = selectedImageIndex === currentImages.length - 1 ? 0 : selectedImageIndex + 1;
    setSelectedImageIndex(newIndex);
  };

  // Fechar ao pressionar Esc ou setas
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsZoomed(false);
      if (e.key === 'ArrowLeft') goToPrevImage();
      if (e.key === 'ArrowRight') goToNextImage();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedImageIndex, currentImages.length]);

  // Fechar ao clicar no fundo
  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setIsZoomed(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
      onClick={handleBackgroundClick}
    >
      <div className="relative max-w-7xl max-h-full w-full h-full flex items-center justify-center">
        {/* Botão Fechar */}
        <button
          onClick={() => setIsZoomed(false)}
          className="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full p-2 z-10 hover:bg-opacity-75 transition-all"
          aria-label="Fechar zoom"
        >
          <X className="w-8 h-8" />
        </button>

        {/* Navegação entre imagens */}
        {currentImages.length > 1 && (
          <>
            <button
              onClick={(e) => goToPrevImage(e)}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white rounded-full p-3 z-10 hover:bg-opacity-75 transition-all"
              aria-label="Imagem anterior"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <button
              onClick={(e) => goToNextImage(e)}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white rounded-full p-3 z-10 hover:bg-opacity-75 transition-all"
              aria-label="Próxima imagem"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}

        {/* Contador de imagens */}
        {currentImages.length > 1 && (
          <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm z-10">
            {selectedImageIndex + 1} / {currentImages.length}
          </div>
        )}

        {/* Imagem principal */}
        <div className="relative w-full h-full flex items-center justify-center">
          {currentImages[selectedImageIndex] ? (
            <Image
              src={currentImages[selectedImageIndex].url} // URL já vem formatada
              alt={currentImages[selectedImageIndex].alt || "Visualização ampliada do produto"}
              fill
              className="object-contain cursor-zoom-out"
              onClick={() => setIsZoomed(false)}
              quality={100}
              priority
            />
          ) : (
            <div className="bg-gray-200 border-2 border-dashed rounded-xl w-full h-64 flex items-center justify-center text-gray-500">
              Imagem não disponível
            </div>
          )}
        </div>

        {/* Miniaturas (dots) */}
        {currentImages.length > 1 && (
          <div className="absolute bottom-4 left-0 right-0 mx-auto flex justify-center gap-2 z-10">
            {currentImages.map((_, idx) => (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedImageIndex(idx);
                }}
                className={`w-3 h-3 rounded-full ${idx === selectedImageIndex ? "bg-white" : "bg-gray-500"
                  }`}
                aria-label={`Ir para imagem ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}