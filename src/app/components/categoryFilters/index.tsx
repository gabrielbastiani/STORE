'use client'

import React, { useEffect, useState } from 'react'
import { setupAPIClient } from '@/services/api'
import Image from 'next/image';

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

type Option = { id?: string; label: string; value: string; colorCode?: string; iconUrl?: string; altText?: string }
type FilterItem = {
    id: string
    name: string
    fieldName?: string
    type?: 'RANGE' | 'SELECT' | 'MULTI_SELECT'
    displayStyle?: 'SLIDER' | 'DROPDOWN' | 'CHECKBOX'
    dataType?: 'NUMBER' | 'STRING'
    options?: Option[]
    minValue?: number | null
    maxValue?: number | null
    reviewSummary?: { avgRating?: number; countsByRating?: Record<string, number> } | null
}

export default function CategoryFilters({
    slug,
    selectedFilters,
    onChange
}: {
    slug: string,
    selectedFilters: Record<string, string[]>,
    onChange: (next: Record<string, string[]>) => void
}) {
    const [groups, setGroups] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [pendingFilters, setPendingFilters] = useState<Record<string, string[]>>({})
    const [isFilterChanged, setIsFilterChanged] = useState(false)

    // Slider local state (for UI only)
    const [sliderState, setSliderState] = useState<Record<string, { min: number; max: number }>>({})

    useEffect(() => {
        if (!slug) {
            setGroups([])
            return
        }

        setLoading(true)
        const api = setupAPIClient()

        api.get(`/categories/${encodeURIComponent(slug)}/filters`)
            .then(r => {
                const data = r.data?.filters ?? []

                const normGroups: any[] = []
                const nextSliderState: Record<string, { min: number; max: number }> = {}

                for (const g of data) {
                    const normalizedFilters = (g.filters ?? []).map((f: any) => {
                        // Normalize options to shape { id,label,value, colorCode?, iconUrl? }
                        let opts: Option[] = Array.isArray(f.options)
                            ? f.options.map((o: any) => {
                                if (typeof o === 'string') return { id: o, label: o, value: o }
                                const label = o.label ?? o.value ?? String(o.id ?? '')
                                const value = o.value ?? o.id ?? label
                                const id = o.id ?? String(value)
                                // iconUrl can come from o.iconUrl or backend-provided o.image?.url
                                // keep raw string in iconUrl (we'll resolve prefix later)
                                const iconUrl = o.iconUrl ?? (o.image && o.image.url ? o.image.url : undefined)
                                const altText = o.altText ?? (o.image && o.image.altText ? o.image.altText : undefined)
                                const colorCode = o.colorCode ?? undefined
                                return {
                                    id: String(id),
                                    label: String(label),
                                    value: String(value),
                                    colorCode,
                                    iconUrl,
                                    altText
                                }
                            })
                            : []

                        // preserve reviewSummary (if backend sent it)
                        const reviewSummary = f.reviewSummary ?? null

                        // If there are no explicit options but reviewSummary exists (rating case),
                        // create options from counts (5..1)
                        if ((opts.length === 0 || !opts) && reviewSummary && reviewSummary.countsByRating) {
                            const counts = reviewSummary.countsByRating
                            const generated: Option[] = []
                            // prefer descending 5..1
                            for (let star = 5; star >= 1; star--) {
                                const cnt = counts[String(star)] ?? 0
                                generated.push({
                                    id: String(star),
                                    label: `${star} estrela${star > 1 ? 's' : ''} (${cnt})`,
                                    value: String(star)
                                })
                            }
                            opts = generated
                        }

                        // prepare slider state using existing selectedFilters or defaults
                        if (f.type === 'RANGE' && f.displayStyle === 'SLIDER' && (f.minValue !== null || f.maxValue !== null)) {
                            const curSel = selectedFilters[f.id] ?? []
                            const min = curSel[0] ? Number(curSel[0]) : (f.minValue ?? 0)
                            const max = curSel[1] ? Number(curSel[1]) : (f.maxValue ?? (f.minValue ?? 100))
                            nextSliderState[f.id] = { min, max }
                        }

                        return {
                            ...f,
                            options: opts,
                            reviewSummary: reviewSummary
                        }
                    })

                    normGroups.push({
                        group: g.group ?? null,
                        filters: normalizedFilters
                    })
                }

                setGroups(normGroups)
                setSliderState(prev => ({ ...nextSliderState, ...prev }))
                setPendingFilters(selectedFilters)
            })
            .catch(err => {
                console.error('fetch filters', err)
                setGroups([])
            })
            .finally(() => setLoading(false))
    }, [slug])

    // After groups loaded, enrich SKU options with variant images (one call to products)
    useEffect(() => {
        async function enrichSkus() {
            if (!slug) return
            // find SKU filters that have options but missing iconUrl for at least one option
            const skuFiltersInfo: { groupIndex: number, filterIndex: number, filterId: string, missingSkus: string[] }[] = []

            groups.forEach((g, gi) => {
                (g.filters ?? []).forEach((f: any, fi: number) => {
                    const field = (f.fieldName ?? '').toLowerCase()
                    if ((field === 'variant.sku' || field === 'variant_sku' || field === 'sku' || field.includes('variant.sku')) &&
                        Array.isArray(f.options) && f.options.length > 0) {
                        const missing = f.options.filter((o: Option) => !o.iconUrl).map((o: Option) => String(o.value ?? o.id ?? o.label))
                        if (missing.length > 0) {
                            skuFiltersInfo.push({ groupIndex: gi, filterIndex: fi, filterId: f.id, missingSkus: missing })
                        }
                    }
                })
            })

            if (skuFiltersInfo.length === 0) return

            try {
                const api = setupAPIClient()
                // fetch products of this category (big query - adjust perPage if necessary)
                const resp = await api.get(`/categories/${encodeURIComponent(slug)}/products?perPage=2000`)
                const products = resp.data?.products ?? []

                // build map sku -> imageUrl (prefer primary image)
                const skuImageMap = new Map<string, { url: string, altText?: string }>()
                for (const p of products) {
                    for (const v of (p.variants ?? [])) {
                        const sku = String(v.sku ?? '')
                        if (!sku) continue
                        // v.images array contains objects { url, altText, isPrimary }
                        const imgs = v.images ?? []
                        if (imgs.length > 0) {
                            // prefer primary
                            const primary = imgs.find((im: any) => im.isPrimary) ?? imgs[0]
                            if (primary && primary.url) {
                                // store first seen (do not overwrite existing to keep consistent)
                                if (!skuImageMap.has(sku)) skuImageMap.set(sku, { url: String(primary.url), altText: primary.altText ?? String(sku) })
                            }
                        }
                    }
                }

                // update groups with found images
                setGroups(prev => {
                    return prev.map((g: any, gi: number) => {
                        const newFilters = (g.filters ?? []).map((f: any, fi: number) => {
                            const match = skuFiltersInfo.find(s => s.groupIndex === gi && s.filterIndex === fi)
                            if (!match) return f
                            const newOptions = (f.options ?? []).map((opt: Option) => {
                                const optVal = String(opt.value ?? opt.id ?? opt.label)
                                if (opt.iconUrl) return opt // already has image
                                const found = skuImageMap.get(optVal)
                                if (found) {
                                    // normalize to iconUrl (we'll resolve prefix in Thumb)
                                    return { ...opt, iconUrl: found.url, altText: opt.altText ?? found.altText ?? opt.label }
                                }
                                return opt
                            })
                            return { ...f, options: newOptions }
                        })
                        return { ...g, filters: newFilters }
                    })
                })
            } catch (err) {
                console.warn('enrichSkus error', err)
            }
        }

        if (groups.length > 0) enrichSkus()
        // only re-run when groups or slug changes
    }, [groups, slug])

    // Initialize pendingFilters when selectedFilters changes from parent
    useEffect(() => {
        setPendingFilters(selectedFilters)
    }, [selectedFilters])

    // Helpers to update pendingFilters representation (Record<filterId, string[]>)
    function toggleMultiValue(filterId: string, value: string) {
        const cur = pendingFilters[filterId] ?? []
        const next = cur.includes(value) ? cur.filter(v => v !== value) : [...cur, value]
        const out = { ...pendingFilters, [filterId]: next }
        if (next.length === 0) delete out[filterId]
        setPendingFilters(out)
        setIsFilterChanged(true)
    }

    function setSingleValue(filterId: string, value: string | null) {
        const out = { ...pendingFilters }
        if (value === null || value === '') {
            delete out[filterId]
        } else {
            out[filterId] = [String(value)]
        }
        setPendingFilters(out)
        setIsFilterChanged(true)
    }

    function setRange(filterId: string, min: number | null, max: number | null) {
        const val: string[] = []
        if (min !== null) val.push(String(min))
        if (max !== null) val.push(String(max))
        const out = { ...pendingFilters, [filterId]: val }
        setPendingFilters(out)
        setIsFilterChanged(true)
    }

    function handleSliderChange(filterId: string, which: 'min' | 'max', value: number, minLimit?: number, maxLimit?: number) {
        setSliderState(prev => {
            const cur = prev[filterId] ?? { min: minLimit ?? 0, max: maxLimit ?? 100 }
            const next = { ...cur, [which]: which === 'min' ? Math.min(value, cur.max) : Math.max(value, cur.min) }

            // Update pending filters
            setRange(filterId, next.min, next.max)
            return { ...prev, [filterId]: next }
        })
    }

    const applyFilters = () => {
        onChange(pendingFilters)
        setIsFilterChanged(false)
    }

    const clearFilters = () => {
        const emptyFilters = {} as Record<string, string[]>
        setPendingFilters(emptyFilters)
        onChange(emptyFilters)
        setIsFilterChanged(false)

        // Reset slider states
        setSliderState(prev => {
            const newState = { ...prev }
            Object.keys(newState).forEach(key => {
                const filter = groups.flatMap((g: any) => g.filters).find((f: any) => f.id === key)
                if (filter) {
                    newState[key] = {
                        min: filter.minValue ?? 0,
                        max: filter.maxValue ?? (filter.minValue ?? 100)
                    }
                }
            })
            return newState
        })
    }

    if (loading) return <div className="p-4 bg-white rounded shadow text-black">Carregando filtros...</div>

    // Helper render for review summary
    function renderReviewSummary(f: FilterItem | any) {
        if (!f?.reviewSummary) return null
        const avg = Math.round((f.reviewSummary.avgRating ?? 0) * 10) / 10
        const counts = f.reviewSummary.countsByRating ?? {}
        // sort desc by rating
        const keys = Object.keys(counts).sort((a, b) => Number(b) - Number(a))
        // Ensure 5..1 shown even if counts missing
        const guaranteed = [5, 4, 3, 2, 1]
        return (
            <div className="mt-3 text-xs text-gray-600">
                <div className="mb-1">Média: {avg} / 5</div>
                <div className="space-y-1">
                    {guaranteed.map(k => (
                        <div key={k} className="flex items-center gap-2">
                            <span className="w-12 text-xs">{k}★</span>
                            <span className="text-xs text-gray-500">({counts[String(k)] ?? 0})</span>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    // small helper to resolve image src and render thumbnail or placeholder
    function resolveImageSrc(raw?: string) {
        if (!raw) return null
        const trimmed = String(raw)
        // if already absolute url
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed
        // if already looks like a path starting with '/' use as-is
        if (trimmed.startsWith('/')) return `${API_URL}${trimmed}`
        // otherwise assume it's a stored filename/id and use /files/<id>
        return `${API_URL}/files/${trimmed}`
    }

    function Thumb({ opt, size = 28 }: { opt: Option, size?: number }) {
        const src = opt.iconUrl ? resolveImageSrc(opt.iconUrl) : null

        if (src) {
            return (
                // next/image requires domains config for external images. If you have issues, fallback to <img>.
                <Image
                    src={src}
                    alt={opt.altText ?? opt.label}
                    width={size}
                    height={size}
                    title={opt.label}
                    loading="lazy"
                    style={{ width: size, height: size, objectFit: 'cover', borderRadius: 6 }}
                />
            )
        }

        if (opt.colorCode) {
            return <span style={{ width: size, height: size, display: 'inline-block', borderRadius: '50%', background: opt.colorCode, border: '1px solid #ddd' }} aria-hidden />
        }

        // fallback placeholder
        return (
            <div style={{ width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, background: '#f3f3f3', border: '1px solid #e5e5e5' }}>
                <span className="text-xs text-gray-500">{opt.label?.[0] ?? '?'}</span>
            </div>
        )
    }

    return (
        <div className="bg-white rounded shadow text-black h-full flex flex-col">
            {/* Header com título */}
            <div className="p-4 border-b">
                <h3 className="font-semibold text-lg text-black">Filtros</h3>
            </div>

            {/* Conteúdo dos filtros com scroll */}
            <div className="flex-grow overflow-y-auto p-4">
                {groups.length === 0 && <div>Nenhum filtro disponível.</div>}

                {groups.map(group => (
                    <div key={group.group?.id ?? 'ungrouped'} className="mb-4">
                        {group.group && <h4 className="font-semibold mb-2 text-base">{group.group.name}</h4>}

                        {group.filters.map((f: FilterItem) => {
                            const isMulti = f.type === 'MULTI_SELECT'
                            const display = f.displayStyle
                            const dataType = f.dataType
                            const sel = pendingFilters[f.id] ?? []

                            // render helpers that include thumbnails
                            const renderCheckboxes = (allowMultiple: boolean) => (
                                <div className="mt-2 space-y-2">
                                    {Array.isArray(f.options) && f.options.map(opt => {
                                        const optVal = String(opt.value ?? opt.id ?? opt.label)
                                        return (
                                            <label key={optVal} className="flex items-center gap-2 text-sm">
                                                <input
                                                    type="checkbox"
                                                    checked={sel.includes(optVal)}
                                                    onChange={() => toggleMultiValue(f.id, optVal)}
                                                    className="w-4 h-4"
                                                />
                                                <div className="flex items-center gap-2">
                                                    <Thumb opt={opt} />
                                                    <span>{opt.label}</span>
                                                </div>
                                            </label>
                                        )
                                    })}
                                </div>
                            )

                            const renderDropdownSingle = () => {
                                const selected = Array.isArray(f.options) ? f.options.find(o => String(o.value ?? o.id ?? o.label) === (sel[0] ?? '')) : undefined
                                return (
                                    <div className="mt-2 flex items-center gap-2">
                                        <select
                                            value={sel[0] ?? ''}
                                            onChange={(e) => setSingleValue(f.id, e.target.value || null)}
                                            className="p-2 border rounded w-full text-sm"
                                        >
                                            <option value="">— Selecionar —</option>
                                            {Array.isArray(f.options) && f.options.map(opt => (
                                                <option key={String(opt.value ?? opt.id ?? opt.label)} value={String(opt.value ?? opt.id ?? opt.label)}>
                                                    {opt.label}
                                                </option>
                                            ))}
                                        </select>

                                        {/* preview da opção selecionada (mostra imagem quando disponível) */}
                                        {selected && (
                                            <div className="ml-2">
                                                <Thumb opt={selected} />
                                            </div>
                                        )}
                                    </div>
                                )
                            }

                            const renderDropdownMulti = () => (
                                <div>
                                    <select
                                        multiple
                                        value={sel}
                                        onChange={(e) => {
                                            const selected = Array.from(e.target.selectedOptions).map(o => o.value)
                                            const out = { ...pendingFilters, [f.id]: selected }
                                            if (selected.length === 0) delete out[f.id]
                                            setPendingFilters(out)
                                            setIsFilterChanged(true)
                                        }}
                                        className="mt-2 p-2 border rounded w-full text-sm"
                                        style={{ minHeight: 100 }}
                                    >
                                        {Array.isArray(f.options) && f.options.map(opt => (
                                            <option key={String(opt.value ?? opt.id ?? opt.label)} value={String(opt.value ?? opt.id ?? opt.label)}>
                                                {opt.label}
                                            </option>
                                        ))}
                                    </select>

                                    {/* show thumbnails of selected items below select */}
                                    <div className="mt-2 flex gap-2 flex-wrap">
                                        {Array.isArray(f.options) && sel.map(sv => {
                                            const opt = f.options!.find(o => String(o.value ?? o.id ?? o.label) === sv)
                                            if (!opt) return null
                                            return (
                                                <div key={sv} className="flex items-center gap-2 border rounded px-2 py-1 text-xs">
                                                    <Thumb opt={opt} size={20} />
                                                    <span>{opt.label}</span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )
                            // Build the inner body for the filter and then wrap with standard header + reviewSummary
                            let filterBody: React.ReactNode = null

                            // RANGE handling
                            if (f.type === 'RANGE') {
                                // SLIDER for numeric ranges
                                if (display === 'SLIDER' && dataType === 'NUMBER' && (f.minValue !== undefined || f.maxValue !== undefined)) {
                                    const minLimit = f.minValue ?? 0
                                    const maxLimit = f.maxValue ?? (f.minValue ?? 100)
                                    const cur = sliderState[f.id] ?? {
                                        min: pendingFilters[f.id]?.[0] ? Number(pendingFilters[f.id][0]) : minLimit,
                                        max: pendingFilters[f.id]?.[1] ? Number(pendingFilters[f.id][1]) : maxLimit
                                    }

                                    filterBody = (
                                        <div>
                                            <div className="space-y-4">
                                                <div>
                                                    <input
                                                        type="range"
                                                        min={minLimit}
                                                        max={maxLimit}
                                                        value={cur.min}
                                                        onChange={(e) => handleSliderChange(f.id, 'min', Number(e.target.value), minLimit, maxLimit)}
                                                        className="w-full h-2"
                                                    />
                                                </div>

                                                <div>
                                                    <input
                                                        type="range"
                                                        min={minLimit}
                                                        max={maxLimit}
                                                        value={cur.max}
                                                        onChange={(e) => handleSliderChange(f.id, 'max', Number(e.target.value), minLimit, maxLimit)}
                                                        className="w-full h-2"
                                                    />
                                                </div>

                                                <div className="flex gap-2 items-center">
                                                    <input
                                                        type="number"
                                                        value={pendingFilters[f.id]?.[0] ?? cur.min}
                                                        onChange={(e) => {
                                                            const min = e.currentTarget.value ? Number(e.currentTarget.value) : null
                                                            const max = pendingFilters[f.id]?.[1] ? Number(pendingFilters[f.id][1]) : cur.max
                                                            setRange(f.id, min, max)
                                                            setSliderState(prev => ({ ...prev, [f.id]: { min: min ?? cur.min, max: prev[f.id]?.max ?? cur.max } }))
                                                        }}
                                                        className="p-2 border rounded w-full text-sm"
                                                        min={minLimit}
                                                        max={maxLimit}
                                                    />
                                                    <span className="text-sm">até</span>
                                                    <input
                                                        type="number"
                                                        value={pendingFilters[f.id]?.[1] ?? cur.max}
                                                        onChange={(e) => {
                                                            const max = e.currentTarget.value ? Number(e.currentTarget.value) : null
                                                            const min = pendingFilters[f.id]?.[0] ? Number(pendingFilters[f.id][0]) : cur.min
                                                            setRange(f.id, min, max)
                                                            setSliderState(prev => ({ ...prev, [f.id]: { min: prev[f.id]?.min ?? cur.min, max: max ?? cur.max } }))
                                                        }}
                                                        className="p-2 border rounded w-full text-sm"
                                                        min={minLimit}
                                                        max={maxLimit}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )
                                } else {
                                    // fallback numeric range inputs
                                    filterBody = (
                                        <div className="flex gap-2 items-center">
                                            <input
                                                type="number"
                                                placeholder={String(f.minValue ?? 0)}
                                                value={pendingFilters[f.id]?.[0] ?? ''}
                                                onChange={(e) => {
                                                    const min = e.currentTarget.value ? Number(e.currentTarget.value) : null
                                                    const max = pendingFilters[f.id]?.[1] ? Number(pendingFilters[f.id][1]) : (f.maxValue ?? null)
                                                    setRange(f.id, min, max)
                                                }}
                                                className="p-2 border rounded w-full text-sm"
                                            />
                                            <span className="text-sm">até</span>
                                            <input
                                                type="number"
                                                placeholder={String(f.maxValue ?? 0)}
                                                value={pendingFilters[f.id]?.[1] ?? ''}
                                                onChange={(e) => {
                                                    const max = e.currentTarget.value ? Number(e.currentTarget.value) : null
                                                    const min = pendingFilters[f.id]?.[0] ? Number(pendingFilters[f.id][0]) : (f.minValue ?? null)
                                                    setRange(f.id, min, max)
                                                }}
                                                className="p-2 border rounded w-full text-sm"
                                            />
                                        </div>
                                    )
                                }
                            } else {
                                // OPTIONS handling (SELECT / MULTI_SELECT)
                                if (isMulti) {
                                    // displayStyle mapping for multi
                                    if (display === 'DROPDOWN') {
                                        filterBody = renderDropdownMulti()
                                    } else {
                                        // default to checkboxes
                                        filterBody = renderCheckboxes(true)
                                    }
                                } else {
                                    // single-select (SELECT)
                                    if (display === 'DROPDOWN') {
                                        filterBody = renderDropdownSingle()
                                    } else if (display === 'CHECKBOX') {
                                        // If displayStyle is CHECKBOX but type is SELECT -> treat as single radios
                                        filterBody = renderDropdownSingle()
                                    } else {
                                        // fallback
                                        filterBody = renderDropdownSingle()
                                    }
                                }
                            }

                            // Final wrapper for this filter: header + body + reviewSummary
                            return (
                                <div key={f.id} className="mb-4 border-b pb-3 last:border-b-0">
                                    <div className="text-sm font-medium mb-2">{f.name}</div>
                                    {filterBody}
                                    {renderReviewSummary(f)}
                                </div>
                            )
                        })}
                    </div>
                ))}
            </div>

            {/* Botões de ação - fixos na parte inferior */}
            <div className="p-4 border-t bg-white sticky bottom-0">
                <div className="flex gap-2 w-full">
                    <button
                        onClick={clearFilters}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm flex-1 transition-colors"
                    >
                        Limpar Tudo
                    </button>
                    <button
                        onClick={applyFilters}
                        disabled={!isFilterChanged}
                        className={`px-4 py-2 rounded text-sm flex-1 transition-colors ${isFilterChanged ? 'bg-orange-600 hover:bg-orange-700 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                    >
                        Aplicar Filtros
                    </button>
                </div>
            </div>
        </div>
    )
}