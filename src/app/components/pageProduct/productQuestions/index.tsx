"use client";

import React, { useEffect, useState, useContext, useMemo, useRef } from "react";
import { setupAPIClient } from "@/services/api";
import { AuthContextStore } from "@/app/contexts/AuthContextStore";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { displayInSaoPaulo, mapRawToQuestionItem, parseDbDateToDate, saoPauloLocalDayToUTC } from "./dateUtils";
import SearchFilters from "./SearchFilters";
import QuestionForm from "./QuestionForm";
import QuestionList from "./QuestionList";
import Pagination from "./Pagination";

// Types
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

export type QuestionItem = {
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

// Props
type Props = {
  productId?: string | null;
  onRequestLogin?: () => void;
  initialPageSize?: number;
};

export default function ProductQuestions({ productId, onRequestLogin, initialPageSize = 5 }: Props) {

  const { isAuthenticated, user } = useContext(AuthContextStore);
  const router = useRouter();

  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [allQuestionsCache, setAllQuestionsCache] = useState<QuestionItem[] | null>(null); // usado para client-side pagination/filter quando backend retorna array cru
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(initialPageSize ?? 10);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);

  const serverSupportsPagination = useRef<boolean | null>(null);

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

  async function fetchQuestions(requestPage: number, requestPageSize: number, fromFilters: boolean) {
    if (!productId) {
      setQuestions([]);
      setTotalCount(0);
      return;
    }

    // se já detectamos que o backend NÃO fornece paginação e temos cache,
    // usamos o cache local para filtrar/paginar (evita novas requisições)
    if (serverSupportsPagination.current === false && allQuestionsCache) {
      const filtered = filterClientSide(allQuestionsCache, searchTerm, dateFrom, dateTo);
      setTotalCount(filtered.length);
      setQuestions(paginateArray(filtered, requestPage, requestPageSize));
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
        const mapped = s.data.map(mapRawToQuestionItem);
        setQuestions(mapped);
        setTotalCount(s.total || mapped.length);
        setAllQuestionsCache(null); // não vamos usar cache quando server-side pagination estiver ativo
        return;
      }

      // server returned array raw (no pagination) -> cache and use client-side filtering/pagination
      if (Array.isArray(d)) {
        serverSupportsPagination.current = false;
        const rawArr: RawQuestionItem[] = d;
        const mappedAll = rawArr.map(mapRawToQuestionItem);
        setAllQuestionsCache(mappedAll);

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

  // filterClientSide uses same timezone logic as backend (SaoPaulo -> UTC)
  function filterClientSide(arr: QuestionItem[], q: string, from: string | null, to: string | null) {
    const qLower = q?.trim().toLowerCase() || "";

    let fromUtc: Date | null = null;
    let toUtc: Date | null = null;
    if (from) fromUtc = saoPauloLocalDayToUTC(from, false);
    if (to) toUtc = saoPauloLocalDayToUTC(to, true);

    return arr.filter(item => {
      const created = parseDbDateToDate(item.createdAt ?? undefined);

      if (fromUtc || toUtc) {
        if (!created) return false;
        if (fromUtc && created.getTime() < fromUtc.getTime()) return false;
        if (toUtc && created.getTime() > toUtc.getTime()) return false;
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

  async function handleCreateQuestion(questionText: string) {
    if (!questionText || questionText.trim().length < 3) {
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
        question: questionText.trim(),
      };
      const res = await api.post("/question/create", payload);
      const createdRaw: RawQuestionItem = res.data;

      toast.success("Pergunta enviada — ficará visível quando aprovada.");

      // se backend tem paginação, recarregamos página atual; senão: atualizamos cache e lista cliente
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

  function getVisiblePageRange(): number[] {
    const maxButtons = 5;
    let start = Math.max(1, Math.min(page - 2, Math.max(1, totalPages - (maxButtons - 1))));
    return Array.from({ length: Math.min(maxButtons, totalPages) }).map((_, i) => start + i).filter(p => p >= 1 && p <= totalPages);
  }

  return (
    <div className="container mx-auto px-3 sm:px-4 my-6 sm:my-8">
      <div className="p-4 bg-white border rounded-2xl shadow-sm" aria-labelledby="qa-heading">
        <h2 id="qa-heading" className="text-lg sm:text-2xl font-semibold mb-2 text-black">Perguntas e respostas</h2>
        <p className="text-xs sm:text-sm mb-4 text-black/70">Confira perguntas já respondidas pelo vendedor ou faça a sua — perguntas passam por aprovação antes de aparecerem publicamente.</p>

        <SearchFilters
          searchTerm={searchTerm}
          setSearchTerm={(s) => { setSearchTerm(s); setPage(1); }}
          pageSize={pageSize}
          setPageSize={(v) => { setPageSize(v); setPage(1); }}
          dateFrom={dateFrom}
          dateTo={dateTo}
          setDateFrom={(v) => { setDateFrom(v); setPage(1); }}
          setDateTo={(v) => { setDateTo(v); setPage(1); }}
          onClear={() => { setSearchTerm(""); setDateFrom(null); setDateTo(null); setPage(1); fetchQuestions(1, pageSize, false); }}
          onRefresh={() => fetchQuestions(page, pageSize, false)}
        />

        <QuestionForm onSubmit={handleCreateQuestion} submitting={submitting} isAuthenticated={isAuthenticated} onRequestLogin={onRequestLogin} />

        <QuestionList
          questions={questions}
          loading={loading}
          displayInSaoPaulo={displayInSaoPaulo}
        />

        <Pagination
          page={page}
          totalPages={totalPages}
          gotoPage={gotoPage}
          getVisiblePageRange={getVisiblePageRange}
        />
      </div>
    </div>
  );
}