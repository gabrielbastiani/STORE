// timezone helpers and mappers

export function saoPauloLocalDayToUTC(dateStr: string, isEnd: boolean) {
    const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const SAO_PAULO_OFFSET_HOURS = 3; // UTC = local + 3
    if (m) {
        const y = Number(m[1]), mo = Number(m[2]) - 1, d = Number(m[3]);
        if (!isEnd) {
            return new Date(Date.UTC(y, mo, d, 0 + SAO_PAULO_OFFSET_HOURS, 0, 0, 0));
        } else {
            return new Date(Date.UTC(y, mo, d, 23 + SAO_PAULO_OFFSET_HOURS, 59, 59, 999));
        }
    }
    const dt = new Date(dateStr);
    if (isNaN(dt.getTime())) return null;
    if (!isEnd) { dt.setHours(0, 0, 0, 0); return dt; }
    dt.setHours(23, 59, 59, 999); return dt;
}

export function parseDbDateToDate(dbDate?: string | null) {
    if (!dbDate) return null;
    const s = dbDate.includes(' ') && !dbDate.includes('T') ? dbDate.replace(' ', 'T') : dbDate;
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d;
    return new Date(dbDate);
}

export function mapRawToQuestionItem(raw: any) {
    return {
        id: raw.id,
        question: raw.question || "",
        customer_id: raw.customer_id || null,
        nameCustomer: raw.customer?.name ?? null,
        createdAt: raw.created_at ?? null,
        status: raw.status ?? undefined,
        responseQuestionProduct: Array.isArray(raw.responseQuestionProduct)
            ? raw.responseQuestionProduct.map((r: any) => ({ id: r.id, response: r.response, createdAt: r.created_at ?? null, userEcommerce_id: r.userEcommerce_id ?? null, authorName: r.userEcommerce_id ? 'Vendedor' : undefined }))
            : []
    };
}

export function displayInSaoPaulo(dt?: string | null) {
    const d = parseDbDateToDate(dt ?? undefined);
    if (!d) return "";
    try {
        return d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    } catch {
        return d.toLocaleString();
    }
}