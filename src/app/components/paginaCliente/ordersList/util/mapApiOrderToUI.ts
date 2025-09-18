import type { ApiOrder, ApiOrderItem, ApiImage, Order, OrderItem } from "../types/orders";
import { buildImageUrl, formatDateBR, mapApiStatusToUi, paymentMethodLabel } from "../lib/orders";

export const mapApiOrderToUI = (api: ApiOrder): Order => {
    const itemsApi: ApiOrderItem[] = api.items ?? [];

    const items: OrderItem[] = itemsApi.map((it) => {
        const image = (it.product?.images ?? []).find((img: ApiImage) => img.isPrimary) ?? (it.product?.images ?? [])[0];

        let variantLabel: string | null = null;
        if (it.product?.variants && it.product.variants.length > 0) {
            const v = it.product.variants[0];
            if (v?.variantAttribute && v.variantAttribute.length > 0) {
                const attr = v.variantAttribute[0];
                variantLabel = `${attr.key}: ${attr.value}`;
            }
        }

        const unitPrice = Number(it.price ?? 0);
        const quantity = Number(it.quantity ?? 0);

        const itemStatusNormalized = mapApiStatusToUi(api.payment?.status ?? api.status);

        return {
            id: it.id,
            image: buildImageUrl(image?.url ?? null),
            name: it.product?.name ?? "Produto",
            variant: variantLabel,
            quantity,
            unitPrice,
            totalPrice: +(unitPrice * quantity),
            status: itemStatusNormalized,
            statusDate: formatDateBR(it.created_at ?? api.created_at ?? null),
            ipi: null,
            productId: it.product_id,
            sku: it.product?.skuMaster ?? null,
        };
    });

    const pickupAddress = {
        recipient_name: api.address?.recipient_name ?? undefined,
        street: api.address?.street ?? undefined,
        number: api.address?.number ?? undefined,
        neighborhood: api.address?.neighborhood ?? undefined,
        cep: api.address?.zipCode ?? undefined,
        city: api.address?.city ?? undefined,
        state: api.address?.state ?? undefined,
        country: api.address?.country ?? undefined,
        complement: api.address?.complement ?? undefined,
        reference: api.address?.reference ?? undefined,
        obs: undefined,
    };

    const shippingText =
        typeof api.shippingCost === "number"
            ? api.shippingCost.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
            : api.shippingAddress ?? null;

    let installments = 1;
    if (api.payment?.installment_plan && typeof api.payment.installment_plan === "number") {
        installments = api.payment.installment_plan;
    }

    const normalizedStatus = mapApiStatusToUi(api.payment?.status ?? api.status);

    return {
        id: api.id,
        id_order_store: api.id_order_store ?? undefined,
        date: formatDateBR(api.created_at ?? null),
        paymentMethod: api.payment?.method ?? undefined,
        paymentLabel: paymentMethodLabel(api.payment?.method ?? undefined, api.payment ?? null),
        status: normalizedStatus,
        total: Number(api.total ?? api.grandTotal ?? 0),
        installments,
        storePickup: undefined,
        trackingCode: api.trackingCode ?? undefined,
        trackingDays: api.estimatedDelivery ?? undefined,
        items,
        discount: (api.promotionSummary?.discountTotal ?? api.payment?.discountAmount ?? null) ?? null,
        shipping: shippingText,
        totalIpi: null,
        pickupAddress,
        raw: api,
        promotionsApplied: api.promotionsApplied ?? (api.appliedPromotions ? api.appliedPromotions.map((ap: any) => ap.promotion) : []),
        promotionSummary: api.promotionSummary ?? null,
    };
};

export default mapApiOrderToUI;