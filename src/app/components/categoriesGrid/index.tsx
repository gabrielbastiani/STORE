"use client";

import { useTheme } from "@/app/contexts/ThemeContext";
import { setupAPIClient } from "@/services/api";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { FaArrowAltCircleRight } from "react-icons/fa";
import { FaArrowAltCircleLeft } from "react-icons/fa";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface CategoriesProps {
  id: string;
  name: string;
  slug: string;
  image: string | null;
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

function hexToRgba(hex: string, alpha = 0.5) {
  const clean = hex.replace(/^#/, "");
  const num = parseInt(clean, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function CategoriesCarousel() {
  const { colors } = useTheme();
  const [categories, setCategories] = useState<CategoriesProps[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // 1) Carrega categorias
  useEffect(() => {
    const api = setupAPIClient();
    api
      .get<CategoriesProps[]>("/categories/store/grid")
      .then((res) => setCategories(res.data))
      .catch(console.error);
  }, []);

  // 2) Prepara os slides: fatias de 10
  const slides = chunkArray(categories, 10);

  // 3) Configura o Embla
  const [viewportRef, embla] = useEmblaCarousel({
    loop: false,
    align: "start",
    skipSnaps: false,
  });

  // atualiza índice selecionado
  const onSelect = useCallback(() => {
    if (!embla) return;
    setSelectedIndex(embla.selectedScrollSnap());
  }, [embla]);

  useEffect(() => {
    if (embla) {
      embla.on("select", onSelect);
      onSelect();
    }
  }, [embla, onSelect]);

  // 4) Overlay semi‑transparente
  const overlayBg = colors?.fundo_blocos_categorias_pagina_inicial
    ? hexToRgba(colors.fundo_blocos_categorias_pagina_inicial, 0.5)
    : "rgba(121,122,123,0.5)";

  return (
    <div className="container mx-auto px-4 py-8 relative">
      <h2
        className="text-2xl font-bold mb-6"
        style={{ color: colors?.titulo_categorias_pagina_inicial ?? "#000" }}
      >
        Categorias
      </h2>

      {/* ← seta anterior */}
      <button
        onClick={() => embla && embla.scrollPrev()}
        disabled={!embla || selectedIndex === 0}
        className="absolute top-1/2 left-2 z-20 -translate-y-1/2 rounded-full bg-black bg-opacity-75 p-2 hover:bg-opacity-100 disabled:opacity-50"
        aria-label="Anterior"
      >
        <FaArrowAltCircleLeft size={30} />
      </button>

      {/* seta próxima → */}
      <button
        onClick={() => embla && embla.scrollNext()}
        disabled={!embla || selectedIndex === slides.length - 1}
        className="absolute top-1/2 right-2 z-20 -translate-y-1/2 rounded-full bg-black bg-opacity-75 p-2 hover:bg-opacity-100 disabled:opacity-50"
        aria-label="Próximo"
      >
        <FaArrowAltCircleRight size={30} />
      </button>

      {/* viewport do Embla */}
      <div ref={viewportRef} className="overflow-hidden w-full">
        <div className="flex select-none">
          {slides.map((chunk, idx) => (
            <div key={idx} className="min-w-full flex-shrink-0 px-1">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {chunk.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/categoria/${cat.slug}`}
                    className="relative h-40 overflow-hidden rounded shadow hover:shadow-lg transition"
                  >
                    {cat.image ? (
                      <Image
                        src={`${API_URL}/files/${cat.image}`}
                        alt={cat.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gray-300" />
                    )}
                    <div
                      className="absolute inset-0 flex items-center justify-center px-2"
                      style={{ backgroundColor: overlayBg }}
                    >
                      <h3
                        className="text-center text-lg font-bold"
                        style={{
                          color:
                            colors?.texto_categorias_pagina_inicial ?? "#fff",
                        }}
                      >
                        {cat.name}
                      </h3>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* dots */}
      <div className="flex justify-center mt-4 space-x-2">
        {slides.map((_, idx) => (
          <button
            key={idx}
            className={`w-3 h-3 rounded-full transition ${idx === selectedIndex
                ? "bg-blue-600"
                : "bg-gray-400 hover:bg-gray-500"
              }`}
            onClick={() => embla && embla.scrollTo(idx)}
            aria-label={`Ir para slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}