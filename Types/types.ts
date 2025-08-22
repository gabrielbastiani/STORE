// types.ts - versão revisada e consolidada

/* -------------------- Básicos / Notificações -------------------- */

export interface Notification {
  id: string;
  message: string;
  created_at: string;
  href?: string;
  read: boolean;
  type: string;
}

/* -------------------- Categoria -------------------- */

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  image?: string | null;
  order?: number;
  parentId?: string | null;
  children?: Category[];
  promotion_id?: string | null;
  filterId?: string | null;
  selected?: boolean;
  indeterminate?: boolean;
  created_at?: string;
}

/* -------------------- Imagens / Vídeos -------------------- */

export interface ImageRecord {
  id: string;
  url: string;
  altText?: string | null;
  isPrimary?: boolean;
}

export interface VideoInput {
  url: string;
  isPrimary?: boolean;
  thumbnail?: string;
}

/* -------------------- Variantes / Atributos -------------------- */

export type StatusProduct = "DISPONIVEL" | "INDISPONIVEL";
export type StatusDescription = "DISPONIVEL" | "INDISPONIVEL";

export interface VariantAttribute {
  id?: string;
  key: string;
  value: string;
  status?: StatusProduct;
  images?: File[]; // novos uploads
  existingImages?: ImageRecord[]; // imagens persistidas
  newImages?: File[]; // arquivos temporários
}

/* ---------- Variant form used in admin / front ---------- */
export interface VariantFormData {
  id: string;
  sku: string;
  price_of?: number | null;
  price_per?: number | null;
  stock?: number;
  sortOrder?: number;
  ean?: string | null;
  mainPromotion_id?: string | null;
  allowBackorders?: boolean;
  attributes?: VariantAttribute[];
  images?: File[]; // arquivos sendo enviados
  product_id?: string;
  created_at?: string;
  productVariantVideo?: any[]; // estrutura livre conforme seu backend
  variantAttributes?: VariantAttribute[];
  videos?: VideoInput[];
  videoLinks?: VideoInput[];
  existingImages?: ImageRecord[];
  newImages?: File[];
  newVideos?: VideoInput[];
  productVariantImage?: { url: string; altText?: string }[];
  variantAttribute?: { key: string; value: string }[];
  mainPromotion?: Promotion | null;
}

/* ------------- Simplified variant model (payloads) ------------- */
export interface ProductVariant {
  id?: string;
  product_id?: string;
  created_at?: string;
  sku?: string;
  price_of?: number | null;
  price_per?: number | null;
  stock?: number;
  sortOrder?: number;
  ean?: string | null;
  mainPromotion_id?: string | null;
  allowBackorders?: boolean;
  attributes?: VariantAttribute[];
  images?: ImageRecord[];
  videoLinks?: string[];
  productVariantImage?: { url: string; altText?: string }[];
  variantAttribute?: { key: string; value: string }[];
  mainPromotion?: Promotion | null;
}

/* -------------------- Product -------------------- */

export interface ProductSummary {
  id: string;
  name?: string | null;
}

export interface ProductFormData {
  created_at?: string | number | Date;
  primaryImage?: string;
  featuredProducts?: ProductSummary[]; // corrigido: opcional
  id?: string;
  relations?: any;
  name: string;
  slug?: string;
  description?: string;
  brand?: string | null;
  ean?: string | null;
  skuMaster?: string | null;
  status: StatusProduct;
  price_of?: number | null;
  price_per?: number;
  stock?: number;
  weight?: number | null;
  length?: number | null;
  width?: number | null;
  height?: number | null;
  categories: Array<string | { id: string; name?: string }>;
  mainPromotion_id?: string | null;
  mainPromotion?: Promotion | null;
  buyTogether_id?: string | null;
  images: ImageRecord[];
  videos?: VideoInput[];
  variants?: VariantFormData[];
  productsDescriptions?: { id?: string; title?: string; description?: string; status?: StatusDescription }[];
  metaTitle?: string | null;
  metaDescription?: string | null;
  keywords?: string[] | null;
  videoLinks?: string[] | VideoInput[];
  existingImages?: ImageRecord[];
  newImages?: File[];
  buyTogether?: { id: string; name: string; products?: ProductFormData[] } | null;
  productRelations?: Array<{ relatedProduct: ProductFormData }>;
  parentRelations?: Array<{ childProduct: ProductFormData }>;
  childRelations?: Array<{ childProduct: ProductFormData }>;
}

/* -------------------- initial form -------------------- */

export const initialFormData: ProductFormData = {
  id: "",
  name: "",
  slug: "",
  description: "",
  status: "DISPONIVEL",
  price_per: 0,
  price_of: 0,
  metaTitle: undefined,
  metaDescription: undefined,
  keywords: undefined,
  brand: undefined,
  ean: undefined,
  skuMaster: undefined,
  weight: undefined,
  length: undefined,
  width: undefined,
  height: undefined,
  stock: undefined,
  categories: [],
  images: [],
  videos: [],
  productsDescriptions: [],
  relations: [],
  variants: [] as VariantFormData[],
  videoLinks: [],
  newImages: [],
  mainPromotion_id: undefined,
  buyTogether_id: undefined,
  existingImages: [],
  featuredProducts: [],
  primaryImage: "",
  created_at: ""
};

/* -------------------- Relation / form helpers -------------------- */

export interface RelationFormData {
  parentId?: string;
  childId?: string;
  relationType?: "VARIANT" | "SIMPLE";
  sortOrder?: number;
  isRequired?: boolean;
}

export type PromotionOption = { id: string; name: string };

/* -------------------- Promotion related enums/types -------------------- */

/**
 * Condition / Operator / Action enums
 * - ConditionType e Operator abrangem os tipos que você já usa no DB
 * - Também forneço enums "Apresentacao" (labels em pt-BR) para apresentação
 */

export enum ConditionType {
  FIRST_ORDER = "FIRST_ORDER",
  CART_ITEM_COUNT = "CART_ITEM_COUNT",
  UNIQUE_VARIANT_COUNT = "UNIQUE_VARIANT_COUNT",
  CATEGORY = "CATEGORY",
  ZIP_CODE = "ZIP_CODE",
  PRODUCT_CODE = "PRODUCT_CODE",
  VARIANT_CODE = "VARIANT_CODE",
  STATE = "STATE",
  CATEGORY_ITEM_COUNT = "CATEGORY_ITEM_COUNT",
  CATEGORY_VARIANT_COUNT = "CATEGORY_VARIANT_COUNT",
  CATEGORY_VALUE = "CATEGORY_VALUE",
  BRAND_VALUE = "BRAND_VALUE",
  VARIANT_ITEM_COUNT = "VARIANT_ITEM_COUNT",
  PRODUCT_ITEM_COUNT = "PRODUCT_ITEM_COUNT",
  PERSON_TYPE = "PERSON_TYPE",
  USER = "USER",
  SUBTOTAL_VALUE = "SUBTOTAL_VALUE",
  TOTAL_VALUE = "TOTAL_VALUE",
}

export enum Operator {
  EQUAL = "EQUAL",
  NOT_EQUAL = "NOT_EQUAL",
  GREATER = "GREATER",
  GREATER_EQUAL = "GREATER_EQUAL",
  LESS = "LESS",
  LESS_EQUAL = "LESS_EQUAL",
  CONTAINS = "CONTAINS",
  NOT_CONTAINS = "NOT_CONTAINS",
  EVERY = "EVERY",
}

/* Labels em pt-BR (apresentação) */
export enum ConditionTypeApresentacao {
  FIRST_ORDER = "Se 1ª compra",
  CART_ITEM_COUNT = "Se a quantidade de produtos no carrinho for",
  UNIQUE_VARIANT_COUNT = "Se a quantidade de variantes únicas for",
  CATEGORY = "Se a categoria",
  ZIP_CODE = "Se CEP",
  PRODUCT_CODE = "Se código do produto",
  VARIANT_CODE = "Se código do produto variante",
  STATE = "Se o estado no país for",
  CATEGORY_ITEM_COUNT = "Se na categoria X a quantidade de produtos for X",
  CATEGORY_VALUE = "Se para a categoria X o valor for",
  BRAND_VALUE = "Se para a marca X o valor for",
  VARIANT_ITEM_COUNT = "Se para o produto variante X a quantidade for",
  PRODUCT_ITEM_COUNT = "Se para o produto X a quantidade for",
  PERSON_TYPE = "Se tipo de cadastro (pessoa)",
  USER = "Se o usuário for",
  SUBTOTAL_VALUE = "Se valor subtotal",
  TOTAL_VALUE = "Se valor total",
}

export enum OperatorApresentacao {
  EQUAL = "Igual",
  NOT_EQUAL = "Diferente",
  GREATER = "Maior",
  GREATER_EQUAL = "Maior ou igual",
  LESS = "Menor",
  LESS_EQUAL = "Menor ou igual",
  CONTAINS = "Está contido",
  NOT_CONTAINS = "Não está contido",
  EVERY = "A cada",
}

/* Apresentação de ações (pt-BR) */
export enum ActionTypeApresentacao {
  FIXED_VARIANT_DISCOUNT = "Ganhe X R$ de desconto na unidade de cada produto variante Y",
  FIXED_PRODUCT_DISCOUNT = "Ganhe X R$ de desconto na unidade de cada produto Y",
  FREE_VARIANT_ITEM = "Ganhe X unidades do produto variante Y de brinde",
  FREE_PRODUCT_ITEM = "Ganhe X unidades do produto Y de brinde",
  PERCENT_CATEGORY = "Ganhe X% de desconto nos produtos da categoria Y",
  PERCENT_VARIANT = "Ganhe X% de desconto nos produtos variantes Y",
  PERCENT_PRODUCT = "Ganhe X% de desconto nos produtos Y",
  PERCENT_BRAND_ITEMS = "Percentual de desconto de acordo com marca/fabricante",
  PERCENT_ITEM_COUNT = "Percentual de desconto em X unidades de produtos Y",
  PERCENT_EXTREME_ITEM = "Percentual de desconto em X unidades do produto de menor ou maior valor",
  PERCENT_SHIPPING = "Percentual de desconto no valor do frete",
  PERCENT_SUBTOTAL = "Percentual de desconto no valor subtotal (soma dos produtos)",
  PERCENT_TOTAL_NO_SHIPPING = "Percentual de desconto no valor total (sem considerar o frete)",
  PERCENT_TOTAL_PER_PRODUCT = "Percentual de desconto no valor total (aplicado por produto)",
  FIXED_BRAND_ITEMS = "Valor de desconto em X produtos de acordo com marca/fabricante",
  FIXED_SHIPPING = "Valor de desconto no valor do frete",
  FIXED_SUBTOTAL = "Valor de desconto no valor subtotal (soma dos produtos)",
  FIXED_TOTAL_NO_SHIPPING = "Valor de desconto no valor total (sem considerar o frete)",
  FIXED_TOTAL_PER_PRODUCT = "Valor de desconto no valor total (aplicado por produto)",
  MAX_SHIPPING_DISCOUNT = "Valor máximo de frete",
}

/* ActionType - mantenho como union de literais (coincide com seu DB) */
export type ActionType =
  | "FIXED_VARIANT_DISCOUNT"
  | "FIXED_PRODUCT_DISCOUNT"
  | "FREE_VARIANT_ITEM"
  | "FREE_PRODUCT_ITEM"
  | "PERCENT_CATEGORY"
  | "PERCENT_VARIANT"
  | "PERCENT_PRODUCT"
  | "PERCENT_BRAND_ITEMS"
  | "PERCENT_ITEM_COUNT"
  | "PERCENT_EXTREME_ITEM"
  | "PERCENT_SHIPPING"
  | "PERCENT_SUBTOTAL"
  | "PERCENT_TOTAL_NO_SHIPPING"
  | "PERCENT_TOTAL_PER_PRODUCT"
  | "FIXED_BRAND_ITEMS"
  | "FIXED_SHIPPING"
  | "FIXED_SUBTOTAL"
  | "FIXED_TOTAL_NO_SHIPPING"
  | "FIXED_TOTAL_PER_PRODUCT"
  | "MAX_SHIPPING_DISCOUNT";

/* -------------------- Promotion DTOs / Inputs -------------------- */

export type CouponInput = { code: string };
export type ConditionInput = { id?: string; type: ConditionType | string; operator?: Operator | string; value?: any };
export type ActionInput = { id?: string; type: ActionType | string; params?: any };
export type DisplayInput = { id?: string; title: string; type?: string; content?: string };
export type BadgeInput = { file?: File; title: string; imageUrl?: string };

/* CreatePromotion DTO (admin) */
export interface CreatePromotionDto {
  name: string;
  description?: string;
  startDate?: Date | string | null;
  endDate?: Date | string | null;

  hasCoupon?: boolean;
  multipleCoupons?: boolean;
  reuseSameCoupon?: boolean;
  perUserCouponLimit?: number | null;
  totalCouponCount?: number | null;
  coupons?: string[];

  active?: boolean;
  cumulative?: boolean;
  priority?: number;

  conditions?: ConditionInput[];
  actions?: ActionInput[];
  displays?: DisplayInput[];
  badges?: BadgeInput[];
}

/* badge wrapper for wizard forms */
export interface BadgeWithFile {
  id?: any;
  title: string;
  imageUrl?: string;
  file?: File;
}
export type PromotionWizardDto = Omit<CreatePromotionDto, "badges"> & {
  badges?: BadgeWithFile[];
};

/* -------------------- Cart / Order -------------------- */

export interface CartItem {
  variant_id?: string | null;
  weight?: number;
  length?: number;
  width?: number;
  height?: number;
  id: string;
  product_id: string;
  name: string;
  images?: string | string[];
  price: number;
  quantity: number;
  variant_sku?: string | null;
  variant_name?: string | null;
  selectedOptions?: SelectedOption[];
  attributeImages?: string[];
  variantImage?: string | null;
}

export interface Cart {
  id?: string;
  items: CartItem[];
  subtotal: number;
  shippingCost?: number;
  total?: number;
}

/* -------------------- Address -------------------- */

export interface AddressProps {
  customer_id: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  number?: string;
  neighborhood?: string;
  country?: string;
  complement?: string;
  reference?: string;
}

/* -------------------- Promotion types used in frontend -------------------- */

export interface PromotionCoupon {
  id: string;
  code: string;
  promotion_id?: string;
  created_at?: string;
}

export interface PromotionDisplay {
  id?: string;
  title: string;
  type?: "SPOT" | "PRODUCT_PAGE" | string;
  content?: string | null;
}

export interface PromotionUsage {
  id?: string;
  customer_id?: string;
  coupon_code?: string;
  created_at?: string;
  discountApplied?: number;
}

export interface Promotion {
  id: string;
  name: string;
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;

  // flags
  hasCoupon?: boolean;
  multipleCoupons?: boolean;
  reuseSameCoupon?: boolean;
  cumulative?: boolean;
  priority?: number;
  status?: string;

  // coupon related
  perUserCouponLimit?: number | null;
  totalCouponCount?: number | null;
  coupons?: PromotionCoupon[];

  // content
  displays?: PromotionDisplay[];
  badges?: { id?: string; title?: string; imageUrl?: string }[];

  // relations
  conditions?: ConditionInput[]; // raw from backend
  actions?: ActionInput[]; // raw from backend
  products?: ProductSummary[] | any[];
  variantPromotions?: any[];
  mainVariants?: any[];

  // optional stats
  promotionUsage?: PromotionUsage[];
  usedCount?: number;
  usedCouponsCount?: number;

  created_at?: string;
}

/* -------------------- Auth / Forms -------------------- */

export interface LoginFormData {
  email: string;
  password: string;
}

/* -------------------- Lookup helper types (frontend) -------------------- */

/**
 * Tipos retornados por /catalog/lookup
 * - name pode ser null no backend, então permitimos `string | null`
 * - estes tipos ajudam a tipar o MEM_CACHE e o preloadedLookup
 */
export type CatalogProductEntry = { id: string; name?: string | null };
export type CatalogVariantEntry = { id: string; sku?: string | null; name?: string | null };

/**
 * Preloaded lookup (incoming do parent -> modal).
 * Permite que preloaded venha com valores `null` (do backend) ou `undefined`.
 * Nos componentes, normalize `null` -> `undefined` para setState se preferir.
 */
export type PreloadedLookupIncoming = {
  products?: Record<string, string | null | undefined>;
  variants?: Record<string, { sku?: string | null | undefined; name?: string | null | undefined }>;
} | null | undefined;

export type ReviewFormData = {
  rating: number | string;
  comment?: string;
};

export interface SelectedOption {
  name: string;
  value: string;
  image?: string | null;
}


export default {};