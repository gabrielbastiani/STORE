"use client";

import { useTheme } from "@/app/contexts/ThemeContext"; 

interface TitleProps {
    title: string;
    description: string;
}

export default function SectionTitlePage({ title, description }: TitleProps) {

    const { colors } = useTheme();

    return (
        <section
            className="text-center py-11"
            style={{ background: colors?.fundo_secoes_titulo_paginas || '#1f2937' }}
        >
            <h1
                className="text-3xl font-bold"
                style={{ color: colors?.titulo_secoes_titulo_paginas || '#ffffff' }}
            >
                {title}
            </h1>
            <p
                className="mt-2"
                style={{ color: colors?.descricoes_secoes_titulo_paginas || '#bdc1c6' }}
            >
                {description}
            </p>
        </section>
    );
}