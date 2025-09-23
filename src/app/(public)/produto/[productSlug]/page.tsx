"use client";

import React, { useEffect, useState, useMemo, useContext, useCallback } from "react";
import { useFavorites } from "@/app/contexts/FavoritesContext";
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
import ProductTabs from "@/app/components/pageProduct/ProductTabs";
import ZoomModal from "@/app/components/pageProduct/ZoomModal";
import LoginModal from "@/app/components/pageProduct/LoginModal";
import RelatedProducts from "@/app/components/pageProduct/RelatedProducts";
import { LoginFormData, ReviewFormData } from "Types/types";
import ShippingEstimator, { ShippingOption } from "@/app/components/pageProduct/ShippingEstimator";
import Highlights from "@/app/components/highlights";
import ProductQuestions from "@/app/components/pageProduct/productQuestions";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const STORAGE_KEY = "recently_viewed";

/**
 * ProductPage completo — integra sua lógica original e corrige favoritos/localStorage.
 */
export default function ProductPage({ params }: { params: Promise<{ productSlug: string }> }) {

  const router = useRouter();
  const { productSlug } = React.use(params);

  const { signIn, isAuthenticated, user } = useContext(AuthContextStore);
  const { addItem } = useCart();
  const { isFavorite, toggle } = useFavorites();

  const [product, setProduct] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<any | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [expandedDescription, setExpandedDescription] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"description" | "specifications" | "reviews">("description");
  const [isZoomed, setIsZoomed] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [cognitiveValid, setCognitiveValid] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [togetherQty, setTogetherQty] = useState<Record<string, number>>({});
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});
  const [attributeImages, setAttributeImages] = useState<Record<string, { value: string; imageUrl: string }[]>>({});
  const [overrideMainImage, setOverrideMainImage] = useState<string | null>(null);
  const [productShipping, setProductShipping] = useState<ShippingOption | null>(null);

  const handleProductShipping = useCallback((opt: React.SetStateAction<ShippingOption | null>) => setProductShipping(opt), [setProductShipping]);

  // Forms
  const { register: registerLogin, handleSubmit: handleSubmitLogin, formState: { errors: loginErrors }, reset: resetLogin } = useForm<LoginFormData>();
  const {
    register: registerReview,
    handleSubmit: handleSubmitReview,
    formState: { errors: reviewErrors },
    reset: resetReview,
    control,
    watch
  } = useForm<ReviewFormData>({
    defaultValues: {
      rating: 0,
      comment: ""
    }
  });

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

        // normalize reviews
        if (Array.isArray(prod.reviews)) {
          const ratingEnumToNumber = (r: any) => {
            if (typeof r === 'number') return r;
            if (!r) return 0;
            switch (String(r).toUpperCase()) {
              case 'ONE': return 1;
              case 'TWO': return 2;
              case 'THREE': return 3;
              case 'FOUR': return 4;
              case 'FIVE': return 5;
              default: return 0;
            }
          };
          const normalized = prod.reviews.map((rv: any) => ({ ...rv, rating: ratingEnumToNumber(rv.rating) }));
          setReviews(normalized);
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

  // compartilhar, reviews, login etc (mantive sua implementação original)
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
    const api = setupAPIClient();

    if (!isAuthenticated || !product?.id) {
      setShowLoginModal(true);
      return;
    }

    try {
      const reviewData = {
        product_id: product.id,
        rating: data.rating,
        comment: data.comment,
        customer_id: user?.id,
        nameCustomer: user?.name
      };

      const response = await api.post('/review/create', reviewData);
      const createdReview = response.data;

      const ratingEnumToNumber = (r: any) => {
        if (typeof r === 'number') return r;
        if (!r) return 0;
        switch (String(r).toUpperCase()) {
          case 'ONE': return 1;
          case 'TWO': return 2;
          case 'THREE': return 3;
          case 'FOUR': return 4;
          case 'FIVE': return 5;
          default: return 0;
        }
      };

      const normalised = {
        ...createdReview,
        rating: ratingEnumToNumber(createdReview.rating),
        user: { name: createdReview.nameCustomer || user?.name }
      };

      setReviews(prev => [...prev, normalised]);
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

  // Helpers e outras lógicas de variants/imagens/relatedProducts — mantive a sua implementação original (abaixo, repetida/adaptada)

  const formatPrice = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

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
      setOverrideMainImage(null);
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

  const currentImages = getCurrentImages();

  const hasDiscount = !!selectedVariant && selectedVariant.price_per! < selectedVariant.price_of!;
  const discount = hasDiscount ? Math.round(((selectedVariant.price_of! - selectedVariant.price_per!) / selectedVariant.price_of!) * 100) : 0;

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
    } catch (e) { }

    const seen = new Set<string>();
    const filtered: any[] = [];

    for (const p of gathered) {
      if (!p || !p.id) continue;
      if (product?.id && p.id === product.id) continue;
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      filtered.push(p);
    }

    return filtered;
  })();

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

  const productIsFavorite = product?.id ? isFavorite(product.id) : false;

  const handleToggleFavorite = async () => {
    if (!product?.id) return;
    await toggle(product.id);
  };

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
                handleQuantityChange={(delta: number) =>
                  setQuantity(q => Math.min(Math.max(q + delta, 1), (selectedVariant?.stock ?? product?.stock ?? 1)))
                }
                stockAvailable={selectedVariant?.stock ?? product?.stock ?? 0}
              />

              <div className="mt-4">
                <ShippingEstimator
                  product={product}
                  selectedVariant={selectedVariant}
                  quantity={quantity}
                  onShippingSelect={handleProductShipping}
                />
                {productShipping && (
                  <div className="mt-2 text-sm text-gray-700">
                    <strong>Frete estimado:</strong> {formatPrice(productShipping.price)} ·{" "}
                    <span className="text-gray-500">{productShipping.deliveryTime}</span>
                  </div>
                )}
              </div>

              <ActionButtons
                product={product!}
                quantity={quantity}
                stockAvailable={selectedVariant?.stock ?? product?.stock ?? 0}
                adding={adding}
                handleAddToCart={async () => {
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
                }}
                isFavorite={productIsFavorite}
                toggleFavorite={handleToggleFavorite}
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
            control={control}
            watch={watch}
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

        <ProductQuestions
          productId={product?.id}
          onRequestLogin={() => setShowLoginModal(true)}
          initialPageSize={5}
        />

        <Highlights />
      </div>
      <FooterStore />
    </>
  );
}