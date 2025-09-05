export const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export function extractUrl(maybe: any): string | null {
    if (maybe === undefined || maybe === null) return null;
    if (typeof maybe === "string") return maybe;
    if (maybe?.url) return maybe.url;
    return null;
}

export function toSrc(raw: string | null | undefined) {
    if (!raw) return "/placeholder.png";
    if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
    if (raw.startsWith("/files/") || raw.startsWith("/"))
        return `${process.env.NEXT_PUBLIC_API_URL || ""}${raw.startsWith("/") ? raw : `/${raw}`}`;
    return `${API_URL}/files/${raw}`;
}