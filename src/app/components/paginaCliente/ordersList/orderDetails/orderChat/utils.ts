const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export function buildFullUrl(possibleUrl: string | undefined | null) {
    if (!possibleUrl) return "";
    const trimmed = possibleUrl.trim();
    if (trimmed === "") return "";

    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
    if (trimmed.startsWith("/")) return `${API_URL.replace(/\/$/, "")}${trimmed}`;
    if (trimmed.startsWith("uploads/") || trimmed.startsWith("commentAttachment/") || trimmed.startsWith("files/")) {
        return `${API_URL.replace(/\/$/, "")}/${trimmed}`;
    }
    return `${API_URL.replace(/\/$/, "")}/files/${trimmed}`;
}

/**
 * Normaliza o campo attachments vindo do backend (pode ser attachments | commentAttachment | commentAttachments)
 */
import type { CommentDTO } from "./types";
export function normalizeAttachments(comment: CommentDTO) {
    if (comment.attachments) return comment;
    const fallback = (comment as any).commentAttachments ?? (comment as any).commentAttachment ?? undefined;
    if (fallback) (comment as any).attachments = fallback;
    return comment;
}