"use client";

import React, { useContext, useEffect, useRef, useState } from "react";
import { setupAPIClient } from "@/services/api";
import { toast } from "react-toastify";
import { AuthContextStore } from "@/app/contexts/AuthContextStore";

type Attachment = {
    id?: string;
    url: string;
    filename: string;
    mimetype: string;
    size: number;
};

type CommentDTO = {
    id: string;
    order_id: string;
    message: string;
    status: "PRIVATE" | "VISIBLE";
    created_at: string;
    customer_id: string;
    userEcommerce_id?: string | null;
    customer?: { id: string; name?: string; email?: string; photo?: string | null };
    userEcommerce?: { id: string; name?: string; email?: string; photo?: string | null };
    attachments?: Attachment[];
};

type Props = { orderId: string };

export default function OrderChat({ orderId }: Props) {
    const { user } = useContext(AuthContextStore);
    const currentCustomerId = user?.id ?? null;

    const [comments, setComments] = useState<CommentDTO[]>([]);
    const [loading, setLoading] = useState(false);
    const [text, setText] = useState("");
    const [sending, setSending] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const listRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        // carrega iniciais (uma vez) — não faz polling automático
        loadComments().catch((e) => console.error(e));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orderId]);

    const loadComments = async () => {
        if (!orderId) return;
        setLoading(true);
        try {
            const api = setupAPIClient();
            const res = await api.get<{ data: CommentDTO[] }>(`/customer/orders/${orderId}/comments`);
            setComments(res.data?.data ?? []);
            // scroll to bottom
            setTimeout(() => {
                if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
            }, 100);
        } catch (err) {
            console.error("Erro ao carregar comentários:", err);
            toast.error("Erro ao carregar mensagens");
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;
        const arr = Array.from(files).slice(0, 5); // limitar 5
        setSelectedFiles(arr);
    };

    const removeSelectedFile = (idx: number) => {
        setSelectedFiles((s) => s.filter((_, i) => i !== idx));
    };

    const handleSend = async () => {
        const message = (text ?? "").trim();
        if (!message && selectedFiles.length === 0) {
            toast.error("Escreva uma mensagem ou anexe um arquivo");
            return;
        }
        setSending(true);
        try {
            const api = setupAPIClient();
            const form = new FormData();
            form.append("message", message || ""); // message can be empty if files exist
            selectedFiles.forEach((f) => form.append("files", f));

            const res = await api.post(`/customer/orders/${orderId}/comments`, form, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            // Resposta contém created + conversation (opcional)
            const conv = res.data?.conversation ?? res.data?.data ? await (await api.get(`/customer/orders/${orderId}/comments`)).data?.data : null;
            if (conv) setComments(conv);
            else if (res.data?.data) {
                // append created
                setComments((s) => [...s, res.data.data]);
            }
            setText("");
            setSelectedFiles([]);
            if (fileInputRef.current) fileInputRef.current.value = "";
            toast.success("Mensagem enviada");
            // scroll
            setTimeout(() => { if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight; }, 100);
        } catch (err) {
            console.error("Erro ao enviar mensagem:", err);
            toast.error("Erro ao enviar mensagem");
        } finally {
            setSending(false);
        }
    };

    const isFromCustomer = (c: CommentDTO) => c.customer_id === currentCustomerId;

    return (
        <div className="mt-6 border rounded p-4 bg-white shadow-sm">
            <h3 className="text-lg font-semibold mb-3">Mensagens e comentários deste pedido</h3>

            <div className="flex items-center gap-3 mb-3">
                <button onClick={loadComments} className="px-3 py-1 rounded bg-gray-100 border hover:bg-gray-200 text-sm">Carregar novas mensagens</button>
                <div className="text-sm text-gray-500">Última atualização: <span>{comments.length ? new Date(comments[comments.length - 1].created_at).toLocaleString() : "—"}</span></div>
            </div>

            <div ref={listRef} className="max-h-72 overflow-y-auto space-y-3 p-2 border rounded bg-gray-50">
                {loading ? (
                    <div>Carregando mensagens…</div>
                ) : comments.length === 0 ? (
                    <div className="text-sm text-gray-600">Nenhuma mensagem ainda. Envie a primeira mensagem para a equipe da loja.</div>
                ) : (
                    comments.map((c) => {
                        const fromCustomer = isFromCustomer(c);
                        const authorName = fromCustomer ? (c.customer?.name ?? "Você") : (c.userEcommerce?.name ?? "Equipe da loja");
                        const avatarUrl = fromCustomer ? (c.customer?.photo ?? null) : (c.userEcommerce?.photo ?? null);
                        return (
                            <div key={c.id} className={`flex ${fromCustomer ? "justify-end" : "justify-start"}`}>
                                <div className={`max-w-[85%] p-2 rounded-lg border ${fromCustomer ? "bg-blue-50 border-blue-200" : "bg-gray-100 border-gray-200"}`}>
                                    <div className="flex items-center gap-2 mb-1">
                                        {avatarUrl ? (
                                            // avatar image
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={avatarUrl} alt={authorName} className="w-7 h-7 rounded-full object-cover" />
                                        ) : (
                                            <div className="w-7 h-7 rounded-full bg-gray-300 flex items-center justify-center text-xs text-white">{(authorName || "").slice(0, 1)}</div>
                                        )}
                                        <div className="text-xs text-gray-600 font-medium">{authorName}</div>
                                        <div className="text-[11px] text-gray-400 ml-2">{new Date(c.created_at).toLocaleString()}</div>
                                    </div>

                                    <div className="text-sm whitespace-pre-wrap">{c.message}</div>

                                    {c.attachments && c.attachments.length > 0 && (
                                        <div className="mt-2 grid grid-cols-3 gap-2">
                                            {c.attachments.map((a) => (
                                                <div key={a.url} className="flex flex-col items-start">
                                                    {a.mimetype.startsWith("image/") ? (
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        <a href={a.url} target="_blank" rel="noreferrer">
                                                            <img src={a.url} alt={a.filename} className="w-28 h-20 object-cover rounded" />
                                                        </a>
                                                    ) : (
                                                        <a href={a.url} target="_blank" rel="noreferrer" className="px-2 py-1 border rounded text-sm">
                                                            {a.filename}
                                                        </a>
                                                    )}
                                                    <div className="text-[11px] text-gray-400">{(a.size / 1024).toFixed(0)} KB</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="text-[10px] mt-1 text-gray-400">{c.status === "VISIBLE" ? "" : "Privado — apenas você e a equipe podem ver"}</div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            <div className="mt-3">
                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Escreva sua mensagem para a equipe da loja..."
                    className="w-full p-2 border rounded min-h-[80px] resize-none"
                />

                <div className="flex items-center justify-between mt-2 gap-3">
                    <div className="flex items-center gap-2">
                        <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1 border rounded text-sm bg-white">
                            <input ref={fileInputRef} type="file" multiple onChange={handleFileChange} className="hidden" />
                            Anexar arquivo
                        </label>

                        {selectedFiles.length > 0 && (
                            <div className="flex gap-2 items-center">
                                {selectedFiles.map((f, i) => (
                                    <div key={i} className="text-xs p-1 border rounded flex items-center gap-2">
                                        <div className="max-w-[160px] truncate">{f.name}</div>
                                        <button onClick={() => removeSelectedFile(i)} className="text-red-500 hover:underline">Remover</button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <button onClick={() => { setText(""); setSelectedFiles([]); if (fileInputRef.current) fileInputRef.current.value = ""; }} className="px-3 py-1 rounded border text-sm">Limpar</button>
                        <button onClick={handleSend} disabled={sending} className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-60">
                            {sending ? "Enviando…" : "Enviar"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}