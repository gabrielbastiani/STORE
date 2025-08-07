import Image from "next/image";
import { X } from "lucide-react";
import { useEffect } from "react";

interface ZoomModalProps {
  currentImages: {
    url: string;
    altText?: string;
  }[];
  selectedImageIndex: number;
  setSelectedImageIndex: (index: number) => void; // Tipo corrigido
  setIsZoomed: (zoomed: boolean) => void;
  API_URL?: string;
}

export default function ZoomModal({
  currentImages,
  selectedImageIndex,
  setSelectedImageIndex,
  setIsZoomed,
  API_URL
}: ZoomModalProps) {
  // Funções de navegação simplificadas
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

  // Fechar ao pressionar Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsZoomed(false);
      if (e.key === 'ArrowLeft') goToPrevImage();
      if (e.key === 'ArrowRight') goToNextImage();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedImageIndex, currentImages.length]); // Dependências adicionadas

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
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24">
                <path fill="currentColor" d="M15.41 7.41L14 6l-6 6l6 6l1.41-1.41L10.83 12z" />
              </svg>
            </button>

            <button
              onClick={(e) => goToNextImage(e)}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white rounded-full p-3 z-10 hover:bg-opacity-75 transition-all"
              aria-label="Próxima imagem"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24">
                <path fill="currentColor" d="M10 6L8.59 7.41L13.17 12l-4.58 4.59L10 18l6-6z" />
              </svg>
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
              src={`${API_URL}/files/${currentImages[selectedImageIndex].url}`}
              alt={currentImages[selectedImageIndex].altText || "Visualização ampliada do produto"}
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