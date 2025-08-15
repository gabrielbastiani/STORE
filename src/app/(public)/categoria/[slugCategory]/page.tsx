'use client'

import React, { useEffect, useCallback, useState } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { FiShoppingCart, FiFilter } from 'react-icons/fi'
import { setupAPIClient } from '@/services/api'
import CategoryFilters from '@/app/components/categoryFilters'
import { NavbarStore } from '@/app/components/navbar/navbarStore'
import { FooterStore } from '@/app/components/footer/footerStore'
import { ProductFormData } from 'Types/types'
import { useTheme } from '@/app/contexts/ThemeContext'

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

export default function CategoryPageClient() {
    const paramsAny = useParams() as any
    const searchParams = useSearchParams()
    const { colors } = useTheme();
    const router = useRouter()

    const rawSlug =
        paramsAny?.slug ??
        paramsAny?.slugCategory ??
        paramsAny?.slugCategoria ??
        null

    const clientFallbackSlug = typeof window !== 'undefined' ? window.location.pathname.split('/').filter(Boolean).pop() : null
    const slug = rawSlug ?? clientFallbackSlug ?? undefined

    const apiClient = setupAPIClient()

    const [loading, setLoading] = useState(false)
    const [products, setProducts] = useState<ProductFormData[]>([])
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState<number>(Number(searchParams.get('page') ?? 1))
    const [perPage] = useState<number>(Number(searchParams.get('perPage') ?? 12))
    const [sort, setSort] = useState<string>(searchParams.get('sort') ?? 'maisVendidos')
    const [q, setQ] = useState<string>(searchParams.get('q') ?? '')
    const [brand, setBrand] = useState<string | null>(searchParams.get('brand') ?? null)
    const [minPrice, setMinPrice] = useState<number | ''>(searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : '')
    const [maxPrice, setMaxPrice] = useState<number | ''>(searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : '')

    const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>(() => {
        const raw = searchParams.get('filters')
        if (raw) {
            try {
                const decoded = decodeURIComponent(raw)
                return JSON.parse(decoded)
            } catch {
                try { return JSON.parse(raw) } catch { return {} }
            }
        }
        return {}
    })

    const loadProducts = useCallback(async (opts?: { page?: number }) => {
        if (!slug) return
        setLoading(true)
        try {
            const params: any = {
                page: opts?.page ?? page,
                perPage,
                sort,
            }
            if (q) params.q = q
            if (brand) params.brand = brand
            if (minPrice !== '') params.minPrice = minPrice
            if (maxPrice !== '') params.maxPrice = maxPrice
            if (Object.keys(selectedFilters).length > 0) {
                params.filters = JSON.stringify(selectedFilters)
            }

            const resp = await apiClient.get(`/categories/${encodeURIComponent(slug)}/products`, { params })
            const data = resp.data
            setProducts(data.products ?? [])
            setTotal(data.total ?? 0)
            if (opts?.page) setPage(opts.page)
        } catch (err) {
            console.error('[CategoryPage] loadProducts error:', err)
            setProducts([])
            setTotal(0)
        } finally {
            setLoading(false)
        }
    }, [slug, page, perPage, sort, q, brand, minPrice, maxPrice, selectedFilters, apiClient])

    function updateUrlParams(newParams: Record<string, any>) {
        const sp = new URLSearchParams(Array.from(searchParams.entries()))
        Object.keys(newParams).forEach((k) => {
            const v = newParams[k]
            if (v === null || v === undefined || v === '') sp.delete(k)
            else sp.set(k, String(v))
        })
        if (newParams.filters && typeof newParams.filters !== 'string') {
            sp.set('filters', encodeURIComponent(JSON.stringify(newParams.filters)))
        }
        const query = sp.toString()
        if (typeof window !== 'undefined') {
            router.push(`${window.location.pathname}${query ? `?${query}` : ''}`)
        }
    }

    useEffect(() => {
        const rawFilters = searchParams.get('filters')
        if (rawFilters) {
            try {
                const parsed = JSON.parse(decodeURIComponent(rawFilters))
                setSelectedFilters(parsed)
            } catch {
                try { setSelectedFilters(JSON.parse(rawFilters)) } catch { }
            }
        }
        setPage(Number(searchParams.get('page') ?? 1))
        setSort(searchParams.get('sort') ?? 'maisVendidos')
        setQ(searchParams.get('q') ?? '')
        setBrand(searchParams.get('brand') ?? null)
        setMinPrice(searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : '')
        setMaxPrice(searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : '')

        if (slug) loadProducts({ page: Number(searchParams.get('page') ?? 1) })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [slug])

    useEffect(() => {
        updateUrlParams({ filters: Object.keys(selectedFilters).length ? selectedFilters : null, page: 1 })
        setPage(1)
        if (slug) loadProducts({ page: 1 })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedFilters])

    const pagesCount = Math.ceil(total / perPage)

    return (
        <>
            <NavbarStore />
            <main className="container mx-auto px-4 py-6" style={{ background: colors?.fundo_posts_mais_vizualizados || "#e5e9ee" }}>
                <div className="flex gap-6">
                    <aside className="w-72 hidden lg:block">
                        <CategoryFilters slug={slug ?? ''} selectedFilters={selectedFilters} onChange={(next) => setSelectedFilters(next)} />
                    </aside>

                    <section className="flex-1">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
                            <div>
                                <p className="text-sm text-gray-600">Foram encontrados <strong>{total}</strong> produtos</p>
                                <h1 className="text-2xl font-bold mt-1 text-black">{(slug ?? '').replace('-', ' ')}</h1>
                            </div>

                            <div className="flex items-center gap-3 text-black">
                                <div className="hidden sm:flex items-center border rounded px-2 py-1 gap-2">
                                    <label className="text-sm text-black">Ordenar por:</label>
                                    <select value={sort} onChange={(e) => { setSort(e.target.value); updateUrlParams({ sort: e.target.value, page: 1 }); if (slug) loadProducts({ page: 1 }) }} className="text-sm">
                                        <option value="maisVendidos">Mais Vendidos</option>
                                        <option value="nomeAsc">Nome A-Z</option>
                                        <option value="nomeDesc">Nome Z-A</option>
                                        <option value="menor">Menor Preço</option>
                                        <option value="maior">Maior Preço</option>
                                        <option value="maiorDesconto">Maiores Descontos</option>
                                    </select>
                                </div>

                                <button className="sm:hidden flex items-center gap-2 px-3 py-2 border rounded" onClick={() => alert('Abra o filtro (implemente um drawer responsivo conforme seu projeto)')}>
                                    <FiFilter /> Filtrar
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {loading && <div className="col-span-full text-red-400">Carregando produtos...</div>}
                            {!loading && products.length === 0 && <div className="col-span-full">Nenhum produto encontrado.</div>}

                            {products.map((product) => {
                                const hasOffer = !!product.price_of && product.price_of > product.price_per!
                                const discountPercentage = hasOffer ? Math.round(((product.price_of! - product.price_per!) / (product.price_of!)) * 100) : 0
                                const formattedPricePer = product.price_per!.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                                const formattedPriceOf = product.price_of ? product.price_of.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : null
                                const formattedInstallment = (Math.round((product.price_per! / 12) * 100) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                                const primaryImage = product.primaryImage ?? product.images?.[0]?.url ?? '/placeholder.png'

                                return (
                                    <div key={product.id} className="relative rounded shadow p-4 hover:shadow-lg transition flex flex-col h-[420px]" style={{ background: '#e5e9ee' }}>
                                        {hasOffer && <div className="absolute top-2 left-2 bg-red-600 text-white text-xs uppercase font-bold px-2 py-1 rounded">-{discountPercentage}% OFF</div>}

                                        <Link href={`/produto/${product.slug}`} className="block">
                                            <Image src={`${API_URL}/files/${primaryImage}`} alt={product.name} width={280} height={200} quality={100} className="w-full h-48 object-cover rounded mb-2" />
                                            <h3 className="text-lg font-semibold mb-2 text-black">{product.name}</h3>
                                        </Link>

                                        {product.stock === 0 ? (
                                            <div className="flex items-center justify-center flex-1 bg-white disabled:opacity-50 text-red-600 font-semibold rounded transition">Produto Indisponível</div>
                                        ) : (
                                            <div className="mt-auto">
                                                <div className="flex items-baseline">
                                                    <span className="text-xl font-bold text-red-600">{formattedPricePer}</span>
                                                    {hasOffer && <span className="text-sm text-gray-500 line-through ml-2">{formattedPriceOf}</span>}
                                                </div>
                                                <p className="text-xs text-gray-600 mb-4">12x de {formattedInstallment} sem juros no cartão</p>

                                                <div className="flex items-center">
                                                    <QuantitySelector onAdd={() => alert('Adicionar ao carrinho (integre seu fluxo)')} />
                                                    <button className="ml-2 flex items-center justify-center flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold py-2 rounded transition">
                                                        <FiShoppingCart className="mr-2 text-lg" /> Adicionar
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>

                        <div className="mt-6 flex items-center justify-center gap-2">
                            <button onClick={() => { if (page > 1) { setPage(page - 1); updateUrlParams({ page: page - 1 }); if (slug) loadProducts({ page: page - 1 }) } }} className="px-3 py-2 border rounded disabled:opacity-50" disabled={page === 1}>Anterior</button>
                            <span className="px-3 py-2">{page} / {pagesCount || 1}</span>
                            <button onClick={() => { if (page < pagesCount) { setPage(page + 1); updateUrlParams({ page: page + 1 }); if (slug) loadProducts({ page: page + 1 }) } }} className="px-3 py-2 border rounded" disabled={page >= pagesCount}>Próxima</button>
                        </div>
                    </section>
                </div>
            </main>
            <FooterStore />
        </>
    )
}

/* helper components */

function QuantitySelector({ onAdd }: { onAdd?: () => void }) {
    const [quantity, setQuantity] = useState(1)
    return (
        <div className="flex items-center border rounded border-gray-400">
            <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} disabled={quantity <= 1} className="px-2 py-1 disabled:opacity-50 text-gray-400">–</button>
            <span className="px-4 text-gray-500">{quantity}</span>
            <button onClick={() => setQuantity((q) => q + 1)} className="px-2 py-1 text-gray-400">+</button>
            <button onClick={() => onAdd?.()} className="ml-2 px-3 py-1 bg-gray-100 rounded text-sm" title="Adicionar quantidade">OK</button>
        </div>
    )
}