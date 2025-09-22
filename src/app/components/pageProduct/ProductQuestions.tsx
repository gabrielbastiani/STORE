"use client";

import React, { useEffect, useState, useContext, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { setupAPIClient } from "@/services/api";
import { AuthContextStore } from "@/app/contexts/AuthContextStore";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";

type Props = {
  productId: string | null | undefined;
  onRequestLogin?: () => void;
  initialPageSize?: number;
};

type RawResponseItem = {
  id?: string;
  userEcommerce_id?: string;
  questionProduct_id?: string;
  response?: string;
  created_at?: string;
  updated_at?: string;
};

type RawQuestionItem = {
  id?: string;
  customer_id?: string | null;
  product_id?: string;
  question?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  customer?: { id?: string; name?: string } | null;
  product?: any;
  responseQuestionProduct?: RawResponseItem[];
};

type QuestionItem = {
  id?: string;
  question: string;
  customer_id?: string | null;
  nameCustomer?: string | null;
  createdAt?: string | null;
  status?: string;
  responseQuestionProduct?: {
    id?: string;
    response?: string;
    createdAt?: string | null;
    userEcommerce_id?: string | null;
    authorName?: string | null;
  }[];
};

type ServerListResponse = {
  data: RawQuestionItem[];
  total: number;
  page?: number;
  pageSize?: number;
};

export default function ProductQuestions({ productId, onRequestLogin, initialPageSize = 10 }: Props) {
  const { isAuthenticated, user } = useContext(AuthContextStore);
  const router = useRouter();

  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [allQuestionsCache, setAllQuestionsCache] = useState<QuestionItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [charCount, setCharCount] = useState(0);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(initialPageSize);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);

  // detect server-side pagination support
  const serverSupportsPagination = useRef<boolean | null>(null);

  const { register, handleSubmit, reset, watch } = useForm<{ question: string }>({ defaultValues: { question: "" } });
  const watchQuestion = watch("question");
  useEffect(() => setCharCount((watchQuestion || "").length), [watchQuestion]);

  // debounce search
  const searchTimeout = useRef<number | null>(null);
  useEffect(() => {
    if (searchTimeout.current) window.clearTimeout(searchTimeout.current);
    searchTimeout.current = window.setTimeout(() => {
      setPage(1);
      fetchQuestions(1, pageSize, true);
    }, 450) as unknown as number;

    return () => { if (searchTimeout.current) window.clearTimeout(searchTimeout.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, dateFrom, dateTo]);

  useEffect(() => {
    fetchQuestions(page, pageSize, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, page, pageSize]);

  function mapRawToQuestionItem(raw: RawQuestionItem): QuestionItem {
    return {
      id: raw.id,
      question: raw.question || "",
      customer_id: raw.customer_id || null,
      nameCustomer: raw.customer?.name ?? null,
      createdAt: raw.created_at ?? null,
      status: raw.status ?? undefined,
      responseQuestionProduct: Array.isArray(raw.responseQuestionProduct)
        ? raw.responseQuestionProduct.map(r => ({
          id: r.id,
          response: r.response,
          createdAt: r.created_at ?? null,
          userEcommerce_id: r.userEcommerce_id ?? null,
          authorName: r.userEcommerce_id ? "Vendedor" : undefined // we don't have full user object here
        }))
        : []
    };
  }

  async function fetchQuestions(requestPage: number, requestPageSize: number, fromFilters: boolean) {
    if (!productId) {
      setQuestions([]);
      setTotalCount(0);
      return;
    }

    setLoading(true);
    try {
      const api = setupAPIClient();

      const params: Record<string, any> = { product_id: productId, page: requestPage, pageSize: requestPageSize };
      if (searchTerm) params.q = searchTerm;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;

      const resp = await api.get("/question/statusApproved", { params });
      const d = resp.data;

      // server returned { data: [], total, page, pageSize } -> server-side pagination
      if (d && typeof d === "object" && Array.isArray(d.data) && typeof d.total === "number") {
        serverSupportsPagination.current = true;
        const s: ServerListResponse = d;
        // map raw items
        const mapped = s.data.map(mapRawToQuestionItem);
        setQuestions(mapped);
        setTotalCount(s.total || mapped.length);
        setAllQuestionsCache(null);
        return;
      }

      // server returned array raw (no pagination)
      if (Array.isArray(d)) {
        serverSupportsPagination.current = false;
        const rawArr: RawQuestionItem[] = d;
        const mappedAll = rawArr.map(mapRawToQuestionItem);
        setAllQuestionsCache(mappedAll);

        // apply filters client-side
        const filtered = filterClientSide(mappedAll, searchTerm, dateFrom, dateTo);
        setTotalCount(filtered.length);
        setQuestions(paginateArray(filtered, requestPage, requestPageSize));
        return;
      }

      // maybe server returns { questions: [...], total }
      const maybeArr = d?.data || d?.questions || d?.items || d?.results;
      if (Array.isArray(maybeArr)) {
        const mapped = maybeArr.map(mapRawToQuestionItem);
        const total = d.total ?? mapped.length;
        serverSupportsPagination.current = true;
        setQuestions(mapped);
        setTotalCount(total);
        setAllQuestionsCache(null);
        return;
      }

      // unknown response
      setQuestions([]);
      setTotalCount(0);
    } catch (err) {
      console.error("Erro ao carregar perguntas:", err);
      toast.error("Erro ao carregar perguntas");
      setQuestions([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }

  function paginateArray(arr: QuestionItem[], p: number, ps: number) {
    const start = (p - 1) * ps;
    return arr.slice(start, start + ps);
  }

  function filterClientSide(arr: QuestionItem[], q: string, from: string | null, to: string | null) {
    const qLower = q?.trim().toLowerCase() || "";

    return arr.filter(item => {
      if (from || to) {
        const created = item.createdAt ? new Date(item.createdAt) : null;
        if (from) {
          const f = new Date(from);
          if (!created || created < f) return false;
        }
        if (to) {
          const t = new Date(to);
          t.setHours(23, 59, 59, 999);
          if (!created || created > t) return false;
        }
      }

      if (!qLower) return true;
      if ((item.question || "").toLowerCase().includes(qLower)) return true;
      if ((item.nameCustomer || "").toLowerCase().includes(qLower)) return true;
      if (Array.isArray(item.responseQuestionProduct)) {
        for (const r of item.responseQuestionProduct) {
          if ((r.response || "").toLowerCase().includes(qLower)) return true;
        }
      }
      return false;
    });
  }

  async function onSubmit(form: { question: string }) {
    if (!form.question || form.question.trim().length < 3) {
      toast.error("Escreva uma pergunta com pelo menos 3 caracteres.");
      return;
    }
    if (!isAuthenticated) {
      toast.info("Faça login para enviar a pergunta.");
      if (onRequestLogin) return onRequestLogin();
      return router.push("/login");
    }

    setSubmitting(true);
    try {
      const api = setupAPIClient();
      const payload = {
        customer_id: user?.id,
        product_id: productId,
        question: form.question.trim(),
      };
      const res = await api.post("/question/create", payload);
      const createdRaw: RawQuestionItem = res.data;

      toast.success("Pergunta enviada — ficará visível quando aprovada.");

      // se backend tem paginação, recarregamos página atual; senão, adicionamos localmente
      if (serverSupportsPagination.current) {
        fetchQuestions(page, pageSize, false);
      } else {
        const mapped = mapRawToQuestionItem(createdRaw);
        setAllQuestionsCache(prev => {
          const next = prev ? [mapped, ...prev] : [mapped];
          const filtered = filterClientSide(next, searchTerm, dateFrom, dateTo);
          setTotalCount(filtered.length);
          setQuestions(paginateArray(filtered, page, pageSize));
          return next;
        });
      }
      reset();
    } catch (err) {
      console.error("Erro ao enviar pergunta:", err);
      toast.error("Erro ao enviar pergunta. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalCount / pageSize)), [totalCount, pageSize]);

  function gotoPage(p: number) {
    const next = Math.min(Math.max(1, p), totalPages);
    setPage(next);
  }

  function getResponseText(r: any) {
    return r.response || "";
  }

  return (
    <section className="w-full max-w-4xl mx-auto my-8 p-4 bg-white border rounded-2xl shadow-sm" aria-labelledby="qa-heading">
      <h2 id="qa-heading" className="text-2xl font-semibold mb-2 text-black">Perguntas & Respostas</h2>
      <p className="text-sm mb-4 text-black/70">Confira perguntas já respondidas pelo vendedor ou faça a sua — perguntas passam por aprovação antes de aparecerem publicamente.</p>

      {/* CONTROLS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <div className="md:col-span-2 flex gap-2">
          <input
            type="search"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar em perguntas e respostas..."
            className="flex-1 rounded-lg border p-2 text-sm placeholder-black/40 focus:outline-none focus:ring-2 focus:ring-orange-400 border-black/10"
            aria-label="Buscar perguntas e respostas"
          />

          <select
            value={pageSize}
            onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
            className="rounded-lg border p-2 text-sm bg-white border-black/10"
            aria-label="Perguntas por página"
          >
            {[5, 10, 20, 50].map(n => <option key={n} value={n}>{n} / página</option>)}
          </select>
        </div>

        <div className="flex gap-2 items-center">
          <label className="text-xs text-black/70">De</label>
          <input type="date" value={dateFrom ?? ''} onChange={e => { setDateFrom(e.target.value || null); setPage(1); }} className="rounded-lg border p-2 text-sm border-black/10" />
          <label className="text-xs text-black/70">Até</label>
          <input type="date" value={dateTo ?? ''} onChange={e => { setDateTo(e.target.value || null); setPage(1); }} className="rounded-lg border p-2 text-sm border-black/10" />
        </div>
      </div>

      {/* FORM */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 mb-4">
        <textarea
          id="question"
          {...register('question')}
          placeholder="Tem alguma dúvida sobre tamanho, compatibilidade, garantia...? Pergunte aqui!"
          maxLength={500}
          rows={3}
          className={`w-full resize-y rounded-xl border p-3 text-sm placeholder-black/40 focus:outline-none focus:ring-2 focus:ring-orange-400 border-black/10`}
        />

        <div className="flex items-center justify-between">
          <div className="text-sm text-black/70">Limite: 500 caracteres · <span className={`font-medium ${charCount > 450 ? 'text-red-600' : 'text-black'}`}>{charCount}</span></div>

          <div className="flex items-center gap-2">
            {!isAuthenticated ? (
              <button
                type="button"
                onClick={() => (onRequestLogin ? onRequestLogin() : router.push('/login'))}
                className="px-4 py-2 rounded-lg border border-orange-500 bg-orange-500 text-white text-sm font-medium hover:opacity-95"
              >
                Fazer login
              </button>
            ) : null}

            <button
              type="submit"
              disabled={submitting || !productId}
              className={`px-4 py-2 rounded-lg text-sm font-medium border ${submitting ? 'opacity-60 cursor-not-allowed' : ''} ${isAuthenticated ? 'bg-black text-white border-black' : 'bg-white text-black border-black'}`}
            >
              {submitting ? 'Enviando...' : 'Enviar pergunta'}
            </button>
          </div>
        </div>
      </form>

      {/* LIST */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-black/70">{totalCount} pergunta{totalCount !== 1 ? 's' : ''} · página {page} de {totalPages}</div>
          <div className="flex items-center gap-2">
            <button onClick={() => { setSearchTerm(''); setDateFrom(null); setDateTo(null); setPage(1); fetchQuestions(1, pageSize, false); }} className="text-sm px-3 py-1 rounded-lg border border-black/10">Limpar filtros</button>
            <button onClick={() => fetchQuestions(page, pageSize, false)} className="text-sm px-3 py-1 rounded-lg border border-orange-500 bg-orange-500 text-white">Atualizar</button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500"></div>
            <div className="text-sm text-black/70">Carregando perguntas...</div>
          </div>
        ) : questions.length === 0 ? (
          <div className="text-sm text-black/70">Nenhuma pergunta encontrada — seja o primeiro a perguntar!</div>
        ) : (
          <ul className="space-y-4">
            {questions.map((q, idx) => (
              <li key={q.id ?? idx} className="p-4 bg-white border rounded-xl">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-medium text-black">{q.nameCustomer ?? (q.customer_id ? 'Cliente' : 'Anônimo')}</div>
                      <div className="text-xs text-black/60">{q.createdAt ? new Date(q.createdAt).toLocaleString('pt-BR') : ''} {q.status === 'PENDING' ? <span className="ml-2 text-red-600">(Aguardando aprovação)</span> : null}</div>
                    </div>

                    <div className="mt-2 text-sm text-black/90">{q.question}</div>

                    {/* respostas */}
                    {Array.isArray(q.responseQuestionProduct) && q.responseQuestionProduct.length > 0 && (
                      <div className="mt-3 border-l-2 border-black/10 pl-3">
                        {q.responseQuestionProduct.map((r, j) => (
                          <div key={r.id ?? j} className="mb-3">
                            <div className="text-sm font-medium text-black">{r.authorName ?? 'Vendedor'}</div>
                            <div className="mt-1 text-sm text-black/90">{getResponseText(r)}</div>
                            <div className="mt-1 text-xs text-black/60">{r.createdAt ? new Date(r.createdAt).toLocaleString('pt-BR') : ''}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* PAGINATION */}
        <div className="mt-4 flex items-center justify-center gap-2">
          <button onClick={() => gotoPage(1)} disabled={page === 1} className={`px-3 py-1 rounded-md border ${page === 1 ? 'opacity-60 cursor-not-allowed' : ''}`}>Primeira</button>
          <button onClick={() => gotoPage(page - 1)} disabled={page === 1} className={`px-3 py-1 rounded-md border ${page === 1 ? 'opacity-60 cursor-not-allowed' : ''}`}>Anterior</button>

          {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
            const start = Math.max(1, Math.min(page - 2, totalPages - 4));
            const p = start + i;
            if (p > totalPages) return null;
            return (
              <button key={p} onClick={() => gotoPage(p)} className={`px-3 py-1 rounded-md border ${p === page ? 'bg-black text-white' : ''}`}>{p}</button>
            );
          })}

          <button onClick={() => gotoPage(page + 1)} disabled={page === totalPages} className={`px-3 py-1 rounded-md border ${page === totalPages ? 'opacity-60 cursor-not-allowed' : ''}`}>Próxima</button>
          <button onClick={() => gotoPage(totalPages)} disabled={page === totalPages} className={`px-3 py-1 rounded-md border ${page === totalPages ? 'opacity-60 cursor-not-allowed' : ''}`}>Última</button>
        </div>
      </div>
    </section>
  );
}