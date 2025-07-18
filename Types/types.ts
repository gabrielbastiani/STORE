export interface Notification {
    id: string;
    message: string;
    created_at: string;
    href?: string;
    read: boolean;
    type: string;
}

export interface Category {
    id: string;
    name: string;
    slug: string;
    description: string;
    image: string;
    order: number;
    parentId: string | null;
    children?: Category[];
    promotion_id: string;
    filterId: string;
    selected?: boolean
    indeterminate?: boolean
    created_at: string;
}

export type StatusProduct = 'DISPONIVEL' | 'INDISPONIVEL';
export type StatusDescription = 'DISPONIVEL' | 'INDISPONIVEL';

export interface ProductDescription {
    id?: any;
    title: string;
    description: string;
    status?: StatusDescription;
}

export interface ImageRecord {
    id: string;
    url: string;
    altText: string;
    isPrimary: boolean;
}

export interface VariantFormData {
    id: string
    sku: string
    price_of?: number
    price_per?: number
    stock: number
    sortOrder: number
    ean?: string
    mainPromotion_id?: string
    allowBackorders?: boolean
    attributes: VariantAttribute[]
    images: File[]
    product_id?: string
    created_at?: string
    productVariantImage?: any[]
    productVariantVideo?: any[]
    variantAttributes: VariantAttribute[];
    videos?: VideoInput[];
    videoLinks?: VideoInput[];
    existingImages?: ImageRecord[]
    newImages?: File[]
    newVideos?: VideoInput[]
}

export interface VariantAttribute {
    id?: string;
    key: string;
    value: string;
    status?: StatusProduct;
    images?: File[];
    existingImages?: ImageRecord[]
    newImages?: File[]
}

export interface VideoInput {
    url: string;
    isPrimary?: boolean;
    thumbnail?: string;
}

export interface ProductVariant {
    id?: string;
    product_id?: string;
    created_at?: string;
    sku?: string
    price_of?: number
    price_per?: number
    stock?: number
    sortOrder?: number
    ean?: string
    mainPromotion_id?: string
    allowBackorders?: boolean
    attributes?: VariantAttribute[]
    images?: File[]
    videoLinks?: string[]
}

export interface ProductFormData {
    id?: string;
    relations: any;
    name: string;
    slug: string;
    description: string;
    brand?: string;
    ean?: string;
    skuMaster?: string;
    status: StatusProduct;
    price_of: number;
    price_per: number;
    stock?: number;
    weight?: number;
    length?: number;
    width?: number;
    height?: number;
    categories: string[];
    mainPromotion_id?: string;
    buyTogether_id?: string | null;
    images: ImageRecord[];
    videos: VideoInput[];
    variants: VariantFormData[];
    productDescriptions: ProductDescription[];
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
    videoLinks?: string[]
    existingImages?: ImageRecord[];
    newImages?: File[];
}

export interface RelationFormData {
    parentId?: string;
    childId?: string;
    relationType: "VARIANT" | "SIMPLE";
    sortOrder: number;
    isRequired: boolean;
}

export type PromotionOption = { id: string; name: string };

export const initialFormData: ProductFormData = {
    id: '',
    name: '',
    slug: '',
    description: '',
    status: 'DISPONIVEL',
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
    productDescriptions: [],
    relations: [],
    variants: [] as VariantFormData[],
    videoLinks: [],
    newImages: [],
    mainPromotion_id: undefined,
    buyTogether_id: undefined,
    existingImages: [],
};

export enum ConditionType {
    FIRST_ORDER = 'FIRST_ORDER',
    CART_ITEM_COUNT = 'CART_ITEM_COUNT',
    UNIQUE_VARIANT_COUNT = 'UNIQUE_VARIANT_COUNT',
    CATEGORY = 'CATEGORY',
    ZIP_CODE = 'ZIP_CODE',
    PRODUCT_CODE = 'PRODUCT_CODE',
    VARIANT_CODE = 'VARIANT_CODE',
    STATE = 'STATE',
    CATEGORY_ITEM_COUNT = 'CATEGORY_ITEM_COUNT',
    CATEGORY_VARIANT_COUNT = 'CATEGORY_VARIANT_COUNT',
    CATEGORY_VALUE = 'CATEGORY_VALUE',
    BRAND_VALUE = 'BRAND_VALUE',
    VARIANT_ITEM_COUNT = 'VARIANT_ITEM_COUNT',
    PRODUCT_ITEM_COUNT = 'PRODUCT_ITEM_COUNT',
    PERSON_TYPE = 'PERSON_TYPE',
    USER = 'USER',
    SUBTOTAL_VALUE = 'SUBTOTAL_VALUE',
    TOTAL_VALUE = 'TOTAL_VALUE'
}

export enum Operator {
    EQUAL = 'EQUAL',
    GREATER = 'GREATER',
    GREATER_EQUAL = 'GREATER_EQUAL',
    LESS = 'LESS',
    LESS_EQUAL = 'LESS_EQUAL'
}

export enum ActionType {
    PRICE_TABLE_ADJUST = 'PRICE_TABLE_ADJUST',
    FIXED_DISCOUNT_BY_QTY = 'FIXED_DISCOUNT_BY_QTY',
    FIXED_DISCOUNT_VARIANT = 'FIXED_DISCOUNT_VARIANT',
    FIXED_DISCOUNT_PRODUCT = 'FIXED_DISCOUNT_PRODUCT',
    FREE_VARIANT_ITEM = 'FREE_VARIANT_ITEM',
    FREE_PRODUCT_ITEM = 'FREE_PRODUCT_ITEM',
    PERCENT_DISCOUNT_RECURR = 'PERCENT_DISCOUNT_RECURR',
    PERCENT_DISCOUNT_CATEGORY = 'PERCENT_DISCOUNT_CATEGORY',
    PERCENT_DISCOUNT_VARIANT = 'PERCENT_DISCOUNT_VARIANT',
    PERCENT_DISCOUNT_PRODUCT = 'PERCENT_DISCOUNT_PRODUCT',
    PERCENT_DISCOUNT_BRAND = 'PERCENT_DISCOUNT_BRAND',
    PERCENT_DISCOUNT_QTY_PRODUCT = 'PERCENT_DISCOUNT_QTY_PRODUCT',
    PERCENT_DISCOUNT_EXTREME = 'PERCENT_DISCOUNT_EXTREME',
    PERCENT_DISCOUNT_SHIPPING = 'PERCENT_DISCOUNT_SHIPPING',
    PERCENT_DISCOUNT_SUBTOTAL = 'PERCENT_DISCOUNT_SUBTOTAL',
    PERCENT_DISCOUNT_TOTAL_BEFORE = 'PERCENT_DISCOUNT_TOTAL_BEFORE',
    PERCENT_DISCOUNT_PER_PRODUCT = 'PERCENT_DISCOUNT_PER_PRODUCT',
    FIXED_DISCOUNT_BRAND = 'FIXED_DISCOUNT_BRAND',
    FIXED_DISCOUNT_SHIPPING = 'FIXED_DISCOUNT_SHIPPING',
    FIXED_DISCOUNT_SUBTOTAL = 'FIXED_DISCOUNT_SUBTOTAL',
    FIXED_DISCOUNT_TOTAL_BEFORE = 'FIXED_DISCOUNT_TOTAL_BEFORE',
    FIXED_DISCOUNT_PER_PRODUCT = 'FIXED_DISCOUNT_PER_PRODUCT',
    MAX_SHIPPING_DISCOUNT = 'MAX_SHIPPING_DISCOUNT',
    FIXED_VARIANT_DISCOUNT = "FIXED_VARIANT_DISCOUNT",
    FIXED_PRODUCT_DISCOUNT = "FIXED_PRODUCT_DISCOUNT",
    PERCENT_CATEGORY = "PERCENT_CATEGORY",
    PERCENT_VARIANT = "PERCENT_VARIANT",
    PERCENT_PRODUCT = "PERCENT_PRODUCT",
    PERCENT_BRAND_ITEMS = "PERCENT_BRAND_ITEMS",
    PERCENT_ITEM_COUNT = "PERCENT_ITEM_COUNT",
    PERCENT_EXTREME_ITEM = "PERCENT_EXTREME_ITEM",
    PERCENT_SHIPPING = "PERCENT_SHIPPING",
    PERCENT_SUBTOTAL = "PERCENT_SUBTOTAL",
    PERCENT_TOTAL_NO_SHIPPING = "PERCENT_TOTAL_NO_SHIPPING",
    PERCENT_TOTAL_PER_PRODUCT = "PERCENT_TOTAL_PER_PRODUCT",
    FIXED_SHIPPING = "FIXED_SHIPPING",
    FIXED_SUBTOTAL = "FIXED_SUBTOTAL",
    FIXED_TOTAL_NO_SHIPPING = "FIXED_TOTAL_NO_SHIPPING",
    FIXED_BRAND_ITEMS = "FIXED_BRAND_ITEMS",
    FIXED_TOTAL_PER_PRODUCT = "FIXED_TOTAL_PER_PRODUCT"
}

export enum DisplayType {
    SPOT = 'SPOT',
    PRODUCT_PAGE = 'PRODUCT_PAGE'
}

export type CouponInput = { code: string }
export type ConditionInput = { type: string; operator: string; value: any }
export type ActionInput = { type: string; params: any }
export type DisplayInput = { title: string; type: string; content: string }
export type BadgeInput = {
    file: { new(fileBits: BlobPart[], fileName: string, options?: FilePropertyBag): File; prototype: File; }; title: string; imageUrl: string
}

export interface CreatePromotionDto {
    name: string
    description?: string
    startDate: Date
    endDate: Date

    hasCoupon: boolean
    multipleCoupons: boolean
    reuseSameCoupon: boolean
    perUserCouponLimit?: number
    totalCouponCount?: number
    coupons?: string[]

    active: boolean
    cumulative: boolean
    priority: number

    conditions?: ConditionInput[]
    actions?: ActionInput[]
    displays?: DisplayInput[]
    badges?: BadgeInput[]
}

export interface BadgeWithFile {
    id: any;
    title: string
    imageUrl: string
    file: File
}
export type PromotionWizardDto = Omit<CreatePromotionDto, 'badges'> & {
    badges: BadgeWithFile[]
}

export interface BadgeWizardDto {
    id?: string
    title: string
    imageUrl?: string    // URL já salva
    file?: File         // caso usuário selecione um novo arquivo
}

export interface CartItem {
    id: string;
    product_id: string;
    name: string;
    images: string;
    price: number;
    quantity: number;
}

export interface Cart {
    id: string;
    items: CartItem[];
    subtotal: number;
    shippingCost: number;
    total: number;
}