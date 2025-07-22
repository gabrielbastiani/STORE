"use client";

import DOMPurify from "dompurify";
import { useEffect, useState } from "react";

export default function SafeHTML({ html }: { html: string }) {
    const [sanitizedHtml, setSanitizedHtml] = useState("");

    useEffect(() => {
        setSanitizedHtml(DOMPurify.sanitize(html));
    }, [html]);

    return <div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />;
}