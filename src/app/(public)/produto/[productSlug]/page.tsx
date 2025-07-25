"use client";

import React from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { setupAPIClient } from "@/services/api";
import { ProductFormData } from "Types/types";
import ViewCounter from "@/app/components/viewCounter";

const STORAGE_KEY = "recently_viewed";

export default function ProductPage({
    params,
}: {
    params: Promise<{ productSlug: string }>
}) {
    
    const router = useRouter();

    const { productSlug } = React.use(params);

    const [product, setProduct] = useState<ProductFormData | null>(null);
    const [loading, setLoading] = useState(true);

    // 1. Busca os dados completos do produto
    useEffect(() => {
        async function loadProduct() {
            try {
                const api = setupAPIClient();
                const { data } = await api.get<ProductFormData>(
                    `/product/page?productSlug=${productSlug}`
                );
                setProduct(data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        loadProduct();
    }, [productSlug]);

    // 2. Assim que tivermos o `product.id`, gravamos no localStorage
    useEffect(() => {
        if (!product) return;
        const raw = localStorage.getItem(STORAGE_KEY) || "[]";
        const arr: string[] = JSON.parse(raw);
        arr.push(product.id || "");
        // opcional: manter único e limitar tamanho
        const unique = Array.from(new Set(arr.reverse())).reverse().slice(-10);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(unique));
    }, [product]);

    if (loading) {
        return <p>Carregando produto…</p>;
    }
    if (!product) {
        return <p>Produto não encontrado.</p>;
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold mb-4">{product.name}</h1>
            
            <ViewCounter product_id={product.id || ""} />
            
        </div>
    );
}