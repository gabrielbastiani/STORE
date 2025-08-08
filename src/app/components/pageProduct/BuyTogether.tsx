import Image from "next/image";
import { Minus, Plus, ShoppingCart } from "lucide-react";
import React, { useEffect, useState } from "react";
import { ProductFormData } from "Types/types";

interface BuyTogetherProps {
  buyTogether: {
    id: string;
    name: string;
    product: ProductFormData[];
  };
  onAddItem: (productId: string, quantity: number, variantId?: string | null) => Promise<void>;
  togetherQty: Record<string, number>;
  changeTogetherQty: (id: string, delta: number) => void;
  adding: boolean;
  API_URL: string | undefined;
}

export default function BuyTogether({
  buyTogether,
  togetherQty,
  changeTogetherQty,
  onAddItem,
  adding,
  API_URL
}: BuyTogetherProps) {
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string | null>>({});
  // Guarda override de imagem principal por produto (quando usuário clica numa miniatura)
  const [mainImageOverride, setMainImageOverride] = useState<Record<string, string | null>>({});

  // inicializa selectedVariants com a primeira variante (se existir) para cada produto
  useEffect(() => {
    const initSel: Record<string, string | null> = {};
    const initOverride: Record<string, string | null> = {};
    (buyTogether.product || []).forEach((p: any) => {
      const pid = String(p.id);
      initSel[pid] = (Array.isArray(p.variants) && p.variants.length > 0) ? p.variants[0].id ?? null : null;
      initOverride[pid] = null;
    });
    setSelectedVariants(initSel);
    setMainImageOverride(initOverride);
  }, [buyTogether]);

  // Quando selecionar uma variante, resetar o override de imagem para aquele produto
  useEffect(() => {
    // limpa overrides para manter a imagem da variante
    setMainImageOverride(prev => {
      const next = { ...prev };
      Object.keys(selectedVariants).forEach(pid => {
        next[pid] = null;
      });
      return next;
    });
  }, [selectedVariants]);

  function handleVariantChange(productId: string, variantId: string | null) {
    setSelectedVariants(prev => ({ ...prev, [productId]: variantId }));
    // reset do override para mostrar imagem da variante recém-selecionada
    setMainImageOverride(prev => ({ ...prev, [productId]: null }));
  }

  function handleThumbnailClick(productId: string, url: string) {
    setMainImageOverride(prev => ({ ...prev, [productId]: url }));
  }

  const handleAddSingle = async (p: any) => {
    const pid = String(p.id);
    const qty = togetherQty[pid] ?? 1;
    const variantId = selectedVariants[pid] ?? null;
    try {
      await onAddItem(pid, qty, variantId);
    } catch (err) {
      console.error("Erro ao adicionar item do Compre Junto:", err);
    }
  };

  // Helper: pega a URL da imagem principal a partir da variante ou do produto
  const getMainImageUrl = (p: any, selectedVariantId: string | null, overrideUrl?: string | null) => {

    // se houver override (usuário clicou miniatura) usa ele
    if (overrideUrl) return overrideUrl;

    if (selectedVariantId && Array.isArray(p.variants)) {
      const v = p.variants.find((x: any) => x.id === selectedVariantId);
      const vImg = v?.productVariantImage?.[0]?.url;
      if (vImg) return `${API_URL}/files/${vImg}`;
    }

    // fallback produto
    const prodImg = p.images?.[0]?.url;
    if (prodImg) return `${API_URL}/files/${prodImg}`;

    // vazio caso não tenha imagem
    return "";
  };

  // Helper: pega lista de imagens dos atributos do variant (prioriza isPrimary)
  const getAttributeImagesForVariant = (p: any, selectedVariantId: string | null) => {
    if (!selectedVariantId || !Array.isArray(p.variants)) return [];
    const v = p.variants.find((x: any) => x.id === selectedVariantId);
    if (!v || !Array.isArray(v.variantAttribute)) return [];

    const imgs: { url: string; alt?: string; attributeKey?: string; attributeValue?: string }[] = [];

    v.variantAttribute.forEach((attr: any) => {
      if (Array.isArray(attr.variantAttributeImage) && attr.variantAttributeImage.length > 0) {
        // tentar pegar isPrimary, caso contrário a primeira
        const imgObj = attr.variantAttributeImage.find((i: any) => i.isPrimary) ?? attr.variantAttributeImage[0];
        if (imgObj?.url) {
          imgs.push({
            url: `${API_URL}/files/${imgObj.url}`,
            alt: imgObj.altText ?? `${attr.key} - ${attr.value}`,
            attributeKey: attr.key,
            attributeValue: attr.value,
          });
        }
      }
    });

    return imgs;
  };

  return (
    <div className="bg-white p-4 rounded-lg border mb-6">
      <h2 className="text-xl font-semibold mb-4 text-black">
        Compre Junto: {buyTogether.name}
      </h2>

      <div className="flex overflow-x-auto space-x-4 pb-2">
        {(buyTogether.product || []).map((p: any) => {
          const pid = String(p.id);
          const selVariant = selectedVariants[pid] ?? null;
          const overrideUrl = mainImageOverride[pid] ?? null;
          const mainImage = getMainImageUrl(p, selVariant, overrideUrl);
          const attributeImages = getAttributeImagesForVariant(p, selVariant);

          return (
            <div
              key={pid}
              className="flex-shrink-0 w-64 bg-gray-50 rounded-lg border p-4 flex flex-col justify-between text-black"
            >
              {/* Imagem do produto/variante */}
              <div className="flex flex-col items-center mb-3">
                {mainImage ? (
                  // next/image exige domínio na config; se tiver problemas troque para <img>
                  <div className="relative w-32 h-32">
                    <Image
                      src={mainImage}
                      alt={p.images?.[0]?.altText || p.name}
                      width={120}
                      height={120}
                      style={{ objectFit: "contain" }}
                    />
                  </div>
                ) : (
                  <div className="bg-gray-200 border-2 border-dashed rounded-xl w-32 h-32" />
                )}

                {/* Miniaturas dos atributos (se houver) */}
                {attributeImages.length > 0 && (
                  <div className="mt-2 flex gap-2">
                    {attributeImages.map((ai, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleThumbnailClick(pid, ai.url)}
                        className="w-10 h-10 rounded overflow-hidden border hover:ring-2"
                        title={`${ai.attributeKey}: ${ai.attributeValue}`}
                      >
                        {/* usar Image/next ou img simples */}
                        <img src={ai.url} alt={ai.alt} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Nome e preço */}
              <div className="mb-3">
                <div className="font-medium text-gray-700 truncate">{p.name}</div>
                <div className="text-lg font-semibold text-gray-900">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL"
                  }).format(
                    (() => {
                      const selId = selVariant;
                      if (selId && Array.isArray(p.variants)) {
                        const v = p.variants.find((x: any) => x.id === selId);
                        return v?.price_per ?? p.price_per;
                      }
                      return p.price_per;
                    })()
                  )}
                </div>
              </div>

              {/* Variante (se houver) */}
              {Array.isArray(p.variants) && p.variants.length > 0 && (
                <div className="mb-3">
                  <label className="block text-sm text-gray-600 mb-1">Selecione a variação</label>
                  <select
                    value={selectedVariants[pid] ?? ""}
                    onChange={(e) => handleVariantChange(pid, e.target.value || null)}
                    className="w-full border rounded px-2 py-1 bg-white"
                  >
                    {p.variants.map((v: any) => {
                      const attrs = Array.isArray(v.variantAttribute)
                        ? v.variantAttribute.map((a: any) => `${a.key}: ${a.value}`).join(" | ")
                        : "";
                      const label = `${v.sku ?? v.id}${attrs ? " - " + attrs : ""}`;
                      return (
                        <option key={v.id} value={v.id}>
                          {label}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              {/* Controle de quantidade e botão de adicionar */}
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => changeTogetherQty(pid, -1)}
                    className="p-2 border border-gray-300 rounded disabled:opacity-50 hover:bg-gray-100"
                    disabled={(togetherQty[pid] ?? 1) <= 1}
                  >
                    <Minus className="w-4 h-4 text-gray-700" />
                  </button>
                  <span className="w-8 text-center text-black">
                    {togetherQty[pid] ?? 1}
                  </span>
                  <button
                    onClick={() => changeTogetherQty(pid, +1)}
                    className="p-2 border border-gray-300 rounded disabled:opacity-50 hover:bg-gray-100"
                    disabled={(togetherQty[pid] ?? 1) >= (p.stock ?? 0)}
                  >
                    <Plus className="w-4 h-4 text-gray-700" />
                  </button>
                </div>
                <button
                  onClick={() => void handleAddSingle(p)}
                  disabled={adding || (p.stock ?? 0) === 0}
                  className="w-full bg-orange-600 text-white py-2 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <ShoppingCart className="w-5 h-5" />
                  Adicionar
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}