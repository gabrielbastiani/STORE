export interface CartItem {
    id: string;
    product_id: string;
    name: string;
    price: number;
    quantity: number;
    imageUrl?: string;
}

export interface Cart {
    id: string;
    items: CartItem[];
    subtotal: number;
    shippingCost: number;
    total: number;
}