import React from "react";
import { useForm } from "react-hook-form";

type Props = {
    onSubmit: (question: string) => Promise<void> | void;
    submitting: boolean;
    isAuthenticated: boolean;
    onRequestLogin?: () => void;
};

export default function QuestionForm({ onSubmit, submitting, isAuthenticated, onRequestLogin }: Props) {
    const { register, handleSubmit, watch, reset } = useForm<{ question: string }>({ defaultValues: { question: "" } });
    const charCount = (watch("question") || "").length;

    async function internalSubmit(data: { question: string }) {
        await onSubmit(data.question);
        reset();
    }

    return (
        <form onSubmit={handleSubmit(internalSubmit)} className="space-y-3 mb-4">
            <label htmlFor="question" className="sr-only">Sua pergunta</label>
            <textarea
                id="question"
                {...register('question')}
                placeholder="Tem alguma dúvida sobre o produto? Pergunte aqui!"
                maxLength={1000}
                rows={3}
                className="text-black w-full resize-y rounded-xl border p-3 text-sm placeholder-black/40 focus:outline-none focus:ring-2 focus:ring-orange-400 border-black/10"
            />

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="text-sm text-black/70">Limite: 1000 caracteres · <span className={`font-medium ${charCount > 450 ? 'text-red-600' : 'text-black'}`}>{charCount}</span></div>

                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    {!isAuthenticated ? (
                        <button
                            type="button"
                            onClick={() => (onRequestLogin ? onRequestLogin() : window.location.href = '/login')}
                            className="w-full sm:w-auto px-4 py-2 rounded-lg border border-orange-500 bg-orange-500 text-white text-sm font-medium hover:opacity-95"
                        >
                            Fazer login
                        </button>
                    ) : null}

                    <button
                        type="submit"
                        disabled={submitting}
                        className={`w-full sm:w-auto px-4 py-2 rounded-lg text-sm font-medium border ${submitting ? 'opacity-60 cursor-not-allowed' : ''} ${isAuthenticated ? 'bg-black text-white border-black' : 'bg-white text-black border-black'}`}
                    >
                        {submitting ? 'Enviando...' : 'Enviar pergunta'}
                    </button>
                </div>
            </div>
        </form>
    );
}