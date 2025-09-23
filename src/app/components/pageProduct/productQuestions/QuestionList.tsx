import React from "react";
import { QuestionItem } from "./index";

type Props = {
    questions: QuestionItem[];
    loading: boolean;
    displayInSaoPaulo: (dt?: string | null) => string;
};

export default function QuestionList({ questions, loading, displayInSaoPaulo }: Props) {
    if (loading) {
        return (
            <div className="flex items-center gap-3 py-6">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500"></div>
                <div className="text-sm text-black/70">Carregando perguntas...</div>
            </div>
        );
    }

    if (!questions || questions.length === 0) {
        return <div className="text-sm text-black/70 py-6">Nenhuma pergunta encontrada — seja o primeiro a perguntar!</div>;
    }

    return (
        <ul className="space-y-4">
            {questions.map((q, idx) => (
                <li key={q.id ?? idx} className="p-3 sm:p-4 bg-white border rounded-xl">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex-1">
                            <div className="flex items-start sm:items-center justify-between gap-3">
                                <div className="text-sm sm:text-base font-medium text-black">{q.nameCustomer ?? (q.customer_id ? 'Cliente' : 'Anônimo')}</div>
                                <div className="text-xs text-black/60">{displayInSaoPaulo(q.createdAt)} {q.status === 'PENDING' ? <span className="ml-2 text-red-600">(Aguardando aprovação)</span> : null}</div>
                            </div>

                            <div className="mt-2 text-sm sm:text-[0.95rem] leading-relaxed text-black/90">{q.question}</div>

                            {Array.isArray(q.responseQuestionProduct) && q.responseQuestionProduct.length > 0 && (
                                <div className="mt-3 border-l-2 border-black/10 pl-3">
                                    {q.responseQuestionProduct.map((r, j) => (
                                        <div key={r.id ?? j} className="mb-3">
                                            <div className="text-sm font-medium text-black">{r.authorName ?? 'Vendedor'}</div>
                                            <div className="mt-1 text-sm text-black/90">{r.response}</div>
                                            <div className="mt-1 text-xs text-black/60">{displayInSaoPaulo(r.createdAt)}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </li>
            ))}
        </ul>
    );
}