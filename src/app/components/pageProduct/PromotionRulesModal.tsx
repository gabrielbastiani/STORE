import React, { useMemo } from "react";
import { X, Info, Check, Tag, Clock, List } from "lucide-react";
import { Promotion, PromotionDisplay, PromotionCoupon } from "Types/types";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";

interface PromotionRulesModalProps {
    open: boolean;
    onClose: () => void;
    promo: Promotion | null | undefined;
}

/**
 * Modal que descreve regras completas da promoção:
 * - timeline (datas)
 * - displays (title + content)
 * - conditions (human-readable)
 * - actions (human-readable)
 * - cupons (lista com copiar/aplicar)
 *
 * Observações:
 * - O modal assume que promo.conditions (se existir) tem a forma: { type: string, operator?: string, value?: any }
 * - O modal assume que promo.actions (se existir) tem a forma: { type: string, params?: any }
 * - Usa dangerouslySetInnerHTML para promotion.displays.content assumindo sanitização no backend.
 */

export default function PromotionRulesModal({ open, onClose, promo }: PromotionRulesModalProps) {
    const router = useRouter();

    const copyCoupon = (code?: string) => {
        if (!code) {
            toast.error("Cupom inválido");
            return;
        }
        navigator.clipboard.writeText(code).then(
            () => toast.success(`Cupom copiado: ${code}`),
            () => toast.error("Falha ao copiar")
        );
    };

    const applyCoupon = (code?: string) => {
        if (!code) {
            toast.error("Cupom inválido");
            return;
        }
        router.push(`/cart?coupon=${encodeURIComponent(code)}`);
        toast.info("Abrindo carrinho para aplicar cupom...");
    };

    const displays: PromotionDisplay[] = Array.isArray((promo as any)?.displays) ? (promo as any).displays : [];
    const coupons: PromotionCoupon[] = Array.isArray((promo as any)?.coupons) ? (promo as any).coupons : [];
    const conditions: any[] = Array.isArray((promo as any)?.conditions) ? (promo as any).conditions : [];
    const actions: any[] = Array.isArray((promo as any)?.actions) ? (promo as any).actions : [];

    const humanizeCondition = (c: any) => {
        if (!c || !c.type) return "Condição desconhecida";
        const val = c.value ?? c.params ?? "";

        switch (String(c.type)) {
            case "FIRST_ORDER":
                return "Primeiro pedido do cliente";
            case "CART_ITEM_COUNT":
                return `Quantidade de itens no carrinho ${c.operator ?? ""} ${JSON.stringify(val)}`;
            case "UNIQUE_VARIANT_COUNT":
                return `Quantidade de variantes únicas ${c.operator ?? ""} ${JSON.stringify(val)}`;
            case "CATEGORY":
                return `Pertence à(s) categoria(s): ${Array.isArray(val) ? val.join(", ") : JSON.stringify(val)}`;
            case "ZIP_CODE":
                return `Restringida ao CEP(s): ${Array.isArray(val) ? val.join(", ") : JSON.stringify(val)}`;
            case "PRODUCT_CODE":
                return `Aplicável para produto(s) com código: ${JSON.stringify(val)}`;
            case "VARIANT_CODE":
                return `Aplicável para variante(s) com código: ${JSON.stringify(val)}`;
            case "STATE":
                return `Restringida ao estado(s): ${JSON.stringify(val)}`;
            case "CATEGORY_ITEM_COUNT":
                return `Ítens na categoria ${JSON.stringify(val)}`;
            case "BRAND_VALUE":
                return `Marca: ${JSON.stringify(val)}`;
            case "SUBTOTAL_VALUE":
                return `Subtotal do carrinho ${c.operator ?? ""} ${JSON.stringify(val)}`;
            case "TOTAL_VALUE":
                return `Total do pedido ${c.operator ?? ""} ${JSON.stringify(val)}`;
            case "USER":
                return `Restringida a usuário(s): ${JSON.stringify(val)}`;
            default:
                // fallback: se value for objeto JSON bonito
                try {
                    return `${String(c.type)} — ${typeof val === "object" ? JSON.stringify(val) : String(val)}`;
                } catch {
                    return `${String(c.type)} — ${String(val)}`;
                }
        }
    };

    const humanizeAction = (a: any) => {
        if (!a || !a.type) return "Ação desconhecida";
        const p = a.params ?? a.value ?? {};

        switch (String(a.type)) {
            case "PRICE_TABLE_ADJUST":
                return `Ajuste de tabela de preço: ${JSON.stringify(p)}`;
            case "FIXED_DISCOUNT_BY_QTY":
                return `Desconto fixo por quantidade: ${JSON.stringify(p)}`;
            case "FIXED_DISCOUNT_VARIANT":
                return `Desconto fixo por variante: ${JSON.stringify(p)}`;
            case "FIXED_DISCOUNT_PRODUCT":
                return `Desconto fixo no produto: ${JSON.stringify(p)}`;
            case "FREE_VARIANT_ITEM":
                return `Item grátis por variante: ${JSON.stringify(p)}`;
            case "FREE_PRODUCT_ITEM":
                return `Produto grátis: ${JSON.stringify(p)}`;
            case "PERCENT_DISCOUNT_VARIANT":
            case "PERCENT_DISCOUNT_PRODUCT":
            case "PERCENT_DISCOUNT_CATEGORY":
                return `Desconto percentual (${a.type}): ${JSON.stringify(p)}`;
            case "PERCENT_DISCOUNT_RECURR":
                return `Desconto recorrente: ${JSON.stringify(p)}`;
            case "PERCENT_DISCOUNT_SHIPPING":
                return `Desconto no frete: ${JSON.stringify(p)}`;
            default:
                try {
                    return `${String(a.type)} — ${typeof p === "object" ? JSON.stringify(p) : String(p)}`;
                } catch {
                    return `${String(a.type)} — ${String(p)}`;
                }
        }
    };

    const prettyJSON = (v: any) => {
        try {
            return typeof v === "string" ? v : JSON.stringify(v, null, 2);
        } catch {
            return String(v);
        }
    };

    if (!open) return null;

    return (
        <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />

            <div className="relative w-full max-w-4xl bg-white rounded-lg shadow-lg overflow-auto max-h-[90vh]">
                <div className="flex items-center justify-between p-4 border-b">
                    <div className="flex items-center gap-3">
                        <Info className="w-5 h-5 text-amber-600" />
                        <div>
                            <h3 className="text-lg font-semibold">{promo?.name ?? "Detalhes da promoção"}</h3>
                            <div className="text-xs text-gray-500">{promo?.description ?? ""}</div>
                        </div>
                    </div>

                    <button
                        aria-label="Fechar"
                        onClick={onClose}
                        className="p-2 rounded hover:bg-slate-100"
                    >
                        <X className="w-5 h-5 text-gray-600" />
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    {/* Timeline */}
                    <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="flex items-start gap-2">
                            <Clock className="w-5 h-5 text-sky-600 mt-1" />
                            <div>
                                <div className="text-xs text-gray-500">Início</div>
                                <div className="text-sm">{promo?.startDate ? new Date(promo.startDate).toLocaleString("pt-BR") : "—"}</div>
                            </div>
                        </div>

                        <div className="flex items-start gap-2">
                            <Clock className="w-5 h-5 text-sky-600 mt-1" />
                            <div>
                                <div className="text-xs text-gray-500">Término</div>
                                <div className="text-sm">{promo?.endDate ? new Date(promo.endDate).toLocaleString("pt-BR") : "—"}</div>
                            </div>
                        </div>

                        <div className="flex items-start gap-2">
                            <Tag className="w-5 h-5 text-amber-600 mt-1" />
                            <div>
                                <div className="text-xs text-gray-500">Cupom</div>
                                <div className="text-sm">{promo?.hasCoupon ? "Requer cupom" : "Promoção automática"}</div>
                            </div>
                        </div>
                    </section>

                    {/* Displays detalhados */}
                    {displays.length > 0 && (
                        <section>
                            <h4 className="text-sm font-semibold mb-2">Informações adicionais</h4>
                            <div className="space-y-2">
                                {displays.map((d) => (
                                    <article key={d.id || d.title} className="p-3 border rounded bg-slate-50">
                                        <div className="flex items-center justify-between">
                                            <div className="font-medium text-sm">{d.title}</div>
                                            <div className="text-xs text-gray-500">Detalhe</div>
                                        </div>
                                        <div className="text-sm text-gray-700 mt-2">
                                            {d.content ? <div dangerouslySetInnerHTML={{ __html: d.content }} /> : <em>Sem descrição</em>}
                                        </div>
                                    </article>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Conditions */}
                    <section>
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-semibold">Condições</h4>
                            <div className="text-xs text-gray-500">{conditions.length} condição(ões)</div>
                        </div>

                        {conditions.length === 0 ? (
                            <div className="mt-2 text-xs text-gray-600">Nenhuma condição — aplicável sem restrições adicionais.</div>
                        ) : (
                            <ul className="mt-2 space-y-2">
                                {conditions.map((c, idx) => (
                                    <li key={c.id || idx} className="p-3 bg-white border rounded flex items-start gap-3">
                                        <List className="w-5 h-5 text-sky-600 mt-1" />
                                        <div>
                                            <div className="font-medium text-sm">{humanizeCondition(c)}</div>
                                            <div className="text-xs text-gray-600 mt-1">
                                                <pre className="whitespace-pre-wrap text-xs">{prettyJSON(c.value ?? c.params ?? "")}</pre>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>

                    {/* Actions */}
                    <section>
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-semibold">Ações</h4>
                            <div className="text-xs text-gray-500">{actions.length} ação(ões)</div>
                        </div>

                        {actions.length === 0 ? (
                            <div className="mt-2 text-xs text-gray-600">Nenhuma ação registrada.</div>
                        ) : (
                            <ul className="mt-2 space-y-2">
                                {actions.map((a, idx) => (
                                    <li key={a.id || idx} className="p-3 bg-white border rounded flex items-start gap-3">
                                        <Check className="w-5 h-5 text-green-600 mt-1" />
                                        <div>
                                            <div className="font-medium text-sm">{humanizeAction(a)}</div>
                                            <div className="text-xs text-gray-600 mt-1">
                                                <pre className="whitespace-pre-wrap text-xs">{prettyJSON(a.params ?? a.value ?? {})}</pre>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>

                    {/* Coupons */}
                    <section>
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-semibold">Cupons</h4>
                            <div className="text-xs text-gray-500">{coupons.length} código(s)</div>
                        </div>

                        {coupons.length === 0 ? (
                            <div className="mt-2 text-xs text-gray-600">Sem cupons vinculados.</div>
                        ) : (
                            <div className="mt-2 grid gap-2 md:grid-cols-2">
                                {coupons.map((c, i) => (
                                    <div key={c.id || c.code || i} className="p-3 bg-white border rounded flex items-center justify-between">
                                        <div className="font-mono text-sm">{c.code}</div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => copyCoupon(c.code)} className="px-3 py-1 text-xs bg-amber-600 text-white rounded">Copiar</button>
                                            <button onClick={() => applyCoupon(c.code)} className="px-3 py-1 text-xs border rounded">Aplicar</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* Footer / Help */}
                    <div className="pt-2 border-t mt-2 flex items-center justify-between">
                        <div className="text-xs text-gray-600">
                            Dica: ao aplicar cupom, confirme no carrinho se o desconto foi calculado antes de finalizar.
                        </div>

                        <div className="flex items-center gap-2">
                            <button onClick={onClose} className="text-sm px-3 py-1 rounded bg-slate-100 hover:bg-slate-200">Fechar</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}