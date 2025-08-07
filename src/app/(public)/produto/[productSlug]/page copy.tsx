"use client";

import React, { useEffect, useState, useMemo, useContext } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  ShoppingCart,
  Heart,
  Share2,
  Star,
  Check,
  Truck,
  Shield,
  RotateCcw,
  Play,
  ChevronDown,
  ChevronUp,
  X,
  Tag,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

import { setupAPIClient } from "@/services/api";
import { NavbarStore } from "@/app/components/navbar/navbarStore";
import { FooterStore } from "@/app/components/footer/footerStore";
import { useCart } from "@/app/contexts/CartContext";
import ViewCounter from "@/app/components/viewCounter";
import { AuthContextStore } from "@/app/contexts/AuthContextStore";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const STORAGE_KEY = "recently_viewed";

interface Promotion {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  hasCoupon: boolean;
  cumulative: boolean;
}

interface Variant {
  id: string;
  sku: string;
  price_of: number;
  price_per: number;
  stock: number;
  productVariantImage?: { url: string; altText: string }[];
  variantAttribute?: { key: string; value: string }[];
  mainPromotion?: Promotion;
}

interface ProductFormData {
  id?: string;
  name: string;
  slug: string;
  skuMaster: string;
  brand: string;
  price_of: number;
  price_per: number;
  stock: number;
  length: number;
  width: number;
  height: number;
  weight: number;
  categories?: Array<{ category: { id: string; name: string; slug: string } }>;
  images?: Array<{ url: string; altText: string; isPrimary: boolean }>;
  productsDescriptions?: Array<{ id: string; title: string; description: string }>;
  buyTogether?: { id: string; name: string; product: ProductFormData[] };
  mainPromotion?: Promotion;
  variants?: Variant[];
  videos?: Array<{ url: string; isPrimary: boolean }>;
  productRelations?: Array<{ relatedProduct: ProductFormData }>;
  parentRelations?: Array<{ childProduct: ProductFormData }>;
  childRelations?: Array<{ childProduct: ProductFormData }>;
}

export default function ProductPage({
  params,
}: {
  params: Promise<{ productSlug: string }>;
}) {
  const { productSlug } = React.use(params);
  const router = useRouter();

  const { signIn, isAuthenticated, user } = useContext(AuthContextStore);
  const { addItem } = useCart();

  const [product, setProduct] = useState<ProductFormData | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [expandedDescription, setExpandedDescription] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"description" | "specifications" | "reviews">(
    "description"
  );
  const [adding, setAdding] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);

  const [togetherQty, setTogetherQty] = useState<Record<string, number>>({});
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});

  // 1) Carregar produto
  useEffect(() => {
    async function load() {
      const api = setupAPIClient();
      try {
        // 1) busca o produto principal
        const { data } = await api.get(`/product/page?productSlug=${productSlug}`);
        let prod: ProductFormData = data;

        // 2) se há grupo "compre junto" com IDs, buscamos cada um
        if (data.buyTogether?.products?.length) {
          const allIds: string[] = data.buyTogether.products;

          // monta chamadas para cada ID
          const fetches = allIds.map(id =>
            api.get<ProductFormData>(`/product/buyTogheter?product_id=${id}`)
          );
          const results = await Promise.all(fetches);

          // extrai .data de cada resposta (é um objeto ProductFormData)
          const items = results.map(r => r.data);

          // monta o buyTogether completo, FORÇANDO o array exatamente na ordem dos IDs
          prod = {
            ...prod,
            buyTogether: {
              ...data.buyTogether,
              product: items
            }
          };
        }

        // 3) grava no estado
        setProduct(prod);

        // 4) inicializa variant e atributos
        if (prod.variants?.length) {
          const first = prod.variants[0];
          setSelectedVariant(first);
          const initAttrs: Record<string, string> = {};
          first.variantAttribute?.forEach(a => (initAttrs[a.key] = a.value));
          setSelectedAttributes(initAttrs);
        }

        // 5) inicializa quantidades "compre junto"
        if (prod.buyTogether?.product) {
          const initQty: Record<string, number> = {};
          prod.buyTogether.product.forEach(p => {
            if (p.id) initQty[p.id] = 1;
          });
          setTogetherQty(initQty);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [productSlug]);

  // 2) Histórico de views
  useEffect(() => {
    if (!product?.id) return;
    const arr: string[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    arr.push(product.id);
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(Array.from(new Set(arr.reverse())).reverse().slice(-10))
    );
  }, [product]);

  // Helpers
  const formatPrice = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  // Agrupa todos os valores possíveis por atributo
  const allOptions = useMemo(() => {
    // Se product não existir ou não tiver variantes, retorna mapeamento vazio
    if (!product?.variants?.length) {
      return {} as Record<string, Set<string>>;
    }
    const map: Record<string, Set<string>> = {};
    product.variants.forEach(variant => {
      variant.variantAttribute?.forEach(a => {
        if (!map[a.key]) map[a.key] = new Set();
        map[a.key].add(a.value);
      });
    });
    return map;
  }, [product]);

  // Calcula, para cada atributo, quais valores são compatíveis com SELEÇÕES ATUAIS
  const availableOptions = useMemo(() => {
    // Sem variantes, não há opções disponíveis
    if (!product?.variants?.length) {
      return {} as Record<string, Set<string>>;
    }
    const map: Record<string, Set<string>> = {};
    Object.entries(allOptions).forEach(([key, values]) => {
      map[key] = new Set();
      values.forEach(value => {
        const possible = product.variants!.some(v => {
          const hasThis = v.variantAttribute?.some(a => a.key === key && a.value === value);
          if (!hasThis) return false;
          return Object.entries(selectedAttributes).every(([k, val]) => {
            if (k === key) return true;
            return v.variantAttribute?.some(a => a.key === k && a.value === val);
          });
        });
        if (possible) map[key].add(value);
      });
    });
    return map;
  }, [allOptions, selectedAttributes, product]);

  // Quando usuário clica em um atributo:
  function handleAttributeSelect(key: string, value: string) {
    if (!availableOptions[key].has(value)) return; // ignora seleção impossível
    const nextAttrs = { ...selectedAttributes, [key]: value };
    // verifica se isso leva a UMA única variante
    const matches = product!.variants!.filter(v =>
      Object.entries(nextAttrs).every(
        ([k, val]) => v.variantAttribute?.some(a => a.key === k && a.value === val)
      )
    );
    if (matches.length === 1) {
      // seleciona variante única e sincroniza todos atributos
      const single = matches[0];
      setSelectedVariant(single);
      const sync: Record<string, string> = {};
      single.variantAttribute?.forEach(a => (sync[a.key] = a.value));
      setSelectedAttributes(sync);
      setQuantity(1);
      setSelectedImageIndex(0);
    } else {
      // só refina seleções parciais
      setSelectedAttributes(nextAttrs);
    }
  }

  // Mais helpers de galeria, desconto, estoque...
  const getCurrentImages = () =>
    selectedVariant?.productVariantImage && selectedVariant.productVariantImage.length
      ? selectedVariant.productVariantImage
      : product?.images || [];
  const currentImages = getCurrentImages();
  const hasDiscount =
    !!selectedVariant && selectedVariant.price_per < selectedVariant.price_of;
  const discount = hasDiscount
    ? Math.round(
      ((selectedVariant!.price_of - selectedVariant!.price_per) /
        selectedVariant!.price_of) *
      100
    )
    : 0;
  const stockAvailable =
    selectedVariant?.stock != null
      ? selectedVariant.stock
      : product?.stock ?? 0;

  const relatedProducts: ProductFormData[] = [
    ...(product?.productRelations?.map(r => r.relatedProduct) || []),
    ...(product?.parentRelations?.map(r => r.childProduct) || []),
    ...(product?.childRelations?.map(r => r.childProduct) || []),
  ];

  // Quantidade principal
  const handleQuantityChange = (delta: number) =>
    setQuantity(q =>
      Math.min(Math.max(q + delta, 1), selectedVariant?.stock ?? product!.stock)
    );

  const handleAddToCart = async () => {
    if (!product) return;
    setAdding(true);
    try {
      await addItem(product.id!, quantity);
      toast.success(`"${product.name}" adicionado!`);
      setQuantity(1);
    } catch {
      toast.error("Erro ao adicionar.");
    } finally {
      setAdding(false);
    }
  };

  // Compre junto
  function changeTogetherQty(id: string, delta: number) {
    setTogetherQty(prev => {
      const old = prev[id] || 1;
      const next = Math.min(Math.max(old + delta, 1), product?.stock ?? old);
      return { ...prev, [id]: next };
    });
  }

  const addAllTogether = async () => {
    if (!product?.buyTogether) return;
    setAdding(true);
    try {
      await Promise.all(
        product.buyTogether.product.map(p =>
          addItem(p.id!, togetherQty[p.id!] || 1)
        )
      );
      toast.success("Todos os itens de 'Compre Junto' adicionados!");
    } catch {
      toast.error("Erro ao adicionar grupo.");
    } finally {
      setAdding(false);
    }
  };

  // Promotion info
  const promo = product?.mainPromotion;
  // Promoção da variante
  const variantPromo = selectedVariant?.mainPromotion;

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <>
      <NavbarStore />
      <div className="bg-gray-50 min-h-screen p-4">
        <ViewCounter product_id={product?.id!} />

        {/* Breadcrumb */}
        <div className="bg-white border-b mb-6">
          <div className="container mx-auto px-4 py-3">
            <nav className="text-sm text-gray-600 flex flex-wrap items-center gap-1">
              <span className="hover:text-blue-600 cursor-pointer">Home</span>
              {product!.categories?.map(cat => (
                <React.Fragment key={cat.category.id}>
                  <ChevronRight className="w-4 h-4" />
                  <span className="hover:text-blue-600 cursor-pointer">
                    {cat.category.name}
                  </span>
                </React.Fragment>
              ))}
              <ChevronRight className="w-4 h-4" />
              <span className="font-medium text-gray-800">{product!.name}</span>
            </nav>
          </div>
        </div>

        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">

            {/* Galeria */}
            <div className="space-y-4">
              <div className="relative bg-white rounded-lg border group overflow-hidden">
                {/* Badge geral ou de variante */}
                {hasDiscount && (
                  <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold z-10">
                    -{discount}%
                  </div>
                )}
                <div className="aspect-square relative">
                  {currentImages.length ? (
                    <Image
                      src={`${API_URL}/files/${currentImages[selectedImageIndex].url}`}
                      alt={currentImages[selectedImageIndex].altText || product!.name}
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
                      onClick={() =>
                        setSelectedImageIndex(i =>
                          i === 0 ? currentImages.length - 1 : i - 1
                        )
                      }
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-white p-2 rounded-full shadow opacity-0 group-hover:opacity-100 transition"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() =>
                        setSelectedImageIndex(i =>
                          i === currentImages.length - 1 ? 0 : i + 1
                        )
                      }
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-white p-2 rounded-full shadow opacity-0 group-hover:opacity-100 transition"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>

              {/* Miniaturas */}
              {currentImages.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {currentImages.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImageIndex(idx)}
                      className={`w-20 h-20 border rounded-lg overflow-hidden ${idx === selectedImageIndex ? "border-blue-600" : "border-gray-200"
                        }`}
                    >
                      <Image
                        src={`${API_URL}/files/${img.url}`}
                        alt={img.altText}
                        width={300}
                        height={300}
                        className="object-contain"
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* Vídeo */}
              {product!.videos?.length && (
                <div className="bg-white rounded-lg border p-4">
                  <h3 className="font-semibold mb-3 flex items-center text-gray-800">
                    <Play className="w-5 h-5 mr-2 text-red-600" />
                    Vídeo do Produto
                  </h3>
                  <div className="aspect-video rounded-lg overflow-hidden">
                    <iframe
                      src={product!.videos![0].url.replace("watch?v=", "embed/")}
                      className="w-full h-full"
                      allowFullScreen
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Info + ações */}
            <div className="space-y-6">
              {/* Título e avaliação */}
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{product!.name}</h1>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-current" />
                    ))}
                  </div>
                  <span className="text-sm text-gray-600">(4.8) - 127 avaliações</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  SKU: {selectedVariant?.sku ?? product!.skuMaster} | Marca: {product!.brand}
                </p>
              </div>

              {/* Preço */}
              <div className="bg-white p-6 rounded-lg border">
                {hasDiscount ? (
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="text-xl text-gray-400 line-through">
                        {formatPrice(selectedVariant!.price_of)}
                      </span>
                      <span className="bg-red-500 text-white px-2 py-1 rounded-full text-sm font-bold">
                        -{discount}%
                      </span>
                    </div>
                    <div className="text-3xl font-bold text-green-600 mt-2">
                      {formatPrice(selectedVariant!.price_per)}
                    </div>
                  </div>
                ) : (
                  <div className="text-3xl font-bold text-gray-900">
                    {formatPrice(selectedVariant?.price_per ?? product!.price_per)}
                  </div>
                )}
                <p className="text-sm text-gray-600 mt-2">
                  À vista no PIX ou em até 12x sem juros no cartão
                </p>

                {/* === Promoção da Variante === */}
                {variantPromo && (
                  <div className="mt-4 p-3 border-l-4 border-blue-600 bg-blue-50 flex items-start gap-3">
                    <Tag className="w-6 h-6 text-blue-600 mt-1" />
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

              {/* === VARIANTES === */}
              {product!.variants!.length > 1 && (
                <div className="space-y-4">
                  {Object.entries(allOptions).map(([key, values]) => (
                    <div key={key} className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">{key}:</label>
                      <div className="flex flex-wrap gap-2">
                        {[...values].map(value => {
                          const isSel = selectedAttributes[key] === value;
                          const isAvail = availableOptions[key].has(value);
                          return (
                            <button
                              key={value}
                              onClick={() => handleAttributeSelect(key, value)}
                              disabled={!isAvail}
                              className={`px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${isSel
                                ? "border-blue-600 bg-blue-50 text-blue-600"
                                : isAvail
                                  ? "border-gray-300 hover:border-gray-400"
                                  : "border-gray-200 text-gray-400 cursor-not-allowed"
                                }`}
                            >
                              {value}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Produtos Relacionados */}
              {relatedProducts.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-700">Produtos Relacionados:</h3>
                  <div className="flex flex-wrap gap-2">
                    {relatedProducts.map((rel) => (
                      <button
                        key={rel.id}
                        onClick={() => router.push(`/produto/${rel.slug}`)}
                        className="px-4 py-2 border rounded-lg text-sm font-medium transition-colors hover:bg-gray-100"
                      >
                        <div className="text-black">{rel.name}</div>
                        <div className="text-gray-600">{formatPrice(rel.price_per)}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantidade */}
              <div className="flex items-center gap-4">
                <div className="flex items-center border border-gray-300 rounded-lg text-black">
                  <button
                    onClick={() => handleQuantityChange(-1)}
                    disabled={quantity <= 1}
                    className="p-2 hover:bg-gray-100 disabled:opacity-50"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="px-4 py-2 border-x border-gray-300 min-w-[60px] text-center">
                    {quantity}
                  </span>
                  <button
                    onClick={() => handleQuantityChange(1)}
                    disabled={quantity >= stockAvailable}
                    className="p-2 hover:bg-gray-100 disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <span className="text-sm text-gray-600">
                  {stockAvailable} unidade(s) disponíveis
                </span>
              </div>

              {/* Ações */}
              <div className="space-y-3">
                <button
                  onClick={handleAddToCart}
                  disabled={stockAvailable === 0 || adding}
                  className="w-full bg-red-600 text-white py-4 rounded-lg font-semibold text-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {adding ? <Check className="animate-spin w-5 h-5" /> : <ShoppingCart className="w-5 h-5" />}
                  {stockAvailable === 0
                    ? "Produto Esgotado"
                    : adding
                      ? "Adicionando..."
                      : "Adicionar ao Carrinho"}
                </button>
                <div className="flex gap-3">
                  <button className="text-gray-500 flex-1 border border-gray-300 py-3 rounded-lg font-medium hover:bg-gray-50 flex items-center justify-center gap-2">
                    <Heart className="w-5 h-5" /> Favoritar
                  </button>
                  <button className="text-gray-500 flex-1 border border-gray-300 py-3 rounded-lg font-medium hover:bg-gray-50 flex items-center justify-center gap-2">
                    <Share2 className="w-5 h-5" /> Compartilhar
                  </button>
                </div>
              </div>

              {/* Benefícios */}
              <div className="bg-gray-50 p-4 rounded-lg space-y-3 text-gray-600">
                <div className="flex items-center gap-3 text-sm">
                  <Truck className="w-5 h-5 text-green-600" />
                  <span>Frete grátis para compras acima de R$ 299</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Shield className="w-5 h-5 text-blue-600" />
                  <span>Garantia de 1 ano do fabricante</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <RotateCcw className="w-5 h-5 text-orange-600" />
                  <span>7 dias para trocar ou devolver</span>
                </div>
              </div>
            </div>
          </div>

          {/* === Seção Compre Junto === */}
          {product?.buyTogether?.product && (
            <div className="bg-white p-4 rounded-lg border mb-6">
              <h2 className="text-xl font-semibold mb-4 text-black">
                Compre Junto: {product.buyTogether.name}
              </h2>

              {/* Carrossel */}
              <div className="flex overflow-x-auto space-x-4 pb-2">
                {product.buyTogether.product.map(p => (
                  <div
                    key={p.id}
                    className="flex-shrink-0 w-64 bg-gray-50 rounded-lg border p-4 flex flex-col justify-between"
                  >
                    {/* Imagem */}
                    <div className="flex justify-center mb-3">
                      <Image
                        src={`${API_URL}/files/${p.images?.[0]?.url}`}
                        alt={p.images?.[0]?.altText || p.name}
                        width={120}
                        height={120}
                        className="object-contain"
                      />
                    </div>

                    {/* Nome e preço */}
                    <div className="mb-3">
                      <div className="font-medium text-gray-700">{p.name}</div>
                      <div className="text-gray-600">{formatPrice(p.price_per)}</div>
                    </div>

                    {/* Quantidade + Add */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => changeTogetherQty(p.id!, -1)}
                          className="p-2 border border-black rounded disabled:opacity-50"
                          disabled={togetherQty[p.id!] <= 1}
                        >
                          <Minus className="w-4 h-4 text-black" />
                        </button>
                        <span className="w-8 text-center text-black">
                          {togetherQty[p.id!] ?? 0}
                        </span>
                        <button
                          onClick={() => changeTogetherQty(p.id!, +1)}
                          className="p-2 border border-black rounded disabled:opacity-50"
                          disabled={togetherQty[p.id!] >= (p.stock ?? 0)}
                        >
                          <Plus className="w-4 h-4 text-black" />
                        </button>
                      </div>
                      <button
                        onClick={async () => {
                          setAdding(true);
                          try {
                            await addItem(p.id!, togetherQty[p.id!]!);
                            toast.success(`"${p.name}" adicionado!`);
                          } catch {
                            toast.error("Erro ao adicionar.");
                          } finally {
                            setAdding(false);
                          }
                        }}
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
            </div>
          )}

          {/* === Seção Promoção Principal === */}
          {promo && (
            <div className="bg-white p-4 rounded-lg border mb-6">
              <h2 className="text-xl font-semibold mb-2 text-black">Promoção: {promo.name}</h2>
              <p className="text-sm text-gray-700 mb-1">{promo.description}</p>
              <p className="text-sm text-gray-500 mb-2">
                Válida de{" "}
                {new Date(promo.startDate).toLocaleDateString("pt-BR")} até{" "}
                {new Date(promo.endDate).toLocaleDateString("pt-BR")}
              </p>
              {promo.hasCoupon ? (
                <p className="text-sm text-blue-600 mb-2">
                  Esta promoção exige cupom. Aplique-o no carrinho.
                </p>
              ) : (
                <p className="text-sm text-green-600 mb-2">
                  Promoção automática (já será aplicada no carrinho).
                </p>
              )}
              <button
                onClick={() => router.push("/cart")}
                className="mt-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                Ir para o Carrinho
              </button>
            </div>
          )}

          {/* Abas */}
          <div className="mt-12 bg-white rounded-lg border border-gray-200">
            <div className="border-b border-gray-200">
              <nav className="flex">
                {(["description", "specifications", "reviews"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-6 py-4 font-medium border-b-2 ${activeTab === tab
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-600 hover:text-gray-800"
                      }`}
                  >
                    {tab === "description" && "Descrição"}
                    {tab === "specifications" && "Especificações"}
                    {tab === "reviews" && `Avaliações (${127})`}
                  </button>
                ))}
              </nav>
            </div>
            <div className="p-6">
              {activeTab === "description" && (
                <div className="space-y-6">
                  {product?.productsDescriptions?.map((desc) => (
                    <div key={desc.id} className="space-y-3">
                      <button
                        onClick={() =>
                          setExpandedDescription((id) => (id === desc.id ? null : desc.id))
                        }
                        className="flex items-center justify-between w-full text-left"
                      >
                        <h3 className="text-lg font-semibold text-gray-900">{desc.title}</h3>
                        {expandedDescription === desc.id ? (
                          <ChevronUp className="w-5 h-5 text-gray-500" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-500" />
                        )}
                      </button>
                      {expandedDescription === desc.id && (
                        <div
                          className="prose prose-blue max-w-none"
                          dangerouslySetInnerHTML={{ __html: desc.description }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {activeTab === "specifications" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h3 className="font-semibold text-gray-900">Informações Gerais</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-600">SKU:</span>
                        <span className="font-medium text-black">{product?.skuMaster}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-600">Marca:</span>
                        <span className="font-medium text-black">{product?.brand}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-600">Peso:</span>
                        <span className="font-medium text-black">{product?.weight} kg</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-600">Dimensões:</span>
                        <span className="font-medium text-black">
                          {product?.length} x {product?.width} x {product?.height} cm
                        </span>
                      </div>
                    </div>
                  </div>
                  {selectedVariant && (
                    <div className="space-y-3">
                      <h3 className="font-semibold text-gray-900">Variante Selecionada</h3>
                      <div className="space-y-2 text-sm">
                        {selectedVariant.variantAttribute?.map((attr: any, i: number) => (
                          <div
                            key={i}
                            className="flex justify-between py-2 border-b border-gray-100"
                          >
                            <span className="text-gray-600">{attr.key}:</span>
                            <span className="font-medium text-black">{attr.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "reviews" && (
                <div className="space-y-6 text-center text-gray-500">
                  <Star className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p>Seja o primeiro a avaliar este produto!</p>
                  <button className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
                    Escrever Avaliação
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Zoom */}
        {isZoomed && (
          <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
            <div className="relative max-w-7xl max-h-full">
              <button
                onClick={() => setIsZoomed(false)}
                className="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full p-2 z-10"
              >
                <X className="w-6 h-6" />
              </button>
              <Image
                src={`${API_URL}/files/${currentImages[selectedImageIndex]?.url}`}
                alt={currentImages[selectedImageIndex]?.altText}
                width={400}
                height={400}
                className="max-w-full max-h-full object-contain"
              />
            </div>
          </div>
        )}

      </div>
      <FooterStore />
    </>
  );
}