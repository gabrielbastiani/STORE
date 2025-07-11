"use client";

import { useContext, useEffect, useState } from "react";
import { AuthContextStore } from "@/app/contexts/AuthContextStore"; 
import { setupAPIClient } from "@/services/api";
import Link from "next/link";
import Image from "next/image";
import noImage from '../../../../public/no-image.png';
import { useTheme } from "@/app/contexts/ThemeContext"; 

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface MediasProps {
    id: string;
    name_media: string;
    link: string;
    logo_media: string;
}

export function Footer() {

    const { colors } = useTheme();

    const { configs } = useContext(AuthContextStore);
    const [dataMedias, setDataMedias] = useState<MediasProps[]>([]);

    useEffect(() => {
        async function fetchData() {
            try {
                const apiClient = setupAPIClient();
                const { data } = await apiClient.get<MediasProps[]>("/get/media_social");
                setDataMedias(data || []);
            } catch (error) {
                console.log(error);
            }
        }

        fetchData();
    }, []);

    return (
        <footer
            className="py-6 mt-14 z-50"
            style={{ background: colors?.fundo_rodape || '#1f2937' }}
        >
            <div className="container mx-auto text-center">
                <div className="flex justify-center space-x-6 mb-5">
                    {dataMedias.map((media) => (
                        <div key={media.id}>
                            {media.logo_media ? (
                                <Link
                                    href={media.link ? media.link : ""}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center space-x-2"
                                    style={{ color: colors?.texto_rodape || '#FFFFFF' }}
                                >
                                    <Image
                                        src={media.logo_media ? `${API_URL}/files/${media.logo_media}` : noImage}
                                        alt={media.name_media ? media.name_media : ""}
                                        width={50}
                                        height={50}
                                        className="w-6 h-6"
                                    />
                                </Link>
                            ) :
                                <Link
                                    href={media.link ? media.link : ""}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center space-x-2"
                                    style={{ color: colors?.texto_rodape || '#FFFFFF' }}
                                >
                                    {media.name_media}
                                </Link>
                            }
                        </div>
                    ))}
                </div>
                <Link
                    href="/politicas_de_privacidade"
                    className="mb-5"
                    style={{ color: colors?.primaryColor || '#ffffff' }}
                >
                    Politicas de privacidade
                </Link>
                <p className="mb-4">
                    &copy; {new Date().getFullYear()}{" "}
                    {configs?.name ? configs?.name : "Loja"}. Todos os direitos
                    reservados.
                </p>
            </div>
        </footer>
    );
}