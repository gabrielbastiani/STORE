"use client"

import { useTheme } from "@/app/contexts/ThemeContext"; 
import { setupAPIClient } from "@/services/api";
import Image from "next/image";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface PublicationProps {
    id: string;
    image_url: string;
    redirect_url: string;
    text_publication: string;
    text_button: string;
}

interface SidebarProps {
    existing_sidebar: PublicationProps[];
}

export default function PublicationSidebar({ existing_sidebar }: SidebarProps) {

    const { colors } = useTheme();

    const click_publication = async (id: string) => {
        try {
            const apiClient = setupAPIClient();
            await apiClient.patch(`/marketing_publication/${id}/clicks`);
        } catch (error) {
            console.log(error);
        }
    }

    return (
        <>
            {existing_sidebar?.map((item: PublicationProps) => (
                <div
                    key={item.id}
                    className="flex flex-col items-center p-4 rounded-lg shadow-lg border border-gray-200 transition-all hover:scale-105 hover:shadow-xl"
                    style={{ background: colors?.blocos_publicidades_sidebar || '#ffffff' }}
                >
                    <Link
                        href={item.redirect_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full"
                        onClick={() => click_publication(item.id)}
                    >
                        <Image
                            src={`${API_URL}/files/${item.image_url}`}
                            alt="marketing_sidebar"
                            width={160}
                            height={220}
                            className="rounded-md object-cover w-full h-40"
                        />
                    </Link>
                    <p
                        className="text-sm font-semibold text-center mt-2"
                        style={{ color: colors?.texto_publicidades_sidebar || '#000000' }}
                    >
                        {item.text_publication}
                    </p>
                    <Link
                        href={item.redirect_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => click_publication(item.id)}
                    >
                        <button
                            className="mt-3 text-sm font-bold py-2 px-4 rounded-lg shadow-md hover:bg-red-600 transition duration-300 uppercase"
                            style={{ background: colors?.fundo_botao_publicidades_sidebar || '#dd1818', color: colors?.texto_botao_publicidades_sidebar || '#FFFFFF' }}
                        >
                            {item.text_button}
                        </button>
                    </Link>

                </div>
            ))}
        </>
    );
}