'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { FiShoppingCart, FiFilter } from 'react-icons/fi'
import { setupAPIClient } from '@/services/api'
import { useTheme } from '@/app/contexts/ThemeContext'
import { FooterStore } from '@/app/components/footer/footerStore'
import { NavbarStore } from '@/app/components/navbar/navbarStore'

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

type ProductResp = {
    id: string
    name: string
    slug: string
    brand?: string
    price_per: number
    price_of?: number | null
    stock: number
    images: { url: string }[]
    primaryImage?: string | null
    variants?: any[]
}

export default function CategoryPageClient({ params }: { params: Promise<{ slugCategory: string }> }) {

    const { colors } = useTheme();

    const { slugCategory } = React.use(params)
    const searchParams = useSearchParams()
    const router = useRouter()

    const slug = slugCategory

    console.log(slug)

    const apiClient = setupAPIClient()

    // estado
    const [loading, setLoading] = useState(false)
    const [products, setProducts] = useState<ProductResp[]>([])
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState<number>(Number(searchParams.get('page') ?? 1))
    const [perPage] = useState<number>(Number(searchParams.get('perPage') ?? 12))
    const [q, setQ] = useState<string>(searchParams.get('q') ?? '')
    const [brand, setBrand] = useState<string | null>(searchParams.get('brand') ?? null)
    const [minPrice, setMinPrice] = useState<number | ''>(searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : '')
    const [maxPrice, setMaxPrice] = useState<number | ''>(searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : '')
    const [sort, setSort] = useState<any>(searchParams.get('sort') ?? 'maisVendidos')

    // helpers
    function updateUrlParams(newParams: Record<string, any>) {
        const sp = new URLSearchParams(Array.from(searchParams.entries()))
        Object.keys(newParams).forEach((k) => {
            const v = newParams[k]
            if (v === null || v === undefined || v === '') {
                sp.delete(k)
            } else {
                sp.set(k, String(v))
            }
        })
        // navega sem recarregar (client route)
        router.push(`${window.location.pathname}?${sp.toString()}`)
    }

    async function loadProducts() {
        if (!slug) return
        setLoading(true)
        try {
            const params: any = {
                page,
                perPage,
                sort,
            }
            if (q) params.q = q
            if (brand) params.brand = brand
            if (minPrice !== '') params.minPrice = minPrice
            if (maxPrice !== '') params.maxPrice = maxPrice

            const resp = await apiClient.get(`/categories/${encodeURIComponent(slug)}/products`, { params })
            const data = resp.data
            setProducts(data.products ?? [])
            setTotal(data.total ?? 0)
        } catch (err) {
            console.error(err)
            setProducts([])
            setTotal(0)
        } finally {
            setLoading(false)
        }
    }

    // sincroniza quando slug, page, sort, filtros mudam
    useEffect(() => {
        loadProducts()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [slug, page, sort, brand, minPrice, maxPrice, q])

    // atualizar estado quando a URL for alterada (back / forward)
    useEffect(() => {
        const p = Number(searchParams.get('page') ?? 1)
        if (p !== page) setPage(p)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams.toString()])

    // items para UI
    const pagesCount = Math.ceil(total / perPage)

    return (
        <>
            <NavbarStore />
            <main
                className="container mx-auto px-4 py-6"
                style={{ background: colors?.segundo_fundo_layout_site || '#e1e4e9' }}
            >
                <div className="flex gap-6">
                    {/* Sidebar filtros */}
                    <aside className="w-72 hidden lg:block">
                        <div className="bg-white rounded shadow p-4 sticky top-6">
                            <h4 className="font-semibold mb-2">Filtrar por</h4>

                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-1">Busca</label>
                                <input
                                    type="text"
                                    value={q}
                                    onChange={(e) => setQ(e.target.value)}
                                    onBlur={() => { setPage(1); updateUrlParams({ q, page: 1 }) }}
                                    className="w-full border rounded px-3 py-2 text-sm"
                                    placeholder="Procurar produto..."
                                />
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-1">Marca</label>
                                <input
                                    value={brand ?? ''}
                                    onChange={(e) => setBrand(e.target.value || null)}
                                    onBlur={() => { setPage(1); updateUrlParams({ brand, page: 1 }) }}
                                    className="w-full border rounded px-3 py-2 text-sm"
                                    placeholder="Ex: Sumig"
                                />
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-1">Preço mínimo</label>
                                <input
                                    type="number"
                                    value={minPrice as number | ''}
                                    onChange={(e) => setMinPrice(e.target.value === '' ? '' : Number(e.target.value))}
                                    onBlur={() => { setPage(1); updateUrlParams({ minPrice, page: 1 }) }}
                                    className="w-full border rounded px-3 py-2 text-sm"
                                    placeholder="0"
                                />
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-1">Preço máximo</label>
                                <input
                                    type="number"
                                    value={maxPrice as number | ''}
                                    onChange={(e) => setMaxPrice(e.target.value === '' ? '' : Number(e.target.value))}
                                    onBlur={() => { setPage(1); updateUrlParams({ maxPrice, page: 1 }) }}
                                    className="w-full border rounded px-3 py-2 text-sm"
                                    placeholder="99999"
                                />
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => { setPage(1); updateUrlParams({ page: 1 }); loadProducts(); }}
                                    className="flex-1 bg-gray-100 border rounded py-2 text-sm"
                                >
                                    Aplicar
                                </button>
                                <button
                                    onClick={() => {
                                        setBrand(null); setMinPrice(''); setMaxPrice(''); setQ(''); setPage(1);
                                        updateUrlParams({ brand: null, minPrice: null, maxPrice: null, q: null, page: 1 });
                                    }}
                                    className="flex-1 bg-red-600 text-white rounded py-2 text-sm"
                                >
                                    Limpar
                                </button>
                            </div>
                        </div>
                    </aside>

                    {/* Conteúdo principal */}
                    <section className="flex-1">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
                            <div>
                                <p className="text-sm text-gray-600">Foram encontrados <strong>{total}</strong> produtos</p>
                                <h1 className="text-2xl font-bold mt-1">{slug?.replace('-', ' ')}</h1>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="hidden sm:flex items-center border rounded px-2 py-1 gap-2">
                                    <label className="text-sm">Ordenar por:</label>
                                    <select value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); updateUrlParams({ sort: e.target.value, page: 1 }) }} className="text-sm">
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

                        {/* GRID */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {loading && <div className="col-span-full">Carregando produtos...</div>}
                            {!loading && products.length === 0 && <div className="col-span-full">Nenhum produto encontrado.</div>}

                            {products.map((product) => {
                                const hasOffer = !!product.price_of && product.price_of > product.price_per
                                const discountPercentage = hasOffer ? Math.round(((product.price_of! - product.price_per) / (product.price_of!)) * 100) : 0
                                const formattedPricePer = product.price_per.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                                const formattedPriceOf = product.price_of ? product.price_of.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : null
                                const formattedInstallment = (Math.round((product.price_per / 12) * 100) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                                const primaryImage = product.primaryImage ?? product.images?.[0]?.url ?? '/placeholder.png'

                                return (
                                    <div key={product.id} className="relative rounded shadow p-4 hover:shadow-lg transition flex flex-col h-[420px]" style={{ background: '#e5e9ee' }}>
                                        {hasOffer && (
                                            <div className="absolute top-2 left-2 bg-red-600 text-white text-xs uppercase font-bold px-2 py-1 rounded">
                                                -{discountPercentage}% OFF
                                            </div>
                                        )}

                                        <Link href={`/produto/${product.slug}`} className="block">
                                            <Image
                                                src={`${API_URL}/files/${primaryImage}`}
                                                alt={product.name}
                                                width={280}
                                                height={200}
                                                quality={100}
                                                className="w-full h-48 object-cover rounded mb-2"
                                            />
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
                                                    <QuantitySelector productId={product.id} onAdd={() => {
                                                        // chamar seu cart (integração): window.__INTEGRATION_addToCart etc.
                                                        alert(`Adicionar ${product.name}`)
                                                    }} />
                                                    <button className="ml-2 flex items-center justify-center flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold py-2 rounded transition">
                                                        <FiShoppingCart className="mr-2 text-lg" />
                                                        Adicionar
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* pagination */}
                        <div className="mt-6 flex items-center justify-center gap-2">
                            <button onClick={() => { if (page > 1) { setPage(page - 1); updateUrlParams({ page: page - 1 }) } }} className="px-3 py-2 border rounded disabled:opacity-50" disabled={page === 1}>Anterior</button>
                            <span className="px-3 py-2">{page} / {pagesCount || 1}</span>
                            <button onClick={() => { if (page < pagesCount) { setPage(page + 1); updateUrlParams({ page: page + 1 }) } }} className="px-3 py-2 border rounded" disabled={page >= pagesCount}>Próxima</button>
                        </div>
                    </section>
                </div>
            </main>
            <FooterStore />
        </>
    )
}

/* QuantitySelector: reuse do cartão */
function QuantitySelector({ productId, onAdd }: { productId: string, onAdd?: () => void }) {
    const [quantity, setQuantity] = useState(1)
    return (
        <div className="flex items-center border rounded border-gray-400">
            <button onClick={() => setQuantity(q => Math.max(1, q - 1))} disabled={quantity <= 1} className="px-2 py-1 disabled:opacity-50 text-gray-400">–</button>
            <span className="px-4 text-gray-500">{quantity}</span>
            <button onClick={() => setQuantity(q => q + 1)} className="px-2 py-1 text-gray-400">+</button>
            <button
                onClick={() => onAdd?.()}
                className="ml-2 px-3 py-1 bg-gray-100 rounded text-sm"
                title="Adicionar quantidade"
            >
                OK
            </button>
        </div>
    )
}