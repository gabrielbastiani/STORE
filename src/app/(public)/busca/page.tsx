"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { setupAPIClient } from "@/services/api";
import Link from "next/link";
import Image from "next/image";
import noImage from "../../../../public/no-image.png";

type ProductWithRelations = {
    id: string;
    name: string;
    slug: string | null;
    description: string;
    price_per: number;
    images: { url: string }[];
    brand: string | null;
};

export default function SearchPage() {

    const params = useSearchParams();
    const query = params.get("query") || "";
    const [products, setProducts] = useState<ProductWithRelations[]>([]);
    const [loading, setLoading] = useState(false);
    const [meta, setMeta] = useState({ total: 0, page: 1, perPage: 20, totalPages: 1 });

    useEffect(() => {
        if (!query) return;
        setLoading(true);
        const api = setupAPIClient();
        api
            .get<{
                data: ProductWithRelations[];
                meta: { total: number; page: number; perPage: number; totalPages: number };
            }>("/products/busca", {
                params: { q: query, page: 1, perPage: 20 },
            })
            .then((res) => {
                setProducts(res.data.data);
                setMeta(res.data.meta);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [query]);

    return (
        <main className="px-4 py-8">
            <h1 className="text-2xl mb-4">Resultados para “{query}”</h1>
            {loading && <p>Carregando…</p>}
            {!loading && products.length === 0 && <p>Nenhum produto encontrado.</p>}
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {products.map((p) => (
                    <li key={p.id} className="border p-4 rounded">
                        <Link href={`/produto/${p.slug}`} className="block">
                            <Image
                                src={p.images[0]?.url ? `${process.env.NEXT_PUBLIC_API_URL}/files/${p.images[0].url}` : noImage}
                                alt={p.name}
                                width={200}
                                height={200}
                                className="object-cover mb-2 w-full h-48"
                            />
                            <h2 className="font-semibold">{p.name}</h2>
                            <p className="text-orange-600 font-bold">R$ {p.price_per.toFixed(2)}</p>
                        </Link>
                    </li>
                ))}
            </ul>
            {/* aqui você pode adicionar paginação usando `meta` */}
        </main>
    );
}