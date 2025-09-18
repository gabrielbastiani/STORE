// app/components/checkout/types.ts
export type CartItem = {
  id?: string;
  product_id?: string;
  variant_id?: string | null;
  name?: string;
  price?: number;
  quantity?: number;
  images?: string[] | string | null;
  weight?: number;
  length?: number;
  height?: number;
  width?: number;
};

export interface CheckoutAddress {
  id?: string;
  customer_id?: string;
  recipient_name?: string;
  zipCode?: string;
  street?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  number?: string;
  complement?: string;
  reference?: string;
  country?: string;
  created_at?: string;
}

export type AddressLocal = Required<
  Pick<CheckoutAddress, 'zipCode' | 'street' | 'neighborhood' | 'city' | 'state'>
> &
  Partial<Omit<CheckoutAddress, 'zipCode' | 'street' | 'neighborhood' | 'city' | 'state'>> & { id: string }

export type ShippingOption = {
  id: string;
  name?: string;
  provider?: string;
  service?: string;
  price: number;
  deliveryTime?: string;
  estimated_days?: number | null;
  raw?: any;
}

export type PaymentOption = {
  id: string;
  provider: string;
  method: string;
  label: string;
  description?: string;
}

export type PromotionDetail = {
  id: string;
  name?: string;
  description?: string;
  type?: 'shipping' | 'product' | string;
  discount?: number;
}

export type SkippedPromo = any