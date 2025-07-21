"use client";

import { useEffect, useState } from "react";
import { setupAPIClient } from "@/services/api"; 
import { MosaicSlider } from "./mosaicSlider";


interface ClientMosaic {
    local: string;
}

export const MosaicSliderClient = ({ local }: ClientMosaic) => {

    const [mosaic_publication, setMosaic_publication] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            const apiClient = setupAPIClient();
            try {
                const [mosaic] = await Promise.all([
                    apiClient.get<any>(`/marketing_publication/existing_mosaic?local=${local}`)
                ]);
                setMosaic_publication(mosaic.data || []);
            } catch (error) {
                console.error("Erro ao buscar mosaic_publication:", error);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, []);

    return <MosaicSlider existingMosaic={mosaic_publication} />
};