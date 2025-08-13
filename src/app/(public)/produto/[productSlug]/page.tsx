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
import RelatedProducts from "@/app/components/pageProduct/RelatedProducts";
import { LoginFormData, ReviewFormData } from "Types/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const STORAGE_KEY = "recently_viewed";
const FAVORITES_KEY = "favorites";

export default function ProductPage({ params }: { params: Promise<{ productSlug: string }> }) {
  const router = useRouter();
  const { productSlug } = React.use(params);

  const { signIn, isAuthenticated, user } = useContext(AuthContextStore);
  const { addItem, cart } = useCart();

  const [product, setProduct] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<any | null>(null);
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
  const [attributeImages, setAttributeImages] = useState<Record<string, { value: string; imageUrl: string }[]>>({});
  const [overrideMainImage, setOverrideMainImage] = useState<string | null>(null);

  // Forms
  const { register: registerLogin, handleSubmit: handleSubmitLogin, formState: { errors: loginErrors }, reset: resetLogin } = useForm<LoginFormData>();
  const { register: registerReview, handleSubmit: handleSubmitReview, formState: { errors: reviewErrors }, reset: resetReview } = useForm<ReviewFormData>();

  useEffect(() => {
    async function load() {
      const api = setupAPIClient();
      setLoading(true);
      try {
        const { data } = await api.get(`/product/page?productSlug=${productSlug}`);
        const prod: any = data;

        // --- Se buyTogether.products for array de ids -> buscar via batch
        if (prod.buyTogether?.products && Array.isArray(prod.buyTogether.products) && prod.buyTogether.products.length > 0) {
          try {
            const resp = await api.post("/products/batch", { ids: prod.buyTogether.products });
            prod.buyTogether.product = resp.data || prod.buyTogether.product || [];
          } catch (err) {
            console.warn("Batch buyTogether falhou:", err);
          }
        }

        setProduct(prod);

        // Inicializa atributo imagens (mapear imagens dos atributos)
        const imagesMap: Record<string, Record<string, string>> = {};
        if (prod?.variants && Array.isArray(prod.variants)) {
          prod.variants.forEach((v: any) => {
            v.variantAttribute?.forEach((attr: any) => {
              if (Array.isArray(attr.variantAttributeImage) && attr.variantAttributeImage.length > 0) {
                const imgObj = attr.variantAttributeImage.find((i: any) => i.isPrimary) ?? attr.variantAttributeImage[0];
                if (imgObj?.url) {
                  const url = API_URL ? `${API_URL}/files/${imgObj.url}` : imgObj.url;
                  if (!imagesMap[attr.key]) imagesMap[attr.key] = {};
                  if (!imagesMap[attr.key][attr.value]) imagesMap[attr.key][attr.value] = url;
                }
              }
            });
          });
        }
        const attrImgs: Record<string, { value: string; imageUrl: string }[]> = {};
        Object.entries(imagesMap).forEach(([key, map]) => {
          attrImgs[key] = Object.entries(map).map(([value, url]) => ({ value, imageUrl: url }));
        });
        setAttributeImages(attrImgs);

        // Seleciona primeira variante por padrão (se existirem)
        if (prod.variants?.length) {
          const first = prod.variants[0];
          setSelectedVariant(first);
          const initAttrs: Record<string, string> = {};
          first.variantAttribute?.forEach((a: any) => (initAttrs[a.key] = a.value));
          setSelectedAttributes(initAttrs);
        }

        // Init togetherQty
        if (prod.buyTogether?.product) {
          const initQty: Record<string, number> = {};
          (prod.buyTogether.product as any[]).forEach((p: any) => {
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
    try {
      const arr: string[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      arr.push(product.id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(new Set(arr.reverse())).reverse().slice(-10)));
    } catch (e) {
      console.warn("Não foi possível salvar histórico de visualizações", e);
    }
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

  // Manipulação favoritos, compartilhamento, reviews, login
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

  // Variants helpers
  const allOptions = useMemo(() => {
    if (!product?.variants?.length) return {};

    const optionsMap: Record<string, Set<string>> = {};

    product.variants.forEach((variant: { variantAttribute: any[]; }) => {
      variant.variantAttribute?.forEach((attr: any) => {
        if (!optionsMap[attr.key]) {
          optionsMap[attr.key] = new Set();
        }
        optionsMap[attr.key].add(attr.value);
      });
    });

    return optionsMap;
  }, [product]);

  const availableOptions = useMemo(() => {
    if (!product?.variants?.length) return {};

    const availableMap: Record<string, Set<string>> = {};

    Object.keys(allOptions).forEach(key => {
      availableMap[key] = new Set();

      allOptions[key].forEach(value => {
        const isAvailable = product.variants!.some((variant: { variantAttribute: any[]; }) => {
          const hasCurrentAttr = variant.variantAttribute?.some(
            (a: any) => a.key === key && a.value === value
          );
          if (!hasCurrentAttr) return false;

          return Object.entries(selectedAttributes).every(([k, v]) => {
            if (k === key) return true;
            return variant.variantAttribute?.some((a: any) => a.key === k && a.value === v);
          });
        });

        if (isAvailable) {
          availableMap[key].add(value);
        }
      });
    });

    return availableMap;
  }, [allOptions, selectedAttributes, product]);

  // Ao selecionar atributo (usado pelo VariantsSelector)
  const handleAttributeSelect = (key: string, value: string) => {
    if (!availableOptions[key]?.has(value)) return;

    const newAttributes = { ...selectedAttributes, [key]: value };

    const matchingVariants = product!.variants!.filter((variant: any) =>
      Object.entries(newAttributes).every(([k, v]) => variant.variantAttribute?.some((a: any) => a.key === k && a.value === v))
    );

    if (matchingVariants.length === 1) {
      const matchedVariant = matchingVariants[0];
      setSelectedVariant(matchedVariant);
      const syncedAttributes: Record<string, string> = {};
      matchedVariant.variantAttribute?.forEach((a: any) => { syncedAttributes[a.key] = a.value; });
      setSelectedAttributes(syncedAttributes);
      setSelectedImageIndex(0);
      setOverrideMainImage(null); // reset override para mostrar imagem da variante
    } else {
      setSelectedAttributes(newAttributes);
    }
  };

  const getCurrentImages = () => {
    if (overrideMainImage) return [{ url: overrideMainImage }];
    if (selectedVariant?.productVariantImage?.length) {
      return selectedVariant.productVariantImage.map((i: any) => ({
        url: `${API_URL}/files/${i.url}`,
        alt: i.altText
      }));
    }
    return product?.images?.map((i: any) => ({
      url: `${API_URL}/files/${i.url}`,
      alt: i.altText
    })) || [];
  };

  // Única fonte de verdade para as imagens
  const currentImages = getCurrentImages();

  // Stock & discount logic
  const hasDiscount = !!selectedVariant && selectedVariant.price_per! < selectedVariant.price_of!;
  const discount = hasDiscount ? Math.round(((selectedVariant.price_of! - selectedVariant.price_per!) / selectedVariant.price_of!) * 100) : 0;
  const stockAvailable = selectedVariant?.stock != null ? selectedVariant.stock : product?.stock ?? 0;

  // Produtos relacionados (mesma lógica consolidada)
  const relatedProducts: any[] = (() => {
    if (!product) return [];

    const gathered: any[] = [];

    if (Array.isArray(product.productRelations)) {
      product.productRelations.forEach((r: any) => {
        if (r.relatedProduct) gathered.push(r.relatedProduct);
        if (r.childProduct) gathered.push(r.childProduct);
        if (r.parentProduct) gathered.push(r.parentProduct);
      });
    }

    if (Array.isArray(product.parentRelations)) {
      product.parentRelations.forEach((r: any) => {
        if (r.childProduct) gathered.push(r.childProduct);
        if (r.parentProduct) gathered.push(r.parentProduct);
        if (r.relatedProduct) gathered.push(r.relatedProduct);
      });
    }

    if (Array.isArray(product.childRelations)) {
      product.childRelations.forEach((r: any) => {
        if (r.childProduct) gathered.push(r.childProduct);
        if (r.parentProduct) gathered.push(r.parentProduct);
        if (r.relatedProduct) gathered.push(r.relatedProduct);
      });
    }

    try {
      const fromDirectMaps = [
        ...(product.productRelations?.map((r: any) => r.relatedProduct) || []),
        ...(product.parentRelations?.map((r: any) => r.childProduct) || []),
        ...(product.childRelations?.map((r: any) => r.childProduct) || []),
      ];
      gathered.push(...fromDirectMaps);
    } catch (e) {
      // noop
    }

    const seen = new Set<string>();
    const filtered: any[] = [];

    for (const p of gathered) {
      if (!p || !p.id) continue;
      if (product?.id && p.id === product.id) continue; // remove próprio produto
      if (seen.has(p.id)) continue; // dedupe
      seen.add(p.id);
      filtered.push(p);
    }

    return filtered;
  })();

  // Trocar quantidade
  const handleQuantityChange = (delta: number) =>
    setQuantity(q => Math.min(Math.max(q + delta, 1), (selectedVariant?.stock ?? product?.stock ?? 1)));

  // Adicionar ao carrinho (envia variant_id quando existir)
  const handleAddToCart = async () => {
    if (!product) return;
    setAdding(true);
    try {
      await addItem(product.id, quantity, selectedVariant?.id ?? null);
      toast.success(`"${product.name}" adicionado!`);
      setQuantity(1);
    } catch (err) {
      toast.error("Erro ao adicionar.");
    } finally {
      setAdding(false);
    }
  };

  // Compre junto: changeTogetherQty usa stock do item específico
  function changeTogetherQty(id: string, delta: number) {
    const p = product?.buyTogether?.product?.find((x: any) => x.id === id);
    const max = p?.stock ?? 999999;

    setTogetherQty(prev => {
      const old = prev[id] || 1;
      const next = Math.min(Math.max(old + delta, 1), max);
      return { ...prev, [id]: next };
    });
  }

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
        <Breadcrumb product={product!} />

        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <ProductGallery
              product={product!}
              selectedVariant={selectedVariant}
              selectedImageIndex={selectedImageIndex}
              setSelectedImageIndex={setSelectedImageIndex}
              setIsZoomed={setIsZoomed}
              currentImages={currentImages}
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
                  attributeImages={attributeImages}
                  onImageChange={(url: string | null) => setOverrideMainImage(url)}
                  // Novas props para exibir promo de variante dentro do selector
                  selectedVariant={selectedVariant}
                  product={product}
                  formatPrice={formatPrice}
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

          {product?.buyTogether?.product && product.buyTogether.product.length > 0 && (
            <BuyTogether
              buyTogether={product.buyTogether}
              togetherQty={togetherQty}
              changeTogetherQty={changeTogetherQty}
              adding={adding}
              API_URL={API_URL}
              onAddItem={addItem}
            />
          )}

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
            currentImages={currentImages}
            selectedImageIndex={selectedImageIndex}
            setSelectedImageIndex={setSelectedImageIndex}
            setIsZoomed={setIsZoomed}
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