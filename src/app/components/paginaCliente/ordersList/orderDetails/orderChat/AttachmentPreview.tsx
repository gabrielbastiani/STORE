"use client";

import React from "react";
import { buildFullUrl } from "./utils";
import type { Attachment } from "./types";

type Props = {
    attachment: Attachment;
    onImageClick?: (url: string, filename?: string) => void;
    className?: string;
};

export default function AttachmentPreview({ attachment, onImageClick, className }: Props) {
    const fileUrl = buildFullUrl(attachment.url);
    const isImage = (attachment.mimetype ?? "").startsWith("image/");
    return (
        <div className={`flex flex-col items-start ${className ?? ""}`}>
            {isImage ? (
                <button type="button" onClick={() => onImageClick?.(fileUrl, attachment.filename)} className="block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={fileUrl} alt={attachment.filename} className="w-28 h-20 object-cover rounded" />
                </button>
            ) : (
                <a href={fileUrl} target="_blank" rel="noreferrer" className="px-2 py-1 border rounded text-sm inline-block">
                    {attachment.filename}
                </a>
            )}
            <div className="text-[11px] text-gray-400 mt-1">{((attachment.size ?? 0) / 1024).toFixed(0)} KB</div>
        </div>
    );
}