"use client";

import { setupAPIClient } from "@/services/api";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import noImage from "../../../../../public/no-image.png";
import { useTheme } from "@/app/contexts/ThemeContext"; 

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface PopupData {
    popup_time: number;
    id: string;
    image_url?: string;
    text_publication?: string;
    redirect_url?: string;
    conditions?: string;
    text_button: string;
}

interface PopupProps {
    position: string;
    local: string;
}

export default function MarketingPopup({ position, local }: PopupProps) {

    const { colors } = useTheme();

    const [isVisible, setIsVisible] = useState(false);
    const [popupData, setPopupData] = useState<PopupData | null>(null);

    useEffect(() => {
        const fetchPopupConfig = async () => {
            const apiClient = setupAPIClient();
            try {
                const response = await apiClient.get<PopupData>(`/marketing_publication/store_publications/popup?position=${position}&local=${local}`);

                if (response.data == null) {
                    console.log("Sem popup cadastrado por aqui.")
                    return;
                }

                setPopupData(response.data);

                if (response.data.conditions === "scroll") {
                    const handleScroll = () => {
                        if (window.scrollY > response.data?.popup_time) {
                            setIsVisible(true);
                            window.removeEventListener("scroll", handleScroll);
                        }
                    };
                    window.addEventListener("scroll", handleScroll);
                } else if (response.data.conditions === "setTimeout") {
                    setTimeout(() => {
                        setIsVisible(true);
                    }, response.data.popup_time || 2000);
                } else if (response.data.conditions === "beforeunload") {
                    const handleBeforeUnload = (event: { preventDefault: () => void }) => {
                        setIsVisible(true);
                        event.preventDefault();
                    };
                    window.addEventListener("beforeunload", handleBeforeUnload);
                    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
                }
            } catch (error) {
                console.error("Error fetching popup configuration", error);
            }
        };

        fetchPopupConfig();
    }, []);

    const click_publication = async () => {
        try {
            const apiClient = setupAPIClient();
            await apiClient.patch(`/marketing_publication/${popupData?.id}/clicks`);
        } catch (error) {
            console.log(error);
        }
    }

    if (!isVisible || !popupData) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div
                className="relative p-6 rounded-lg shadow-lg max-w-md w-11/12 sm:w-96 text-center"
                style={{ background: colors?.fundo_popup_marketing || "#FFFFFF" }}
            >
                <button
                    className="absolute top-2 right-2 text-red-500 font-extrabold text-lg hover:text-red-400 focus:outline-none"
                    onClick={() => setIsVisible(false)}
                >
                    &#x2715;
                </button>

                {popupData.image_url && (
                    <Image
                        src={popupData.image_url ? `${API_URL}/files/${popupData.image_url}` : noImage}
                        width={150}
                        height={150}
                        alt="Marketing Image"
                        className="w-full h-auto mb-4 rounded"
                    />
                )}
                <h2
                    className="text-lg font-semibold mb-4"
                    style={{ background: colors?.fundo_popup_marketing || "#FFFFFF", color: colors?.texto_popup_marketing || "#FFFFFF" }}
                >
                    {popupData.text_publication}
                </h2>
                {popupData.redirect_url && (
                    <Link
                        href={popupData.redirect_url}
                        onClick={click_publication}
                        className="py-2 px-4 rounded hover:bg-red-600 inline-block"
                        style={{ background: colors?.fundo_botao_popup_marketing || '#dd1818', color: colors?.texto_botao_popup_marketing || "#ffffff" }}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        {popupData.text_button}
                    </Link>
                )}
            </div>
        </div>
    );
}