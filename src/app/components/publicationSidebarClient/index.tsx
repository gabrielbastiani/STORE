"use client";

import { useEffect, useState } from "react";
import { setupAPIClient } from "@/services/api"; 
import PublicationSidebar from "./publicationSidebar"; 

interface ClientSidebar {
    local: string;
}

export const PublicationSidebarClient = ({ local }: ClientSidebar) => {

    const [sidebar_publication, setSidebar_publication] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            const apiClient = setupAPIClient();
            try {
                const [sidebar] = await Promise.all([
                    apiClient.get<any>(`/marketing_publication/existing_sidebar?local=${local}`)
                ]);
                setSidebar_publication(sidebar.data || []);
            } catch (error) {
                console.error("Erro ao buscar sidebar_publication:", error);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, []);

    return <PublicationSidebar existing_sidebar={sidebar_publication} />
};