import Image from "next/image";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import { ProductFormData, VariantFormData } from "Types/types";
import { useState } from "react";

interface ProductGalleryProps {
  product: ProductFormData;
  selectedVariant: VariantFormData | null;
  selectedImageIndex: number;
  setSelectedImageIndex: (index: number) => void;
  setIsZoomed: (value: boolean) => void;
  currentImages: { url: string; alt?: string }[];
}

export default function ProductGallery({
  product,
  selectedVariant,
  selectedImageIndex,
  setSelectedImageIndex,
  setIsZoomed,
  currentImages
}: ProductGalleryProps) {

  const [selectedVideoIndex, setSelectedVideoIndex] = useState(0);

  const hasDiscount = selectedVariant && selectedVariant.price_per! < selectedVariant.price_of!;
  const discount = hasDiscount
    ? Math.round(
      ((selectedVariant.price_of! - selectedVariant.price_per!) /
        selectedVariant.price_of!) *
      100
    )
    : 0;

  const goToPrevImage = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();/* @ts-ignore */
    setSelectedImageIndex((prev: number) => 
      prev === 0 ? currentImages.length - 1 : prev - 1
    );
  };

  const goToNextImage = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();/* @ts-ignore */
    setSelectedImageIndex((prev: number) => 
      prev === currentImages.length - 1 ? 0 : prev + 1
    );
  };

  const getEmbedUrl = (url: string) => {
    if (url.includes('youtube.com') && url.includes('watch?v=')) {
      return url.replace('watch?v=', 'embed/');
    }
    if (url.includes('youtu.be/')) {
      return `https://www.youtube.com/embed/${url.split('/').pop()}`;
    }
    if (url.includes('vimeo.com/')) {
      const videoId = url.split('/').pop();
      return `https://player.vimeo.com/video/${videoId}`;
    }
    return url;
  };

  const getVideoThumbnail = (url: string) => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoId = url.includes('youtube.com')
        ? url.split('v=')[1].split('&')[0]
        : url.split('/').pop();
      return `https://img.youtube.com/vi/${videoId}/0.jpg`;
    }
    if (url.includes('vimeo.com/')) {
      const videoId = url.split('/').pop();
      return `https://vumbnail.com/${videoId}.jpg`;
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Galeria Principal */}
      <div className="relative bg-white rounded-lg border group overflow-hidden">
        {hasDiscount && (
          <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold z-10">
            -{discount}%
          </div>
        )}

        <div className="aspect-square relative">
          {currentImages.length ? (
            <Image
              src={currentImages[selectedImageIndex]?.url || ''}
              alt={currentImages[selectedImageIndex]?.alt || product.name}
              fill
              className="object-contain cursor-zoom-in p-4"
              onClick={() => setIsZoomed(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              Sem imagem
            </div>
          )}
        </div>

        {currentImages.length > 1 && (
          <>
            <button
              onClick={(e) => goToPrevImage(e)}
              className="text-black absolute left-4 top-1/2 -translate-y-1/2 bg-white p-2 rounded-full shadow opacity-0 group-hover:opacity-100 transition"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={(e) => goToNextImage(e)}
              className="text-black absolute right-4 top-1/2 -translate-y-1/2 bg-white p-2 rounded-full shadow opacity-0 group-hover:opacity-100 transition"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* Miniaturas das imagens */}
      {currentImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {currentImages.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedImageIndex(idx)}
              className={`w-20 h-20 border rounded-lg overflow-hidden flex-shrink-0 ${idx === selectedImageIndex ? "border-blue-600" : "border-gray-200"
                }`}
            >
              <Image
                src={img.url}
                alt={img.alt || `Imagem ${idx + 1} do produto`}
                width={80}
                height={80}
                className="object-contain w-full h-full"
              />
            </button>
          ))}
        </div>
      )}

      {/* Vídeos do Produto */}
      {product.videos && product.videos.length > 0 && (
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center text-gray-800">
              <Play className="w-5 h-5 mr-2 text-red-600" />
              Vídeos do Produto
            </h3>

            {product.videos.length > 1 && (
              <div className="text-sm text-gray-500">
                {selectedVideoIndex + 1} de {product.videos.length}
              </div>
            )}
          </div>

          {/* Player principal */}
          <div className="aspect-video rounded-lg overflow-hidden mb-4 bg-black">
            <iframe
              src={getEmbedUrl(product.videos[selectedVideoIndex].url)}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={`Vídeo do produto ${selectedVideoIndex + 1}`}
            />
          </div>

          {/* Navegação de vídeos */}
          {product.videos.length > 1 && (
            <div className="flex items-center justify-between">
              <button
                onClick={() => setSelectedVideoIndex(prev =>// @ts-ignore
                  prev === 0 ? product.videos.length - 1 : prev - 1
                )}
                className="flex items-center text-sm text-gray-600 hover:text-gray-800"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Anterior
              </button>

              <div className="flex gap-1">
                {product.videos.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedVideoIndex(idx)}
                    className={`w-2 h-2 rounded-full ${idx === selectedVideoIndex ? "bg-gray-800" : "bg-gray-300"
                      }`}
                    aria-label={`Ir para vídeo ${idx + 1}`}
                  />
                ))}
              </div>

              <button
                onClick={() => setSelectedVideoIndex(prev =>// @ts-ignore
                  prev === product.videos.length - 1 ? 0 : prev + 1
                )}
                className="flex items-center text-sm text-gray-600 hover:text-gray-800"
              >
                Próximo
                <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          )}

          {/* Miniaturas dos vídeos */}
          {product.videos.length > 1 && (
            <div className="mt-4 flex gap-2 overflow-x-auto">
              {product.videos.map((video, idx) => {
                const thumbnail = getVideoThumbnail(video.url);

                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedVideoIndex(idx)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 ${idx === selectedVideoIndex ? "border-blue-600" : "border-gray-200"
                      }`}
                  >
                    {thumbnail ? (
                      // Usando img normal para evitar problemas de domínio
                      <img
                        src={thumbnail}
                        alt={`Miniatura do vídeo ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="bg-gray-200 border-2 border-dashed rounded-xl w-full h-full flex items-center justify-center">
                        <Play className="w-6 h-6 text-gray-500" />
                      </div>
                    )}

                    <div className="relative -mt-6 flex justify-center">
                      <div className="bg-black bg-opacity-60 rounded-full p-1">
                        <Play className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}