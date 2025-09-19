"use client";

import React, { useEffect, useRef, useState } from "react";
import { setupAPIClient } from "@/services/api";
import { toast } from "react-toastify";

import type { CommentDTO } from "./types";
import { normalizeAttachments } from "./utils";

import { CustomerBubble, StaffBubble } from "./MessageBubble";
import ChatInput from "./ChatInput";
import ImageModal from "./ImageModal";

/**
 * Parent chat component
 */
type Props = { orderId: string };

export default function OrderChat({ orderId }: Props) {

    const [comments, setComments] = useState<CommentDTO[]>([]);
    const [loading, setLoading] = useState(false);
    const [text, setText] = useState("");
    const [sending, setSending] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const listRef = useRef<HTMLDivElement | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalUrl, setModalUrl] = useState<string | null>(null);
    const [modalFilename, setModalFilename] = useState<string | null>(null);

    useEffect(() => {
        loadComments().catch((e) => console.error(e));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orderId]);

    useEffect(() => {
        if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
    }, [comments]);

    const openImageModal = (url: string, filename?: string) => {
        setModalUrl(url);
        setModalFilename(filename ?? null);
        setModalOpen(true);
    };

    const loadComments = async () => {
        if (!orderId) return;
        setLoading(true);
        try {
            const api = setupAPIClient();
            const res = await api.get<{ data: CommentDTO[] }>(`/customer/orders/${orderId}/comments`);
            const raw = res.data?.data ?? [];
            const normalized = raw.map(normalizeAttachments);
            setComments(normalized);
            setTimeout(() => { if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight; }, 80);
        } catch (err) {
            console.error("Erro ao carregar comentários:", err);
            toast.error("Erro ao carregar mensagens");
        } finally {
            setLoading(false);
        }
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
            form.append("message", message || "");
            selectedFiles.forEach((f) => form.append("files", f));

            const res = await api.post(`/customer/orders/${orderId}/comments`, form, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            if (res.data?.conversation) {
                const normalized = (res.data.conversation as CommentDTO[]).map(normalizeAttachments);
                setComments(normalized);
            } else {
                await loadComments();
            }

            setText("");
            setSelectedFiles([]);
            toast.success("Mensagem enviada");
            setTimeout(() => { if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight; }, 100);
        } catch (err) {
            console.error("Erro ao enviar mensagem:", err);
            toast.error("Erro ao enviar mensagem");
        } finally {
            setSending(false);
        }
    };

    const isStaff = (c: CommentDTO) => Boolean(c.userEcommerce_id);

    return (
        <div className="mt-6 border rounded p-4 bg-white shadow-sm">
            <h3 className="text-lg font-semibold mb-3">Mensagens e comentários deste pedido</h3>

            <div className="flex items-center gap-3 mb-3">
                <button onClick={loadComments} className="px-3 py-1 rounded bg-gray-100 border hover:bg-gray-200 text-sm">
                    Carregar novas mensagens
                </button>

                <div className="text-sm text-gray-500">
                    Última atualização: <span>{comments.length ? new Date(comments[comments.length - 1].created_at).toLocaleString() : "—"}</span>
                </div>
            </div>

            <div ref={listRef} className="max-h-80 md:max-h-96 overflow-y-auto space-y-3 p-2 border rounded bg-gray-50">
                {loading ? (
                    <div>Carregando mensagens…</div>
                ) : comments.length === 0 ? (
                    <div className="text-sm text-gray-600">Nenhuma mensagem ainda. Envie a primeira mensagem para a equipe da loja.</div>
                ) : (
                    comments.map((c) => {
                        const staff = isStaff(c);
                        return staff ? <StaffBubble key={c.id} comment={c} onImageClick={openImageModal} /> : <CustomerBubble key={c.id} comment={c} onImageClick={openImageModal} />;
                    })
                )}
            </div>

            <ChatInput text={text} setText={setText} selectedFiles={selectedFiles} setSelectedFiles={setSelectedFiles} onSend={handleSend} sending={sending} />

            <ImageModal open={modalOpen} url={modalUrl} filename={modalFilename} onClose={() => { setModalOpen(false); setModalUrl(null); setModalFilename(null); }} />
        </div>
    );
}