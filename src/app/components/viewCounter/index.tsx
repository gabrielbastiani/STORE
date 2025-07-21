'use client';

import { useEffect } from 'react';
import { setupAPIClient } from "@/services/api";

interface ViewCounterProps {
    product_id: string;
}

export default function ViewCounter({ product_id }: ViewCounterProps) {
    useEffect(() => {
        const registerView = async () => {
            try {
                await setupAPIClient().patch(`/product/${product_id}/views`);
            } catch (error) {
                console.error('Error registering view:', error);
            }
        };

        if (product_id) {
            registerView();
        }
    }, [product_id]);

    return null;
}