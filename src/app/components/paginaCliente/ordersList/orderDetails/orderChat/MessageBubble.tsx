"use client";

import React from "react";
import AvatarImg from "./AvatarImg";
import AttachmentPreview from "./AttachmentPreview";
import type { CommentDTO, Attachment } from "./types";

type CommonProps = {
    comment: CommentDTO;
    onImageClick?: (url: string, filename?: string) => void;
};

export function CustomerBubble({ comment, onImageClick }: CommonProps) {
    const authorName = comment.customer?.name ?? "Você";
    const avatar = comment.customer?.photo ?? null;
    const attachments: Attachment[] = (comment.attachments ?? []) as Attachment[];

    return (
        <div className="flex justify-start items-start gap-3">
            <div className="flex-shrink-0">
                <AvatarImg photo={avatar} alt={authorName} className="w-9 h-9 rounded-full object-cover" />
            </div>

            <div className="flex flex-col">
                <div className="max-w-[85%] p-3 rounded-lg shadow-sm bg-white border border-gray-200 text-gray-900">
                    <div className="text-xs text-gray-600 font-medium mb-1">
                        {authorName} <span className="ml-2 text-[10px] text-gray-400">{new Date(comment.created_at).toLocaleString()}</span>
                    </div>

                    <div className="text-sm whitespace-pre-wrap">{comment.message}</div>

                    {attachments && attachments.length > 0 && (
                        <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {attachments.map((a) => (
                                <AttachmentPreview key={a.id ?? a.url} attachment={a} onImageClick={onImageClick} />
                            ))}
                        </div>
                    )}
                </div>

                <div className="text-[10px] mt-1 text-gray-400">{comment.status === "VISIBLE" ? "" : "Privado — apenas você e a equipe podem ver"}</div>
            </div>
        </div>
    );
}

export function StaffBubble({ comment, onImageClick }: CommonProps) {
    const authorName = comment.userEcommerce?.name ?? "Equipe da loja";
    const avatar = comment.userEcommerce?.photo ?? null;
    const attachments: Attachment[] = (comment.attachments ?? []) as Attachment[];

    return (
        <div className="flex justify-end items-start gap-3">
            <div className="flex flex-col items-end">
                <div className="max-w-[85%] p-3 rounded-lg shadow-sm bg-orange-600 text-white">
                    <div className="text-xs font-medium mb-1 flex items-center justify-end gap-2">
                        <span className="text-white/90">{authorName}</span>
                        <span className="text-[10px] text-white/70">{new Date(comment.created_at).toLocaleString()}</span>
                    </div>

                    <div className="text-sm whitespace-pre-wrap">{comment.message}</div>

                    {attachments && attachments.length > 0 && (
                        <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2 justify-end">
                            {attachments.map((a) => (
                                <div key={a.id ?? a.url} className="flex flex-col items-end">
                                    <AttachmentPreview attachment={a} onImageClick={onImageClick} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="text-[10px] mt-1 text-gray-400">{comment.status === "VISIBLE" ? "" : "Privado — apenas você e a equipe podem ver"}</div>
            </div>

            <div className="flex-shrink-0">
                <AvatarImg photo={avatar} alt={authorName} className="w-9 h-9 rounded-full object-cover" />
            </div>
        </div>
    );
}