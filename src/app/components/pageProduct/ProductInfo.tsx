import { Star, Percent, Tag, Clock, Ticket, Zap } from "lucide-react";
import { ProductFormData, VariantFormData, Promotion } from "Types/types";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { useMemo, useState } from "react";
import PromotionRulesModal from "./PromotionRulesModal";

interface ProductInfoProps {
  product: ProductFormData;
  selectedVariant: VariantFormData | null;
  formatPrice: (v: number) => string;
  hasDiscount: boolean;
  discount: number;
}

export default function ProductInfo({
  product,
  selectedVariant,
  formatPrice,
  hasDiscount,
  discount
}: ProductInfoProps) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);

  const variantPromo: Promotion | undefined = (selectedVariant as any)?.mainPromotion;
  const productPromo: Promotion | undefined = (product as any)?.mainPromotion;
  const promoToShow = variantPromo ?? productPromo;

  const displays = Array.isArray((promoToShow as any)?.displays) ? (promoToShow as any).displays : [];
  const coupons = Array.isArray((promoToShow as any)?.coupons) ? (promoToShow as any).coupons : [];
  const perUserLimit = typeof (promoToShow as any)?.perUserCouponLimit === "number" ? (promoToShow as any).perUserCouponLimit : undefined;

  const onCopyCoupon = (code?: string) => {
    if (!code) return toast.error("Cupom inválido");
    navigator.clipboard.writeText(code).then(
      () => toast.success(`Cupom copiado: ${code}`),
      () => toast.error("Não foi possível copiar o cupom")
    );
  };

  const onGoToCartWithCoupon = (code?: string) => {
    if (!code) return toast.error("Cupom inválido");
    router.push(`/cart?coupon=${encodeURIComponent(code)}`);
    toast.info("Abrindo carrinho para aplicar o cupom...");
  };

  const promoLabel = useMemo(() => {
    if (!promoToShow) return null;
    if (variantPromo) return "Promoção desta variante";
    return "Promoção do produto";
  }, [variantPromo, promoToShow]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
        <div className="flex items-center gap-2 mt-2">
          <div className="flex text-yellow-400" aria-hidden>
            {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 fill-current" />)}
          </div>
          <span className="text-sm text-gray-600">(4.8) - 127 avaliações</span>
        </div>
        <p className="text-sm text-gray-600 mt-1">SKU: {selectedVariant?.sku ?? product.skuMaster} | Marca: {product.brand ?? "—"}</p>
      </div>

      <div className="bg-white p-6 rounded-lg border grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
        <div className="md:col-span-2">
          {hasDiscount ? (
            <div>
              <div className="flex items-center gap-3">
                <span className="text-xl text-gray-400 line-through">{formatPrice(selectedVariant!.price_of!)}</span>
                <span className="bg-red-500 text-white px-2 py-1 rounded-full text-sm font-bold">-{discount}%</span>
              </div>
              <div className="text-3xl font-bold text-green-600 mt-2">{formatPrice(selectedVariant!.price_per!)}</div>
            </div>
          ) : (
            <div className="text-3xl font-bold text-gray-900">{formatPrice(selectedVariant?.price_per ?? product.price_per)}</div>
          )}

          <p className="text-sm text-gray-600 mt-2">À vista no PIX ou em até 12x sem juros no cartão</p>

          {promoToShow && (
            <div className="mt-4 flex items-start gap-3">
              <div className="w-12 h-12 rounded-full bg-amber-600 flex items-center justify-center text-white">
                <Ticket className="w-5 h-5" />
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-amber-800">{promoToShow.name}</div>
                    <div className="text-xs text-gray-600">{promoLabel}</div>
                  </div>

                  <div className="text-right text-xs text-gray-600">
                    {promoToShow.startDate && promoToShow.endDate ? (
                      <div>{new Date(promoToShow.startDate).toLocaleDateString("pt-BR")} — {new Date(promoToShow.endDate).toLocaleDateString("pt-BR")}</div>
                    ) : <div>Período: —</div>}
                  </div>
                </div>

                {displays.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {displays.slice(0, 2).map((d: any) => (
                      <div key={d.id || d.title} className="text-xs text-gray-700 bg-slate-50 p-2 rounded">
                        <div className="font-medium text-slate-800">{d.title}</div>
                        <div className="text-xs mt-1" dangerouslySetInnerHTML={{ __html: d.content || "" }} />
                      </div>
                    ))}
                    {displays.length > 2 && <div className="text-xs text-gray-500 mt-1">...mais detalhes na janela de regras</div>}
                  </div>
                )}

                {coupons.length > 0 && (
                  <div className="mt-3 flex gap-2 flex-wrap">
                    {coupons.slice(0, 3).map((c: any, idx: number) => (
                      <div key={c.id || c.code || idx} className="flex items-center gap-2 bg-white border px-3 py-1 rounded">
                        <div className="text-sm font-mono text-slate-800">{c.code}</div>
                        <button onClick={() => onCopyCoupon(c.code)} className="text-xs bg-amber-600 text-white px-2 py-1 rounded">Copiar</button>
                        <button onClick={() => onGoToCartWithCoupon(c.code)} className="text-xs border px-2 py-1 rounded">Aplicar</button>
                      </div>
                    ))}
                  </div>
                )}

                {typeof perUserLimit === "number" && <div className="mt-2 text-xs text-gray-600">Limite por cliente: <strong>{perUserLimit}</strong></div>}

                <div className="mt-3">
                  <button onClick={() => setModalOpen(true)} className="inline-block bg-amber-600 text-white px-3 py-1 rounded hover:bg-amber-700 text-sm">Ver regras da promoção</button>
                </div>
              </div>
            </div>
          )}
        </div>

        <aside className="md:col-span-1">
          <div className="p-3 rounded-lg border bg-gradient-to-b from-amber-50 to-white">
            {promoToShow ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-600 rounded flex items-center justify-center text-white">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-amber-800">{promoToShow.name}</div>
                    <div className="text-xs text-gray-600">{promoLabel}</div>
                  </div>
                </div>

                <div className="mt-3 flex flex-col gap-2">
                  {coupons.length > 0 ? (
                    <button onClick={() => onGoToCartWithCoupon(coupons[0].code)} className="w-full bg-amber-600 text-white px-3 py-2 rounded font-medium">Aplicar cupom principal</button>
                  ) : (
                    <div className="text-xs text-gray-600">Sem cupom — promoção automática</div>
                  )}

                  <button onClick={() => router.push("/cart")} className="w-full border border-amber-600 text-amber-700 px-3 py-2 rounded font-medium">Ir para o Carrinho</button>
                </div>

                <div className="mt-3 text-xs text-gray-600">
                  <button onClick={() => setModalOpen(true)} className="underline">Ver regras detalhadas</button>
                </div>
              </>
            ) : (
              <div className="text-sm text-gray-600">Sem promoções ativas</div>
            )}
          </div>
        </aside>
      </div>

      <PromotionRulesModal open={modalOpen} onClose={() => setModalOpen(false)} promo={promoToShow} />
    </div>
  );
}