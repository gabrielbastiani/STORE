// src/types/orders.ts
// Tipagens exportadas para serem usadas pelo componente OrdersList

export type ApiImage = {
    id: string;
    url: string;
    altText?: string | null;
    product_id?: string | null;
    isPrimary?: boolean;
    created_at?: string;
    updated_at?: string;
};

export type ApiVariantAttributeImage = {
    id: string;
    variantAttribute_id?: string | null;
    url: string;
    altText?: string | null;
    isPrimary?: boolean;
    created_at?: string;
};

export type ApiVariantAttribute = {
    id: string;
    variant_id?: string | null;
    key: string;
    value: string;
    status?: string;
    created_at?: string;
    updated_at?: string;
    variant?: ApiVariant | null;
    variantAttributeImage?: ApiVariantAttributeImage[] | null;
};

export type ApiVariant = {
    id: string;
    product_id?: string | null;
    sku?: string | null;
    price_of?: number | null;
    price_per?: number | null;
    stock?: number | null;
    allowBackorders?: boolean | null;
    sortOrder?: number | null;
    ean?: string | null;
    mainPromotion_id?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
    variantAttribute?: ApiVariantAttribute[] | null;
};

export type ApiPromotion = {
    id: string;
    name?: string;
    description?: string;
    startDate?: string | null;
    endDate?: string | null;
    is_processing?: boolean;
    is_completed?: boolean;
    email_sent?: boolean;
    hasCoupon?: boolean;
    multipleCoupons?: boolean;
    reuseSameCoupon?: boolean;
    perUserCouponLimit?: number | null;
    totalCouponCount?: number | null;
    status?: string;
    cumulative?: boolean;
    priority?: number;
    created_at?: string;
    coupons?: { id: string; code: string; promotion_id: string; created_at?: string }[];
    displays?: any[];
};

export type ApiProduct = {
    id: string;
    name: string;
    slug?: string;
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
    brand?: string;
    ean?: string;
    description?: string;
    skuMaster?: string;
    price_of?: number | null;
    price_per?: number | null;
    weight?: number | null;
    length?: number | null;
    width?: number | null;
    height?: number | null;
    stock?: number | null;
    view?: number | null;
    mainPromotion_id?: string | null;
    buyTogether_id?: string | null;
    status?: string;
    created_at?: string;
    updated_at?: string;
    images?: ApiImage[];
    mainPromotion?: ApiPromotion | null;
    promotions?: ApiPromotion[] | null;
    variants?: ApiVariant[] | null;
};

export type ApiOrderItem = {
    id: string;
    quantity: number;
    price: number;
    order_id: string;
    product_id: string;
    created_at?: string;
    order?: ApiOrder | null;
    product?: ApiProduct | null;
};

export type ApiCustomer = {
    id: string;
    asaas_customer_id?: string | null;
    email?: string | null;
    password?: string | null;
    name?: string | null;
    phone?: string | null;
    type_user?: string | null;
    cpf?: string | null;
    cnpj?: string | null;
    date_of_birth?: string | null;
    sexo?: string | null;
    state_registration?: string | null;
    photo?: string | null;
    newsletter?: boolean;
    last_access?: string | null;
    status?: string | null;
    created_at?: string | null;
};

export type ApiPayment = {
    id: string;
    amount: number;
    method?: string | null;
    status?: string | null;
    transaction_id?: string | null;
    asaas_customer_id?: string | null;
    asaas_payment_id?: string | null;
    description?: string | null;
    installment_plan?: any | null;
    pix_qr_code?: string | null;
    pix_expiration?: string | null;
    boleto_url?: string | null;
    boleto_barcode?: string | null;
    credit_card_token?: string | null;
    gateway_response?: any | null;
    order_id?: string | null;
    customer_id?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
    customer?: ApiCustomer | null;
    order?: ApiOrder | null;
};

export type ApiOrder = {
    id: string;
    id_order_store?: string | null;
    total: number;
    shippingCost?: number | null;
    grandTotal?: number | null;
    status?: string | null;
    shippingAddress?: string | null;
    shippingMethod?: string | null;
    trackingCode?: string | null;
    estimatedDelivery?: string | null;
    customer_id?: string | null;
    promotion_id?: string | null;
    cart_id?: string | null;
    created_at?: string | null;
    _count?: { items?: number; appliedPromotions?: number; commentOrder?: number } | null;
    appliedPromotions?: any[] | null;
    commentOrder?: any[] | null;
    items?: ApiOrderItem[] | null;
    payment?: ApiPayment | null;
    promotion?: ApiPromotion | null;
};

/** UI-friendly types usados pelo componente */
export type Address = {
    recipient_name?: string;
    street?: string;
    number?: string;
    neighborhood?: string;
    cep?: string;
    city?: string;
    state?: string;
    country?: string;
    complement?: string;
    reference?: string;
    obs?: string;
};

export type OrderItem = {
    id: string;
    image?: string | null;
    name?: string;
    variant?: string | null;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    status?: string | null;
    statusDate?: string | null;
    ipi?: number | null;
    productId?: string;
    sku?: string | null;
};

export type Order = {
    id: string;
    id_order_store?: string | null;
    date?: string | null;
    paymentMethod?: string | null;
    paymentLabel?: string | null;
    status?: string | null;
    total: number;
    installments?: number;
    storePickup?: string | null;
    trackingCode?: string | null;
    trackingDays?: string | null;
    items: OrderItem[];
    discount?: number | null;
    shipping?: string | null;
    totalIpi?: number | null;
    pickupAddress: Address;
    raw?: ApiOrder;
};