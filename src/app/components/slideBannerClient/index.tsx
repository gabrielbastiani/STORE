"use client";

import { useEffect, useState } from "react";
import { setupAPIClient } from "@/services/api"; 
import { SlideBanner } from "./slideBanner"; 

interface ClientSlideBaners {
    position: string;
    local: string;
    local_site: string;
}

export const SlideBannerClient = ({ position, local_site, local }: ClientSlideBaners) => {

    const [banners, setBanners] = useState([]);
    const [intervalTime, setIntervalTime] = useState(5000);

    useEffect(() => {
        const fetchData = async () => {
            const apiClient = setupAPIClient();
            try {
                const [bannersRes, intervalRes] = await Promise.all([
                    apiClient.get<any>(`/marketing_publication/store_publications/slides?position=${position}&local=${local}`),
                    apiClient.get<any>(`/marketing_publication/interval_banner/page_banner?local_site=${local_site}`)
                ]);
                setBanners(bannersRes.data);
                setIntervalTime(intervalRes.data?.interval_banner || 5000);
            } catch (error) {
                console.error("Erro ao buscar banners:", error);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 15000);
        return () => clearInterval(interval);
    }, []);

    return banners.length >= 1 ? (
        <SlideBanner
            position={position}
            local={local}
            banners={banners}
            intervalTime={intervalTime}
        />
    ) : null;
};