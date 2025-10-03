// app/busca/page.tsx - Versão final completa
'use client'

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { setupAPIClient } from "@/services/api";
import CategoryFilters from "../../components/categoryFilters/index";
import { NavbarStore } from "@/app/components/navbar/navbarStore";
import { FooterStore } from "@/app/components/footer/footerStore";
import { ProductFormData } from "Types/types";
import { useTheme } from "@/app/contexts/ThemeContext";
import StoreLayout from "@/app/components/layouts/storeLayout";
import { SlideBannerClient } from "@/app/components/slideBannerClient";
import { PublicationSidebarClient } from "@/app/components/publicationSidebarClient";
import MarketingPopup from "@/app/components/popups/marketingPopup";
import CardsProductsCategory from "@/app/components/category/CardsProductsCategory";

export default function SearchPage() {
    const searchParams = useSearchParams();
    const { colors } = useTheme();
    const router = useRouter();

    const query = searchParams.get("query") || searchParams.get("q") || "";
    
    const apiClient = setupAPIClient();

    const [loading, setLoading] = useState(false);
    const [products, setProducts] = useState<ProductFormData[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState<number>(Number(searchParams.get("page") ?? 1));
    const [perPage] = useState<number>(Number(searchParams.get("perPage") ?? 12));
    const [sort, setSort] = useState<string>(searchParams.get("sort") ?? "maisVendidos");
    const [brand, setBrand] = useState<string | null>(searchParams.get("brand") ?? null);
    const [minPrice, setMinPrice] = useState<number | "">(searchParams.get("minPrice") ? Number(searchParams.get("minPrice")) : "");
    const [maxPrice, setMaxPrice] = useState<number | "">(searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : "");
    const [isFiltersOpen, setIsFiltersOpen] = useState(false);

    const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>(() => {
        const raw = searchParams.get("filters");
        if (raw) {
            try {
                const decoded = decodeURIComponent(raw);
                return JSON.parse(decoded);
            } catch {
                try {
                    return JSON.parse(raw);
                } catch {
                    return {};
                }
            }
        }
        return {};
    });

    const handleFiltersChange = useCallback((next: Record<string, string[]>) => {
        setSelectedFilters(next);
    }, []);

    const loadProducts = useCallback(
        async (opts?: { page?: number }) => {
            if (!query) {
                setProducts([]);
                setTotal(0);
                return;
            }
            
            setLoading(true);
            try {
                const params: any = {
                    page: opts?.page ?? page,
                    perPage,
                    sort,
                    q: query,
                };
                if (brand) params.brand = brand;
                if (minPrice !== "") params.minPrice = minPrice;
                if (maxPrice !== "") params.maxPrice = maxPrice;
                if (Object.keys(selectedFilters).length > 0) {
                    params.filters = JSON.stringify(selectedFilters);
                }

                const resp = await apiClient.get("/products/busca", { params });
                const data = resp.data;
                setProducts(data.data ?? []);
                setTotal(data.meta?.total ?? 0);
                if (opts?.page) setPage(opts.page);
            } catch (err) {
                console.error("[SearchPage] loadProducts error:", err);
                setProducts([]);
                setTotal(0);
            } finally {
                setLoading(false);
            }
        },
        [query, page, perPage, sort, brand, minPrice, maxPrice, selectedFilters, apiClient]
    );

    function updateUrlParams(newParams: Record<string, any>) {
        const sp = new URLSearchParams(Array.from(searchParams.entries()));
        
        // Mantém o parâmetro de busca principal
        if (query) {
            sp.set("query", query);
        }
        
        Object.keys(newParams).forEach((k) => {
            const v = newParams[k];
            if (v === null || v === undefined || v === "") sp.delete(k);
            else sp.set(k, String(v));
        });
        
        if (newParams.filters && typeof newParams.filters !== "string") {
            sp.set("filters", encodeURIComponent(JSON.stringify(newParams.filters)));
        }
        
        const queryString = sp.toString();
        if (typeof window !== "undefined") {
            router.push(`/busca${queryString ? `?${queryString}` : ""}`);
        }
    }

    useEffect(() => {
        if (query) {
            loadProducts({ page: Number(searchParams.get("page") ?? 1) });
        } else {
            setProducts([]);
            setTotal(0);
        }
    }, [query]);

    useEffect(() => {
        const rawFilters = searchParams.get("filters");
        if (rawFilters) {
            try {
                const parsed = JSON.parse(decodeURIComponent(rawFilters));
                setSelectedFilters(parsed);
            } catch {
                try {
                    setSelectedFilters(JSON.parse(rawFilters));
                } catch { }
            }
        }
        setPage(Number(searchParams.get("page") ?? 1));
        setSort(searchParams.get("sort") ?? "maisVendidos");
        setBrand(searchParams.get("brand") ?? null);
        setMinPrice(searchParams.get("minPrice") ? Number(searchParams.get("minPrice")) : "");
        setMaxPrice(searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : "");

        if (query) loadProducts({ page: Number(searchParams.get("page") ?? 1) });
    }, [query]);

    useEffect(() => {
        updateUrlParams({
            filters: Object.keys(selectedFilters).length ? selectedFilters : null,
            page: 1,
        });
        setPage(1);
        if (query) loadProducts({ page: 1 });
    }, [selectedFilters]);

    const pagesCount = Math.ceil(total / perPage);

    return (
        <StoreLayout
            navbar={<NavbarStore />}
            bannersSlide={<SlideBannerClient position="SLIDER" local='Pagina_busca' local_site='Pagina_busca' />}
            footer={<FooterStore />}
            local='Pagina_busca'
            sidebar_publication={<PublicationSidebarClient local='Pagina_busca' />}
        >
            <div className={`fixed inset-0 z-50 transform transition-transform duration-300 ease-in-out lg:hidden ${isFiltersOpen ? "translate-x-0" : "-translate-x-full"}`}>
                <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setIsFiltersOpen(false)} />
                <div className="absolute left-0 top-0 h-full w-4/5 max-w-sm bg-white z-50 shadow-lg overflow-y-auto">
                    <div className="sticky top-0 bg-white z-10 p-4 border-b flex justify-between items-center">
                        <h3 className="font-semibold text-lg text-black">Filtros</h3>
                        <button onClick={() => setIsFiltersOpen(false)} className="p-1 rounded-full hover:bg-gray-100">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <div className="p-4">
                        <CategoryFilters 
                            slug={query} 
                            selectedFilters={selectedFilters} 
                            onChange={handleFiltersChange}
                            searchMode={true}
                        />
                    </div>
                </div>
            </div>

            <div className="flex gap-6">
                <aside className="w-72 hidden lg:block">
                    <CategoryFilters 
                        slug={query} 
                        selectedFilters={selectedFilters} 
                        onChange={handleFiltersChange}
                        searchMode={true}
                    />
                </aside>

                <section className="flex-1">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
                        <div>
                            <p className="text-sm text-gray-600">
                                {query ? (
                                    <>Foram encontrados <strong>{total}</strong> produtos para &ldquo;{query}&rdquo;</>
                                ) : (
                                    <>Digite algo para buscar</>
                                )}
                            </p>
                            <h1 className="text-2xl font-bold mt-1 text-black">
                                {query ? `Resultados da busca: ${query}` : 'Busca de produtos'}
                            </h1>
                        </div>

                        <div className="flex items-center gap-3 text-black">
                            <div className="hidden sm:flex items-center border rounded px-2 py-1 gap-2">
                                <label className="text-sm text-black">Ordenar por:</label>
                                <select
                                    value={sort}
                                    onChange={(e) => {
                                        setSort(e.target.value);
                                        updateUrlParams({ sort: e.target.value, page: 1 });
                                        if (query) loadProducts({ page: 1 });
                                    }}
                                    className="text-sm p-3"
                                >
                                    <option value="maisVendidos">Mais Vendidos</option>
                                    <option value="nomeAsc">Nome A-Z</option>
                                    <option value="nomeDesc">Nome Z-A</option>
                                    <option value="menor">Menor Preço</option>
                                    <option value="maior">Maior Preço</option>
                                    <option value="maiorDesconto">Maiores Descontos</option>
                                </select>
                            </div>

                            <button 
                                className="sm:hidden flex items-center gap-2 px-3 py-2 border rounded" 
                                onClick={() => setIsFiltersOpen(true)}
                            >
                                Filtrar
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {loading && <div className="col-span-full text-center py-8">Carregando produtos...</div>}
                        {!loading && products.length === 0 && query && (
                            <div className="col-span-full text-center py-8">
                                Nenhum produto encontrado para &ldquo;{query}&rdquo;
                            </div>
                        )}
                        {!loading && !query && (
                            <div className="col-span-full text-center py-8">
                                Digite algo para buscar
                            </div>
                        )}

                        {products.map((product) => (
                            <CardsProductsCategory key={product.id} product={product} colors={colors} />
                        ))}
                    </div>

                    {pagesCount > 1 && (
                        <div className="mt-6 flex items-center justify-center gap-2 text-black">
                            <button
                                onClick={() => {
                                    if (page > 1) {
                                        setPage(page - 1);
                                        updateUrlParams({ page: page - 1 });
                                        if (query) loadProducts({ page: page - 1 });
                                    }
                                }}
                                className="px-3 py-2 border rounded disabled:opacity-50 bg-orange-500 text-white"
                                disabled={page === 1}
                            >
                                Anterior
                            </button>
                            <span className="px-3 py-2">
                                {page} / {pagesCount || 1}
                            </span>
                            <button
                                onClick={() => {
                                    if (page < pagesCount) {
                                        setPage(page + 1);
                                        updateUrlParams({ page: page + 1 });
                                        if (query) loadProducts({ page: page + 1 });
                                    }
                                }}
                                className="px-3 py-2 border rounded bg-orange-500 text-white"
                                disabled={page >= pagesCount}
                            >
                                Próxima
                            </button>
                        </div>
                    )}
                </section>
            </div>

            <MarketingPopup position="POPUP" local="Pagina_busca" />
        </StoreLayout>
    );
}