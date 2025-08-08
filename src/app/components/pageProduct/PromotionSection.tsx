import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { useMemo, useCallback, useEffect, useState } from "react";
import { Clock, Ticket, Gift, Check, Tag } from "lucide-react";
import { Promotion } from "Types/types";
import PromotionRulesModal from "./PromotionRulesModal";

interface PromotionSectionProps {
  promo: Promotion;
}

export default function PromotionSection({ promo }: PromotionSectionProps) {
  const router = useRouter();

  const [modalOpen, setModalOpen] = useState(false);

  if (!promo) return null;

  const start = promo.startDate ? new Date(promo.startDate) : null;
  const end = promo.endDate ? new Date(promo.endDate) : null;
  const [nowState, setNowState] = useState<Date>(new Date());

  useEffect(() => {
    const t = setInterval(() => setNowState(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const isActive = useMemo(() => {
    const n = nowState.getTime();
    if (start && end) return n >= start.getTime() && n <= end.getTime();
    if (start && !end) return n >= start.getTime();
    if (!start && end) return n <= end.getTime();
    return true;
  }, [nowState, start, end]);

  const copyToClipboard = useCallback((code?: string) => {
    if (!code) return toast.error("Cupom inválido");
    navigator.clipboard.writeText(code).then(
      () => toast.success(`Cupom copiado: ${code}`),
      () => toast.error("Não foi possível copiar o cupom")
    );
  }, []);

  const applyCoupon = useCallback((code?: string) => {
    if (!code) return toast.error("Cupom inválido");
    router.push(`/cart?coupon=${encodeURIComponent(code)}`);
    toast.info("Redirecionando para o carrinho para aplicar o cupom...");
  }, [router]);

  const coupons: any[] = Array.isArray((promo as any).coupons) ? (promo as any).coupons : [];
  const displays: any[] = Array.isArray((promo as any).displays) ? (promo as any).displays : [];
  const badges: any[] = Array.isArray((promo as any).badges) ? (promo as any).badges : [];

  return (
    <>
      <section className="bg-gradient-to-r from-sky-50 via-white to-amber-50 border border-amber-100 rounded-lg p-4 shadow-sm mb-6">
        <div className="flex gap-4">
          <div className="flex-shrink-0 w-20">
            <div className="w-16 h-16 rounded-full bg-amber-600 text-white flex items-center justify-center">
              <Tag className="w-7 h-7" />
            </div>
          </div>

          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-extrabold text-amber-800">{promo.name}</h3>
                {promo.description && <p className="text-sm text-gray-700 mt-1 max-w-prose">{promo.description}</p>}
                <div className="flex flex-wrap gap-2 mt-3">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
                    <Ticket className="w-4 h-4" /> {promo.hasCoupon ? "Requer cupom" : "Promoção automática"}
                  </div>

                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs bg-slate-50 text-slate-800">
                    <Clock className="w-4 h-4" /> {start ? `Início: ${new Date(start).toLocaleDateString("pt-BR")}` : "Início: —"}
                  </div>

                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs bg-slate-50 text-slate-800">
                    <Clock className="w-4 h-4" /> {end ? `Término: ${new Date(end).toLocaleDateString("pt-BR")}` : "Término: —"}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs text-gray-600">Status</div>
                <div className={`mt-1 font-semibold ${isActive ? "text-green-700" : "text-amber-700"}`}>
                  {isActive ? "Ativa" : "Fora do período"}
                </div>

                <div className="mt-3">
                  <button onClick={() => setModalOpen(true)} className="inline-block mt-1 bg-amber-600 text-white px-3 py-1 rounded hover:bg-amber-700 text-sm">
                    Ver regras da promoção
                  </button>
                </div>
              </div>
            </div>

            {displays.length > 0 && (
              <div className="mt-4 grid gap-2">
                {displays.slice(0, 2).map((d: any) => (
                  <article key={d.id || d.title} className="p-3 bg-white border rounded">
                    <header className="flex items-center justify-between">
                      <h4 className="font-semibold text-sm text-amber-800">{d.title}</h4>
                      <div className="text-xs text-gray-500">Detalhe</div>
                    </header>

                    <div className="mt-2 text-sm text-gray-700">
                      {d.content ? <div dangerouslySetInnerHTML={{ __html: d.content }} /> : <em>Sem descrição detalhada</em>}
                    </div>
                  </article>
                ))}
              </div>
            )}

            {coupons.length > 0 && (
              <div className="mt-4 bg-white p-3 border rounded">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-slate-800">Códigos de Cupom</div>
                  <div className="text-xs text-gray-500">Use no carrinho</div>
                </div>

                <div className="mt-3 flex gap-3 flex-wrap">
                  {coupons.map((c: any, i: number) => (
                    <div key={c.id || c.code || i} className="flex items-center gap-3 border rounded p-3 bg-slate-50">
                      <div className="font-mono text-sm text-slate-800">{c.code}</div>

                      <div className="flex items-center gap-2">
                        <button onClick={() => copyToClipboard(c.code)} className="px-3 py-1 text-xs bg-amber-600 text-white rounded">Copiar</button>

                        <button onClick={() => applyCoupon(c.code)} className="px-3 py-1 text-xs bg-amber-50 border border-amber-600 text-amber-700 rounded">
                          Aplicar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {badges.length > 0 && (
              <div className="mt-4 flex items-center gap-3 flex-wrap">
                {badges.map((b: any) => (
                  <div key={b.id || b.title} className="flex items-center gap-2 p-2 bg-white border rounded-md">
                    {b.imageUrl ? <img src={b.imageUrl} alt={b.title} className="w-10 h-10 object-cover rounded" /> : <div className="w-10 h-10 rounded bg-amber-100 flex items-center justify-center text-amber-700"><Gift className="w-4 h-4" /></div>}
                    <div className="text-sm font-medium text-slate-800">{b.title}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <PromotionRulesModal open={modalOpen} onClose={() => setModalOpen(false)} promo={promo} />
    </>
  );
}