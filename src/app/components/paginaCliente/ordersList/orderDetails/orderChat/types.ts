export type Attachment = {
    id?: string;
    url: string;
    filename: string;
    mimetype: string;
    size: number;
};

export type CommentDTO = {
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
    commentAttachment?: Attachment[]; // fallbacks
    commentAttachments?: Attachment[];
};