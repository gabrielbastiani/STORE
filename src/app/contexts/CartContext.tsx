// app/contexts/CartContext.tsx (atualizado com captura de imagens de variante/atributo)
"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  fetchCart,
  apiAddItem,
  apiUpdateItem,
  apiRemoveItem,
  apiClearCart,
} from "@/services/cart";
import axios from "axios";
import { Cart, CartItem, SelectedOption } from "Types/types";

interface CartContextValue {
  cart: Cart;
  cartCount: number;
  loading: boolean;
  addItem: (productId: string, quantity?: number, variantId?: string | null) => Promise<void>;
  updateItem: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
}

export const CartContext = createContext<CartContextValue | undefined>(
  undefined
);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart>({
    id: undefined,
    items: [],
    subtotal: 0,
    shippingCost: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);

  const productAPI = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL,
  });

  // recalcula subtotal + total
  function recalc(items: CartItem[], shippingCost = cart.shippingCost ?? 0): Cart {
    const subtotal = items.reduce((sum, i) => sum + (i.price ?? 0) * (i.quantity ?? 0), 0);
    const total = subtotal + (shippingCost ?? 0);
    return {
      id: cart.id,
      items,
      subtotal,
      shippingCost,
      total,
    };
  }

  // helper para extrair url de vários formatos
  const extractUrl = (maybe: any): string => {
    if (!maybe) return "";
    if (typeof maybe === "string") return maybe;
    if (Array.isArray(maybe)) {
      if (maybe.length === 0) return "";
      const first = maybe[0];
      if (typeof first === "string") return first;
      if (first?.url) return first.url;
    }
    if (maybe.url) return maybe.url;
    return "";
  };

  // Normaliza um item do backend/guest para o CartItem usado pela UI,
  // procurando também imagens de variante e imagens de atributos.
  function normalizeItem(raw: any): CartItem {
    if (!raw) {
      return {
        id: `${Date.now()}-${Math.random()}`,
        product_id: "",
        name: "Produto",
        images: "",
        variantImage: null,
        attributeImages: [],
        price: 0,
        quantity: 1,
        weight: 0,
        length: 0,
        width: 0,
        height: 0,
        variant_id: null,
        variant_sku: null,
        variant_name: null,
        selectedOptions: [],
      };
    }

    const variantObj = raw.variant || raw.productVariant || raw.product_variant || null;
    const productObj = raw.product || raw.product_data || null;

    // imagem principal escolhida:
    const variantImage =
      extractUrl(variantObj?.productVariantImage ?? variantObj?.productVariantImage) ||
      extractUrl(variantObj?.productVariantImage) ||
      extractUrl(variantObj?.image) ||
      null;

    const mainImage =
      extractUrl(raw.images) ||
      extractUrl(productObj?.images) ||
      null;

    // selectedOptions: tenta extrair de diferentes chaves e anexa imagem se possível
    let selectedOptions: SelectedOption[] = [];

    // 1) se variantObj.variantAttribute existe (modelo Prisma), pode conter imagens
    if (variantObj?.variantAttribute && Array.isArray(variantObj.variantAttribute)) {
      selectedOptions = variantObj.variantAttribute.map((a: any) => {
        // cada variantAttribute pode ter relação variantAttributeImage[]
        // procurar imagens: a.variantAttributeImage[*].url ou a.existingImages
        let optImage = null;
        if (Array.isArray(a?.variantAttributeImage) && a.variantAttributeImage.length > 0) {
          optImage = extractUrl(a.variantAttributeImage[0]?.url ?? a.variantAttributeImage[0]);
        } else if (Array.isArray(a?.existingImages) && a.existingImages.length > 0) {
          optImage = extractUrl(a.existingImages[0]?.url ?? a.existingImages[0]);
        } else if (a?.image) {
          optImage = extractUrl(a.image);
        }
        return {
          name: a.key ?? a.name ?? "Opção",
          value: a.value ?? a.val ?? String(a.value ?? ""),
          image: optImage ?? null,
        };
      });
    }

    // 2) fallback: raw.selectedOptions / raw.options / raw.attributes
    if ((!selectedOptions || selectedOptions.length === 0) && (raw.selectedOptions || raw.options || raw.attributes)) {
      const maybe = raw.selectedOptions ?? raw.options ?? raw.attributes;
      if (Array.isArray(maybe)) {
        selectedOptions = maybe.map((o: any) => {
          if (typeof o === "string") {
            const parts = o.split(":").map((s) => s.trim());
            return { name: parts[0] ?? "Opção", value: parts[1] ?? o, image: null };
          }
          // se houver imagem atrelada à opção
          const optImg =
            extractUrl(o.image) ||
            extractUrl(o.img) ||
            extractUrl(o.icon) ||
            (o.existingImages && extractUrl(o.existingImages[0]));
          return { name: o.name ?? o.key ?? "Opção", value: o.value ?? o.option_value ?? String(o.value ?? ""), image: optImg || null };
        });
      } else if (typeof maybe === "object" && maybe !== null) {
        selectedOptions = Object.entries(maybe).map(([k, v]) => ({ name: k, value: String(v), image: null }));
      }
    }

    // attributeImages: coleta imagens associadas às opções (não duplicando)
    const attributeImagesSet = new Set<string>();
    selectedOptions.forEach((opt) => {
      if (opt.image) attributeImagesSet.add(opt.image);
    });

    // adicional: verificar se variantObj.variantAttributeImage (lista geral) existe
    if (variantObj?.productVariantImage && Array.isArray(variantObj.productVariantImage)) {
      variantObj.productVariantImage.forEach((pi: any) => {
        const url = extractUrl(pi?.url ?? pi);
        if (url) attributeImagesSet.add(url);
      });
    }

    // procurar imagens atreladas ao variantAttribute (sevieram em outro formato)
    if (variantObj?.variantAttribute && Array.isArray(variantObj.variantAttribute)) {
      variantObj.variantAttribute.forEach((a: any) => {
        if (Array.isArray(a.variantAttributeImage)) {
          a.variantAttributeImage.forEach((ai: any) => {
            const url = extractUrl(ai?.url ?? ai);
            if (url) attributeImagesSet.add(url);
          });
        }
        if (Array.isArray(a.existingImages)) {
          a.existingImages.forEach((ei: any) => {
            const url = extractUrl(ei?.url ?? ei);
            if (url) attributeImagesSet.add(url);
          });
        }
      });
    }

    const attributeImages = Array.from(attributeImagesSet);

    // build normalized
    const normalized: CartItem = {
      id: raw.id ?? raw.item_id ?? `${Date.now()}-${Math.random()}`,
      product_id: raw.product_id ?? raw.productId ?? productObj?.id ?? "",
      name: raw.name ?? productObj?.name ?? "Produto",
      images: mainImage ?? "",
      variantImage: variantImage ?? null,
      attributeImages: attributeImages ?? [],
      price: Number(raw.price ?? raw.unit_price ?? variantObj?.price_per ?? productObj?.price_per ?? 0),
      quantity: Number(raw.quantity ?? raw.qty ?? 1),
      weight: Number(raw.weight ?? productObj?.weight ?? variantObj?.weight ?? 0),
      length: Number(raw.length ?? productObj?.length ?? variantObj?.length ?? 0),
      width: Number(raw.width ?? productObj?.width ?? variantObj?.width ?? 0),
      height: Number(raw.height ?? productObj?.height ?? variantObj?.height ?? 0),
      variant_id: variantObj?.id ?? raw.variant_id ?? raw.variantId ?? null,
      variant_sku: variantObj?.sku ?? raw.variant_sku ?? raw.sku ?? null,
      variant_name:
        variantObj?.name ??
        raw.variant_name ??
        (selectedOptions && selectedOptions.length > 0 ? selectedOptions.map((s) => `${s.name}:${s.value}`).join(" / ") : null) ??
        null,
      selectedOptions: selectedOptions ?? [],
    };

    return normalized;
  }

  // load cart
  useEffect(() => {
    async function load() {
      try {
        const backendCart = await fetchCart();
        if (backendCart && Array.isArray(backendCart.items)) {
          backendCart.items = backendCart.items.map(normalizeItem);
          backendCart.subtotal = Number(backendCart.subtotal ?? backendCart.items.reduce((s: any, it: any) => s + (it.price ?? 0) * (it.quantity ?? 0), 0));
          backendCart.total = Number(backendCart.total ?? backendCart.subtotal ?? 0);
        }
        setCart(backendCart ?? { id: undefined, items: [], subtotal: 0, shippingCost: 0, total: 0 });
      } catch {
        const guest = localStorage.getItem("guest_cart");
        if (guest) {
          try {
            const parsed = JSON.parse(guest);
            parsed.items = (parsed.items || []).map(normalizeItem);
            parsed.subtotal = Number(parsed.subtotal ?? parsed.items.reduce((s: any, it: any) => s + (it.price ?? 0) * (it.quantity ?? 0), 0));
            parsed.total = Number(parsed.total ?? parsed.subtotal ?? 0);
            setCart(parsed);
          } catch {
            setCart({ id: undefined, items: [], subtotal: 0, shippingCost: 0, total: 0 });
          }
        } else {
          setCart({ id: undefined, items: [], subtotal: 0, shippingCost: 0, total: 0 });
        }
      } finally {
        setLoading(false);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // persist guest cart
  useEffect(() => {
    if (!cart?.id) {
      try {
        localStorage.setItem("guest_cart", JSON.stringify(cart));
      } catch {
        // ignore
      }
    }
  }, [cart]);

  // addItem (guest + backend)
  const addItem = async (productId: string, quantity = 1, variantId?: string | null) => {
    setLoading(true);
    try {
      if (cart?.id) {
        const updated = await apiAddItem(productId, quantity, variantId ?? undefined);
        if (updated && Array.isArray(updated.items)) {
          updated.items = updated.items.map(normalizeItem);
        }
        setCart(updated);
      } else {
        const exists = cart.items.find((i) => i.product_id === productId && (i.variant_id ?? null) === (variantId ?? null));
        let items: CartItem[] = [];

        if (exists) {
          items = cart.items.map((i) =>
            i.product_id === productId && (i.variant_id ?? null) === (variantId ?? null)
              ? { ...i, quantity: i.quantity + quantity }
              : i
          );
        } else {
          const { data: prod } = await productAPI.get<any>(`/product/unique/data?product_id=${productId}`);

          let chosenVariant: any = null;
          if (variantId && Array.isArray(prod?.variants)) {
            chosenVariant = prod.variants.find((v: any) => v.id === variantId) ?? null;
          }

          // variant image (try several places)
          const variantImage =
            extractUrl(chosenVariant?.productVariantImage) ||
            extractUrl(chosenVariant?.image) ||
            null;

          const mainImage =
            extractUrl(prod?.images) ||
            "";

          // selectedOptions from variant
          let selectedOptions: SelectedOption[] = [];
          if (chosenVariant?.variantAttribute && Array.isArray(chosenVariant.variantAttribute)) {
            selectedOptions = chosenVariant.variantAttribute.map((a: any) => {
              const optImg =
                extractUrl(a?.variantAttributeImage?.[0]) ||
                extractUrl(a?.existingImages?.[0]) ||
                extractUrl(a?.image) ||
                null;
              return {
                name: a.key ?? a.name ?? "Opção",
                value: a.value ?? a.val ?? String(a.value ?? ""),
                image: optImg ?? null,
              };
            });
          } else if (chosenVariant?.attributes && Array.isArray(chosenVariant.attributes)) {
            selectedOptions = chosenVariant.attributes.map((a: any) => ({
              name: a.key ?? a.name ?? "Opção",
              value: a.value ?? a.val ?? String(a.value ?? ""),
              image: extractUrl(a?.image) || null,
            }));
          } else if (prod?.selected_options && Array.isArray(prod.selected_options)) {
            selectedOptions = prod.selected_options.map((o: any) => ({ name: o.name ?? "Opção", value: o.value ?? String(o.value ?? ""), image: null }));
          }

          // attributeImages: collect from selectedOptions images and variant/product images
          const attributeImagesSet = new Set<string>();
          selectedOptions.forEach((s) => { if (s.image) attributeImagesSet.add(s.image); });
          if (chosenVariant?.variantAttribute) {
            chosenVariant.variantAttribute.forEach((a: any) => {
              if (Array.isArray(a.variantAttributeImage)) {
                a.variantAttributeImage.forEach((ai: any) => attributeImagesSet.add(extractUrl(ai) || ""));
              }
              if (Array.isArray(a.existingImages)) {
                a.existingImages.forEach((ei: any) => attributeImagesSet.add(extractUrl(ei) || ""));
              }
            });
          }
          if (chosenVariant?.productVariantImage) {
            chosenVariant.productVariantImage.forEach((pi: any) => attributeImagesSet.add(extractUrl(pi) || ""));
          }

          const attributeImages = Array.from(attributeImagesSet).filter(Boolean);

          const price = chosenVariant?.price_per ?? prod?.price_per ?? 0;

          const newItem: CartItem = {
            id: typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
            product_id: productId,
            name: prod?.name ?? "Produto",
            images: mainImage ?? "",
            variantImage: variantImage ?? null,
            attributeImages,
            price: Number(price ?? 0),
            quantity,
            weight: prod?.weight ?? 0,
            length: prod?.length ?? 0,
            width: prod?.width ?? 0,
            height: prod?.height ?? 0,
            variant_id: chosenVariant?.id ?? null,
            variant_sku: chosenVariant?.sku ?? null,
            variant_name: chosenVariant?.name ?? null,
            selectedOptions,
          };

          items = [...cart.items, newItem];
        }

        setCart(recalc(items));
      }
    } finally {
      setLoading(false);
    }
  };

  // updateItem
  const updateItem = async (itemId: string, quantity: number) => {
    setLoading(true);
    try {
      if (cart?.id) {
        const updated = await apiUpdateItem(itemId, quantity);
        if (updated && Array.isArray(updated.items)) {
          updated.items = updated.items.map(normalizeItem);
        }
        setCart(updated);
      } else {
        const items = cart.items.map((i) => (i.id === itemId ? { ...i, quantity } : i));
        setCart(recalc(items));
      }
    } finally {
      setLoading(false);
    }
  };

  // removeItem
  const removeItem = async (itemId: string) => {
    setLoading(true);
    try {
      if (cart?.id) {
        const updated = await apiRemoveItem(itemId);
        if (updated && Array.isArray(updated.items)) {
          updated.items = updated.items.map(normalizeItem);
        }
        setCart(updated);
      } else {
        const items = cart.items.filter((i) => i.id !== itemId);
        setCart(recalc(items));
      }
    } finally {
      setLoading(false);
    }
  };

  // clearCart
  const clearCart = async () => {
    setLoading(true);
    try {
      if (cart?.id) {
        const emptied = await apiClearCart();
        if (emptied && Array.isArray(emptied.items)) {
          emptied.items = emptied.items.map(normalizeItem);
        }
        setCart(emptied);
      } else {
        setCart({ id: undefined, items: [], subtotal: 0, shippingCost: 0, total: 0 });
      }
    } finally {
      setLoading(false);
    }
  };

  const cartCount = (cart.items || []).reduce((sum, i) => sum + (i.quantity ?? 0), 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        cartCount,
        loading,
        addItem,
        updateItem,
        removeItem,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}