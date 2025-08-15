'use client'

import React, { useEffect, useState } from 'react'
import { setupAPIClient } from '@/services/api'

/* Types */
type FilterOption = { id: string; label: string; value: string; order?: number; iconUrl?: string | null; colorCode?: string | null }
type Filter = {
    id: string
    name: string
    fieldName: string
    type: 'RANGE' | 'SELECT' | 'MULTI_SELECT'
    dataType: 'NUMBER' | 'STRING' | 'DATE' | 'BOOLEAN'
    displayStyle: 'SLIDER' | 'DROPDOWN' | 'CHECKBOX' | 'RADIO' | 'COLOR_PICKER'
    isActive: boolean
    order?: number
    autoPopulate?: boolean
    minValue?: number | null
    maxValue?: number | null
    options?: FilterOption[]
}

type FilterGroup = {
    group: { id: string; name: string } | null
    filters: Filter[]
}

type Props = {
    slug: string
    selectedFilters: Record<string, string[]>
    onChange: (s: Record<string, string[]>) => void
}

/**
 * CategoryFilters
 * Renders filter UI elements based on CMS configuration:
 * - type (RANGE / SELECT / MULTI_SELECT)
 * - dataType (NUMBER / STRING / DATE / BOOLEAN)
 * - displayStyle (SLIDER / DROPDOWN / CHECKBOX / RADIO / COLOR_PICKER)
 */
export default function CategoryFilters({ slug, selectedFilters, onChange }: Props) {

    const api = setupAPIClient()
    const [groups, setGroups] = useState<FilterGroup[]>([])
    const [loading, setLoading] = useState(false)
    const [localSelected, setLocalSelected] = useState<Record<string, string[]>>(selectedFilters ?? {})

    useEffect(() => {
        setLocalSelected(selectedFilters ?? {})
    }, [selectedFilters])

    useEffect(() => {
        fetchFilters()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [slug])

    async function fetchFilters() {
        if (!slug) return
        setLoading(true)
        try {
            const resp = await api.get(`/categories/${encodeURIComponent(slug)}/filters`)
            setGroups(resp.data.filters ?? [])
        } catch (err) {
            console.error('[CategoryFilters] fetchFilters error:', err)
            setGroups([])
        } finally {
            setLoading(false)
        }
    }

    // safe wrapper to call onChange outside render stack (avoid "setState while rendering" React errors)
    function safeOnChange(updated: Record<string, string[]>) {
        if (typeof queueMicrotask === 'function') queueMicrotask(() => onChange(updated))
        else Promise.resolve().then(() => onChange(updated))
    }

    /* ---------- Helpers to update localSelected ---------- */

    // For multi-select toggle (checkbox)
    function toggleMulti(filterId: string, value: string) {
        setLocalSelected(prev => {
            const cur = prev[filterId] ?? []
            const next = cur.includes(value) ? cur.filter(v => v !== value) : [...cur, value]
            const updated = { ...prev, [filterId]: next }
            if (updated[filterId].length === 0) delete updated[filterId]
            safeOnChange(updated)
            return updated
        })
    }

    // For single select (select / radio) - store as single-element array
    function setSingle(filterId: string, value: string | null) {
        setLocalSelected(prev => {
            const updated = { ...prev }
            if (value === null || value === '') {
                delete updated[filterId]
            } else {
                updated[filterId] = [value]
            }
            safeOnChange(updated)
            return updated
        })
    }

    // Range numeric (min/max) - Corrigido para aceitar strings e números
    function setRangeNumeric(filterId: string, min: number | string | '', max: number | string | '') {
        // Converte strings para números quando possível
        const minVal = min === '' ? '' : typeof min === 'string' ? Number(min) : min;
        const maxVal = max === '' ? '' : typeof max === 'string' ? Number(max) : max;

        setLocalSelected(prev => {
            const updated = { ...prev }
            if (minVal === '' && maxVal === '') {
                delete updated[filterId]
            } else {
                updated[filterId] = [
                    minVal === '' ? '' : String(minVal),
                    maxVal === '' ? '' : String(maxVal)
                ]
            }
            safeOnChange(updated)
            return updated
        })
    }

    // Range date (ISO yyyy-mm-dd)
    function setRangeDate(filterId: string, start: string, end: string) {
        setLocalSelected(prev => {
            const updated = { ...prev }
            if (!start && !end) {
                delete updated[filterId]
            } else {
                updated[filterId] = [start || '', end || '']
            }
            safeOnChange(updated)
            return updated
        })
    }

    // Boolean toggle
    function setBoolean(filterId: string, checked: boolean) {
        setSingle(filterId, checked ? 'true' : null)
    }

    /* ---------- Renderers for a single filter ---------- */

    function renderRange(f: Filter) {
        // Expect localSelected[f.id] to be [min,max]
        const sel = localSelected[f.id] ?? []
        if (f.dataType === 'NUMBER') {
            const minConfigured = typeof f.minValue === 'number' ? f.minValue : 0
            const maxConfigured = typeof f.maxValue === 'number' ? f.maxValue : Math.max(minConfigured + 1, 1000)

            const selMin = sel[0] !== undefined && sel[0] !== '' ? Number(sel[0]) : minConfigured
            const selMax = sel[1] !== undefined && sel[1] !== '' ? Number(sel[1]) : maxConfigured

            return (
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">{f.name}</label>

                    {/* number inputs */}
                    <div className="flex gap-2 items-center mb-2">
                        <input
                            type="number"
                            value={sel[0] ?? ''}
                            placeholder={String(minConfigured)}
                            onChange={(e) => {
                                // Passa o valor diretamente (a função converte para número)
                                setRangeNumeric(f.id, e.target.value, sel[1] ?? '')
                            }}
                            className="w-1/2 border rounded px-2 py-1 text-sm"
                        />
                        <input
                            type="number"
                            value={sel[1] ?? ''}
                            placeholder={String(maxConfigured)}
                            onChange={(e) => {
                                setRangeNumeric(f.id, sel[0] ?? '', e.target.value)
                            }}
                            className="w-1/2 border rounded px-2 py-1 text-sm"
                        />
                    </div>

                    {/* synchronized range sliders (visual) */}
                    <div className="flex gap-2 items-center">
                        <input
                            type="range"
                            min={minConfigured}
                            max={maxConfigured}
                            value={selMin}
                            onChange={(e) => {
                                const v = Number(e.target.value)
                                // ensure selMax >= v
                                setRangeNumeric(f.id, v, Math.max(v, selMax))
                            }}
                            className="w-1/2"
                        />
                        <input
                            type="range"
                            min={minConfigured}
                            max={maxConfigured}
                            value={selMax}
                            onChange={(e) => {
                                const v = Number(e.target.value)
                                setRangeNumeric(f.id, Math.min(v, selMin), v)
                            }}
                            className="w-1/2"
                        />
                    </div>
                </div>
            )
        }

        if (f.dataType === 'DATE') {
            const selStart = sel[0] ?? ''
            const selEnd = sel[1] ?? ''
            return (
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">{f.name}</label>
                    <div className="flex gap-2">
                        <input type="date" value={selStart} onChange={(e) => setRangeDate(f.id, e.target.value, selEnd)} className="w-1/2 border rounded px-2 py-1 text-sm" />
                        <input type="date" value={selEnd} onChange={(e) => setRangeDate(f.id, selStart, e.target.value)} className="w-1/2 border rounded px-2 py-1 text-sm" />
                    </div>
                </div>
            )
        }

        // fallback: text pair
        return (
            <div className="mb-4">
                <label className="block text-sm font-medium mb-1">{f.name}</label>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={sel[0] ?? ''}
                        onChange={(e) => setRangeNumeric(f.id, e.target.value, sel[1] ?? '')}
                        className="w-1/2 border rounded px-2 py-1 text-sm"
                    />
                    <input
                        type="text"
                        value={sel[1] ?? ''}
                        onChange={(e) => setRangeNumeric(f.id, sel[0] ?? '', e.target.value)}
                        className="w-1/2 border rounded px-2 py-1 text-sm"
                    />
                </div>
            </div>
        )
    }

    function renderSelectSingle(f: Filter) {
        const sel = localSelected[f.id]?.[0] ?? ''

        // DROPDOWN -> <select>
        if (f.displayStyle === 'DROPDOWN') {
            return (
                <div key={f.id} className="mb-4">
                    <label className="block text-sm font-medium mb-1">{f.name}</label>
                    <select
                        value={sel ?? ''}
                        onChange={(e) => setSingle(f.id, e.target.value ?? null)}
                        className="w-full border rounded px-2 py-1 text-sm"
                    >
                        <option value="">— Selecionar —</option>
                        {(f.options ?? []).map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                </div>
            )
        }

        // RADIO -> radio buttons
        if (f.displayStyle === 'RADIO') {
            return (
                <div key={f.id} className="mb-4">
                    <label className="block text-sm font-medium mb-1">{f.name}</label>
                    <div className="flex flex-col gap-2">
                        {(f.options ?? []).map(opt => (
                            <label key={opt.value} className="inline-flex items-center gap-2 text-sm">
                                <input type="radio" name={f.id} checked={sel === opt.value} onChange={() => setSingle(f.id, opt.value)} className="w-4 h-4" />
                                <span>{opt.label}</span>
                            </label>
                        ))}
                    </div>
                </div>
            )
        }

        // CHECKBOX display for SELECT -> render checkboxes but force single selection
        if (f.displayStyle === 'CHECKBOX') {
            return (
                <div key={f.id} className="mb-4">
                    <label className="block text-sm font-medium mb-1">{f.name}</label>
                    <div className="flex flex-col gap-2">
                        {(f.options ?? []).map(opt => (
                            <label key={opt.value} className="inline-flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={sel === opt.value}
                                    onChange={() => setSingle(f.id, sel === opt.value ? null : opt.value)}
                                    className="w-4 h-4"
                                />
                                <span>{opt.label}</span>
                            </label>
                        ))}
                    </div>
                </div>
            )
        }

        // COLOR_PICKER -> render swatches but single selectable
        if (f.displayStyle === 'COLOR_PICKER') {
            return (
                <div key={f.id} className="mb-4">
                    <label className="block text-sm font-medium mb-1">{f.name}</label>
                    <div className="flex flex-wrap gap-2">
                        {(f.options ?? []).map(opt => {
                            const color = opt.colorCode ?? undefined
                            const selected = sel === opt.value
                            return (
                                <button
                                    key={opt.value}
                                    type="button"
                                    title={opt.label}
                                    onClick={() => setSingle(f.id, selected ? null : opt.value)}
                                    className={`w-8 h-8 rounded-full border ${selected ? 'ring-2 ring-offset-1' : ''}`}
                                    style={color ? { backgroundColor: color } : undefined}
                                />
                            )
                        })}
                    </div>
                </div>
            )
        }

        // fallback: text input single
        return (
            <div key={f.id} className="mb-4">
                <label className="block text-sm font-medium mb-1">{f.name}</label>
                <input type="text" value={sel ?? ''} onChange={(e) => setSingle(f.id, e.target.value || null)} className="w-full border rounded px-2 py-1 text-sm" />
            </div>
        )
    }

    function renderMulti(f: Filter) {
        const sel = localSelected[f.id] ?? []

        // DROPDOWN with multiple -> <select multiple>
        if (f.displayStyle === 'DROPDOWN') {
            return (
                <div key={f.id} className="mb-4">
                    <label className="block text-sm font-medium mb-1">{f.name}</label>
                    <select multiple value={sel} onChange={(e) => {
                        const opts = Array.from(e.target.selectedOptions).map(o => o.value)
                        setLocalSelected(prev => {
                            const updated = { ...prev, [f.id]: opts }
                            if (opts.length === 0) delete updated[f.id]
                            safeOnChange(updated)
                            return updated
                        })
                    }} className="w-full border rounded px-2 py-1 text-sm">
                        {(f.options ?? []).map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                </div>
            )
        }

        // CHECKBOX -> list of checkboxes
        if (f.displayStyle === 'CHECKBOX' || f.displayStyle === 'COLOR_PICKER') {
            return (
                <div key={f.id} className="mb-4">
                    <label className="block text-sm font-medium mb-1">{f.name}</label>
                    <div className="flex flex-col gap-2">
                        {(f.options ?? []).map(opt => {
                            if (f.displayStyle === 'COLOR_PICKER') {
                                const color = opt.colorCode ?? undefined
                                const checked = sel.includes(opt.value)
                                return (
                                    <label key={opt.value} className="inline-flex items-center gap-2 text-sm">
                                        <input type="checkbox" checked={checked} onChange={() => toggleMulti(f.id, opt.value)} className="w-4 h-4" />
                                        <button type="button" style={color ? { backgroundColor: color } : undefined} className="w-6 h-6 rounded-full border" title={opt.label} />
                                        <span>{opt.label}</span>
                                    </label>
                                )
                            }
                            const checked = sel.includes(opt.value)
                            return (
                                <label key={opt.value} className="inline-flex items-center gap-2 text-sm">
                                    <input type="checkbox" checked={checked} onChange={() => toggleMulti(f.id, opt.value)} className="w-4 h-4" />
                                    <span>{opt.label}</span>
                                </label>
                            )
                        })}
                    </div>
                </div>
            )
        }

        // RADIO is not logical for MULTI, fallback to checkboxes
        return renderMulti({ ...f, displayStyle: 'CHECKBOX' } as Filter)
    }

    function renderBoolean(f: Filter) {
        const checked = (localSelected[f.id] ?? [])[0] === 'true'
        return (
            <div key={f.id} className="mb-4">
                <label className="inline-flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={checked} onChange={(e) => setBoolean(f.id, e.target.checked)} className="w-4 h-4" />
                    <span>{f.name}</span>
                </label>
            </div>
        )
    }

    /* ---------- Main rendering of a filter depending on its type/data/display ---------- */

    function renderFilter(f: Filter) {
        if (!f.isActive) return null

        // BOOLEAN dataType -> treat as boolean toggle regardless of type
        if (f.dataType === 'BOOLEAN') return renderBoolean(f)

        if (f.type === 'RANGE') return renderRange(f)
        if (f.type === 'SELECT') return renderSelectSingle(f)
        if (f.type === 'MULTI_SELECT') return renderMulti(f)

        // fallback
        return renderSelectSingle(f)
    }

    return (
        <aside className="bg-white rounded shadow p-4 sticky top-6 text-black">
            <h4 className="font-semibold mb-2">Filtrar por</h4>
            {loading && <div>Carregando filtros...</div>}
            {!loading && groups.length === 0 && <div className="text-sm text-gray-500">Nenhum filtro disponível.</div>}

            {groups.map((g) => (
                <section key={g.group?.id ?? 'ungrouped'} className="mb-4">
                    {g.group && <h5 className="text-sm font-medium mb-2">{g.group.name}</h5>}
                    {g.filters.length === 0 && <div className="text-xs text-gray-500 mb-2">Sem filtros neste grupo.</div>}
                    {g.filters.map((f) => (
                        <div key={f.id}>
                            {(f.options == null || f.options.length === 0) && f.autoPopulate !== true
                                ? <div className="text-xs text-gray-500 mb-2">Sem opções (considere marcar AutoPopulate ou adicionar opções no CMS).</div>
                                : null
                            }
                            {renderFilter(f)}
                        </div>
                    ))}
                </section>
            ))}
        </aside>
    )
}