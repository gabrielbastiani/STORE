"use client";

import React, { useEffect, useState, useMemo, useContext } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { useForm } from "react-hook-form";

import { setupAPIClient } from "@/services/api";
import { NavbarStore } from "@/app/components/navbar/navbarStore";
import { FooterStore } from "@/app/components/footer/footerStore";
import { useCart } from "@/app/contexts/CartContext";
import ViewCounter from "@/app/components/viewCounter";
import { AuthContextStore } from "@/app/contexts/AuthContextStore";

// Componentes
import Breadcrumb from "@/app/components/pageProduct/Breadcrumb";
import ProductGallery from "@/app/components/pageProduct/ProductGallery";
import ProductInfo from "@/app/components/pageProduct/ProductInfo";
import VariantsSelector from "@/app/components/pageProduct/VariantsSelector";
import QuantitySelector from "@/app/components/pageProduct/QuantitySelector";
import ActionButtons from "@/app/components/pageProduct/ActionButtons";
import Benefits from "@/app/components/pageProduct/Benefits";
import BuyTogether from "@/app/components/pageProduct/BuyTogether";
import PromotionSection from "@/app/components/pageProduct/PromotionSection";
import ProductTabs from "@/app/components/pageProduct/ProductTabs";
import ZoomModal from "@/app/components/pageProduct/ZoomModal";
import LoginModal from "@/app/components/pageProduct/LoginModal";
import { LoginFormData, ProductFormData, ReviewFormData, VariantFormData } from "Types/types";
import RelatedProducts from "@/app/components/pageProduct/RelatedProducts";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const STORAGE_KEY = "recently_viewed";
const FAVORITES_KEY = "favorites";

export default function ProductPage({ params }: { params: Promise<{ productSlug: string }> }) {

  const router = useRouter();

  const { productSlug } = React.use(params)

  const { signIn, isAuthenticated, user } = useContext(AuthContextStore);
  const { addItem } = useCart();

  const [product, setProduct] = useState<ProductFormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<VariantFormData | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [expandedDescription, setExpandedDescription] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"description" | "specifications" | "reviews">("description");
  const [isZoomed, setIsZoomed] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [cognitiveValid, setCognitiveValid] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [togetherQty, setTogetherQty] = useState<Record<string, number>>({});
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});

  // Formulários
  const { register: registerLogin, handleSubmit: handleSubmitLogin, formState: { errors: loginErrors }, reset: resetLogin } = useForm<LoginFormData>();
  const { register: registerReview, handleSubmit: handleSubmitReview, formState: { errors: reviewErrors }, reset: resetReview } = useForm<ReviewFormData>();

  // Carregar produto
  useEffect(() => {
    async function load() {
      const api = setupAPIClient();
      try {
        const { data } = await api.get(`/product/page?productSlug=${productSlug}`);
        let prod: ProductFormData = data;

        if (data.buyTogether?.products?.length) {
          const allIds: string[] = data.buyTogether.products;
          const fetches = allIds.map(id => api.get<ProductFormData>(`/product/buyTogheter?product_id=${id}`));
          const results = await Promise.all(fetches);
          const items = results.map(r => r.data);

          prod = {
            ...prod,
            buyTogether: {
              ...data.buyTogether,
              product: items
            }
          };
        }

        setProduct(prod);

        if (prod.variants?.length) {
          const first = prod.variants[0];
          setSelectedVariant(first);
          const initAttrs: Record<string, string> = {};
          first.variantAttributes?.forEach(a => (initAttrs[a.key] = a.value));
          setSelectedAttributes(initAttrs);
        }

        if (prod.buyTogether?.product) {
          const initQty: Record<string, number> = {};
          prod.buyTogether.product.forEach(p => {
            if (p.id) initQty[p.id] = 1;
          });
          setTogetherQty(initQty);
        }
      } catch (err) {
        console.error(err);
        toast.error("Erro ao carregar o produto");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [productSlug]);

  // Histórico de visualizações
  useEffect(() => {
    if (!product?.id) return;
    const arr: string[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    arr.push(product.id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(new Set(arr.reverse())).reverse().slice(-10)));
  }, [product]);

  // Verificar favoritos
  useEffect(() => {
    if (!product?.id) return;

    const favorites = JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
    setIsFavorite(favorites.includes(product.id));

    if (isAuthenticated && user?.id) {
      checkServerFavorites();
    }
  }, [product?.id, isAuthenticated, user]);

  const checkServerFavorites = async () => {
    try {
      const api = setupAPIClient();
      const response = await api.get(`/favorite?customer_id=${user?.id}`);
      const serverFavorites = response.data.map((fav: any) => fav.product_id);
      setIsFavorite(serverFavorites.includes(product?.id));
    } catch (error) {
      console.error("Erro ao verificar favoritos:", error);
    }
  };

  // Funções de manipulação
  const toggleFavorite = async () => {
    if (!product?.id) return;

    try {
      const api = setupAPIClient();
      const newIsFavorite = !isFavorite;
      setIsFavorite(newIsFavorite);

      let favorites = JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
      if (newIsFavorite) {
        favorites = [...favorites, product.id];
      } else {
        favorites = favorites.filter((id: string) => id !== product.id);
      }
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));

      if (isAuthenticated) {
        if (newIsFavorite) {
          await api.post('/favorite/create', { product_id: product.id });
        } else {
          await api.delete('/favorite/delete', { data: { product_id: product.id } });
        }
      }
    } catch (error) {
      console.error("Erro ao atualizar favoritos:", error);
      setIsFavorite(!isFavorite);
      toast.error("Erro ao atualizar favoritos");
    }
  };

  const shareProduct = (platform: string) => {
    if (!product) return;

    const productUrl = window.location.href;
    const shareText = encodeURIComponent(`Confira este produto: ${product.name}`);

    const shareUrls: Record<string, string> = {
      whatsapp: `https://api.whatsapp.com/send?text=${shareText}%20${productUrl}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${productUrl}`,
      twitter: `https://twitter.com/intent/tweet?text=${shareText}&url=${productUrl}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${productUrl}`,
      telegram: `https://t.me/share/url?url=${productUrl}&text=${shareText}`,
      copy: productUrl,
    };

    if (platform === 'copy') {
      navigator.clipboard.writeText(productUrl);
      toast.success('Link copiado para a área de transferência!');
    } else {
      window.open(shareUrls[platform], '_blank');
    }

    setShowShareMenu(false);
  };

  const submitReview = async (data: ReviewFormData) => {
    if (!isAuthenticated || !product?.id) {
      setShowLoginModal(true);
      return;
    }

    try {
      // Simulação de envio
      const reviewData = {
        product_id: product.id,
        rating: data.rating,
        comment: data.comment,
        user: { name: user?.name || "Usuário" },
        created_at: new Date().toISOString()
      };

      setReviews(prev => [...prev, reviewData]);
      toast.success('Avaliação enviada com sucesso!');
      resetReview();
      setShowReviewForm(false);
    } catch (error) {
      console.error("Erro ao enviar avaliação:", error);
      toast.error('Erro ao enviar avaliação');
    }
  };

  const onSubmitLogin = async (data: LoginFormData) => {
    if (!cognitiveValid) {
      toast.error('Complete o desafio de segurança antes de enviar');
      return;
    }

    try {
      const success = await signIn(data);
      if (success) {
        toast.success('Login realizado com sucesso!');
        setShowLoginModal(false);
        resetLogin();

        if (activeTab === 'reviews') {
          setShowReviewForm(true);
        }
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao autenticar');
    }
  };

  // Helpers
  const formatPrice = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  // Agrupar opções de variantes
  // Agrupa todos os valores possíveis por atributo
  const allOptions = useMemo(() => {
    if (!product?.variants?.length) return {};

    const optionsMap: Record<string, Set<string>> = {};

    product.variants.forEach(variant => {
      variant.variantAttribute?.forEach(attr => {
        if (!optionsMap[attr.key]) {
          optionsMap[attr.key] = new Set();
        }
        optionsMap[attr.key].add(attr.value);
      });
    });

    return optionsMap;
  }, [product]);

  // Calcula opções disponíveis
  const availableOptions = useMemo(() => {
    if (!product?.variants?.length) return {};

    const availableMap: Record<string, Set<string>> = {};

    Object.keys(allOptions).forEach(key => {
      availableMap[key] = new Set();

      allOptions[key].forEach(value => {
        const isAvailable = product.variants!.some(variant => {
          // Verifica se a variante tem o atributo atual
          const hasCurrentAttr = variant.variantAttribute?.some(
            a => a.key === key && a.value === value
          );

          if (!hasCurrentAttr) return false;

          // Verifica compatibilidade com outras seleções
          return Object.entries(selectedAttributes).every(([k, v]) => {
            if (k === key) return true; // Ignora o atributo atual
            return variant.variantAttribute?.some(a => a.key === k && a.value === v);
          });
        });

        if (isAvailable) {
          availableMap[key].add(value);
        }
      });
    });

    return availableMap;
  }, [allOptions, selectedAttributes, product]);

  // Selecionar atributo
  const handleAttributeSelect = (key: string, value: string) => {
    // Verifica se a opção está disponível
    if (!availableOptions[key]?.has(value)) return;

    // Cria novo conjunto de atributos selecionados
    const newAttributes = { ...selectedAttributes, [key]: value };

    // Encontra variantes compatíveis
    const matchingVariants = product!.variants!.filter(variant => {
      return Object.entries(newAttributes).every(([k, v]) =>
        variant.variantAttribute?.some(a => a.key === k && a.value === v)
      );
    });

    // Se encontrou exatamente uma variante compatível
    if (matchingVariants.length === 1) {
      const matchedVariant = matchingVariants[0];
      setSelectedVariant(matchedVariant);

      // Sincroniza todos os atributos com a variante encontrada
      const syncedAttributes: Record<string, string> = {};
      matchedVariant.variantAttribute?.forEach(a => {
        syncedAttributes[a.key] = a.value;
      });

      setSelectedAttributes(syncedAttributes);
      setSelectedImageIndex(0);
    } else {
      // Atualiza apenas o atributo selecionado
      setSelectedAttributes(newAttributes);
    }
  };

  // Imagens atuais
  const getCurrentImages = () =>
    selectedVariant?.productVariantImage?.length
      ? selectedVariant.productVariantImage
      : product?.images || [];

  const hasDiscount =
    !!selectedVariant && selectedVariant.price_per! < selectedVariant.price_of!;
  const discount = hasDiscount
    ? Math.round(
      ((selectedVariant.price_of! - selectedVariant.price_per!) /
        selectedVariant.price_of!) *
      100
    )
    : 0;
  const stockAvailable =
    selectedVariant?.stock != null
      ? selectedVariant.stock
      : product?.stock ?? 0;

  // Produtos relacionados
  const relatedProducts: ProductFormData[] = [
    ...(product?.productRelations?.map(r => r.relatedProduct) || []),
    ...(product?.parentRelations?.map(r => r.childProduct) || []),
    ...(product?.childRelations?.map(r => r.childProduct) || []),
  ];

  // Manipulação de quantidade
  const handleQuantityChange = (delta: number) =>
    setQuantity(q => Math.min(Math.max(q + delta, 1), stockAvailable));

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
        product.buyTogether.product.map(p => addItem(p.id!, togetherQty[p.id!] || 1)
        ));
      toast.success("Todos os itens de 'Compre Junto' adicionados!");
    } catch {
      toast.error("Erro ao adicionar grupo.");
    } finally {
      setAdding(false);
    }
  };

  // Promoção principal
  const promo = product?.mainPromotion;

  // Loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600"></div>
      </div>
    );
  }

  // Renderização principal
  return (
    <>
      <NavbarStore />
      <div className="bg-gray-50 min-h-screen p-4">
        <ViewCounter product_id={product?.id!} />

        <Breadcrumb product={product!} />

        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">

            <ProductGallery
              product={product!}
              selectedVariant={selectedVariant}
              selectedImageIndex={selectedImageIndex}
              setSelectedImageIndex={setSelectedImageIndex}
              setIsZoomed={setIsZoomed}
              API_URL={API_URL}
            />

            <div className="space-y-6">
              <ProductInfo
                product={product!}
                selectedVariant={selectedVariant}
                formatPrice={formatPrice}
                hasDiscount={hasDiscount}
                discount={discount}
              />

              {product?.variants && product.variants.length > 0 && Object.keys(allOptions).length > 0 && (
                <VariantsSelector
                  allOptions={allOptions}
                  availableOptions={availableOptions}
                  selectedAttributes={selectedAttributes}
                  handleAttributeSelect={handleAttributeSelect}
                />
              )}

              {relatedProducts.length > 0 && (
                <RelatedProducts products={relatedProducts} />
              )}

              <QuantitySelector
                quantity={quantity}
                handleQuantityChange={handleQuantityChange}
                stockAvailable={stockAvailable}
              />

              <ActionButtons
                product={product!}
                quantity={quantity}
                stockAvailable={stockAvailable}
                adding={adding}
                handleAddToCart={handleAddToCart}
                isFavorite={isFavorite}
                toggleFavorite={toggleFavorite}
                showShareMenu={showShareMenu}
                setShowShareMenu={setShowShareMenu}
                shareProduct={shareProduct}
              />

              <Benefits />
            </div>
          </div>

          {product?.buyTogether?.product && (
            <BuyTogether
              buyTogether={product.buyTogether}
              togetherQty={togetherQty}
              changeTogetherQty={changeTogetherQty}
              addAllTogether={addAllTogether}
              adding={adding}
              API_URL={API_URL}
              onAddItem={addItem}
            />
          )}

          {promo && <PromotionSection promo={promo} />}

          <ProductTabs
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            product={product!}
            expandedDescription={expandedDescription}
            setExpandedDescription={setExpandedDescription}
            selectedVariant={selectedVariant}
            reviews={reviews}
            showReviewForm={showReviewForm}
            setShowReviewForm={setShowReviewForm}
            isAuthenticated={isAuthenticated}
            registerReview={registerReview}
            handleSubmitReview={handleSubmitReview}
            reviewErrors={reviewErrors}
            submitReview={submitReview}
            setShowLoginModal={setShowLoginModal}
          />
        </div>

        {isZoomed && (
          <ZoomModal
            currentImages={getCurrentImages()}
            selectedImageIndex={selectedImageIndex}
            setSelectedImageIndex={setSelectedImageIndex} // Mantemos assim
            setIsZoomed={setIsZoomed}
            API_URL={API_URL}
          />
        )}

        {showLoginModal && (
          <LoginModal
            setShowLoginModal={setShowLoginModal}
            handleSubmitLogin={handleSubmitLogin}
            registerLogin={registerLogin}
            loginErrors={loginErrors}
            cognitiveValid={cognitiveValid}
            setCognitiveValid={setCognitiveValid}
            onSubmitLogin={onSubmitLogin}
            router={router}
          />
        )}
      </div>
      <FooterStore />
    </>
  );
}