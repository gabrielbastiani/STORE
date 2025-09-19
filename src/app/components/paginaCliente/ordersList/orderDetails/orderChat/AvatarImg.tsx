// components/order-chat/AvatarImg.tsx
"use client";

import React, { useEffect, useState } from "react";
import { buildFullUrl } from "./utils";

type Props = {
    photo?: string | null;
    alt?: string;
    className?: string;
};

export default function AvatarImg({ photo, alt, className }: Props) {
    const [idx, setIdx] = useState(0);
    const [failedAll, setFailedAll] = useState(false);

    const candidates: string[] = React.useMemo(() => {
        if (!photo) return [];
        const p = photo.trim();
        const arr: string[] = [];

        if (p.startsWith("http://") || p.startsWith("https://")) arr.push(p);
        if (p.startsWith("/")) arr.push(`${process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? ""}${p}`);
        arr.push(buildFullUrl(`files/${p}`));
        arr.push(buildFullUrl(`commentAttachment/${p}`));
        arr.push(buildFullUrl(`uploads/${p}`));
        arr.push(buildFullUrl(`avatars/${p}`));
        if (!p.startsWith("/") && (p.includes("commentAttachment") || p.includes("uploads") || p.includes("files"))) {
            arr.unshift(`${process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? ""}/${p}`);
        }

        return Array.from(new Set(arr)).filter(Boolean);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [photo]);

    useEffect(() => {
        setIdx(0);
        setFailedAll(false);
    }, [photo]);

    const current = candidates[idx];

    const handleError = () => {
        if (idx + 1 < candidates.length) setIdx((s) => s + 1);
        else setFailedAll(true);
    };

    if (!photo || failedAll || !current) {
        const initial = (alt ?? "").trim().slice(0, 1) || "?";
        return (
            <div className={`${className ?? ""} w-9 h-9 rounded-full bg-gray-300 flex items-center justify-center text-sm text-white`} aria-hidden>
                {initial.toUpperCase()}
            </div>
        );
    }

    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={current} alt={alt ?? "avatar"} onError={handleError} className={className} style={{ objectFit: "cover" }} />
    );
}