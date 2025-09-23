"use client"

import { FooterStore } from "@/app/components/footer/footerStore";
import { NavbarStore } from "@/app/components/navbar/navbarStore";
import { AuthContextStore } from "@/app/contexts/AuthContextStore";
import { useTheme } from "@/app/contexts/ThemeContext";
import { useContext } from "react";


export default function EnvioPrazoEntrega() {

    const { colors } = useTheme();
    const { configs } = useContext(AuthContextStore);

    return (
        <>
            <NavbarStore />

            <main
                style={{ background: colors?.segundo_fundo_layout_site || '#e1e4e9' }}
            >
                <div
                    className="prose container mx-auto px-3 text-black mt-10 mb-10"
                    style={{ background: colors?.segundo_fundo_layout_site || '#e1e4e9' }}
                    dangerouslySetInnerHTML={{ __html: configs?.shipping_delivery_time || "" }}
                />
            </main>

            <FooterStore />
        </>
    )
}