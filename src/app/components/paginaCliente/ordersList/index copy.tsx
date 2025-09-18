"use client";

import { useState, useEffect, useContext, useMemo } from "react";
import { setupAPIClient } from "@/services/api";
import { toast } from "react-toastify";
import { ChevronUp, ChevronDown, X } from "lucide-react";
import { AuthContextStore } from "@/app/contexts/AuthContextStore";
import type { ApiOrder, ApiOrderItem, ApiImage, Order, OrderItem } from "./types/orders";
import OrderDetails from "./orderDetails";
import InlineOrderDetails from "./InlineOrderDetails";
import { buildImageUrl, formatDateBR, mapApiStatusToUi, paymentMethodLabel } from "./lib/orders";

/**
 * Mapeia um ApiOrder (raw) para o Order consumido pela UI.
 * Observe: priorizamos api.payment?.status como fonte de verdade do status do pedido.
 */
const mapApiOrderToUI = (api: ApiOrder): Order => {
    const itemsApi: ApiOrderItem[] = api.items ?? [];

    const items: OrderItem[] = itemsApi.map((it) => {
        const image = (it.product?.images ?? []).find((img: ApiImage) => img.isPrimary) ?? (it.product?.images ?? [])[0];

        let variantLabel: string | null = null;
        if (it.product?.variants && it.product.variants.length > 0) {
            const v = it.product.variants[0];
            if (v?.variantAttribute && v.variantAttribute.length > 0) {
                const attr = v.variantAttribute[0];
                variantLabel = `${attr.key}: ${attr.value}`;
            }
        }

        const unitPrice = Number(it.price ?? 0);
        const quantity = Number(it.quantity ?? 0);

        // NOTE: item.status here we set based on payment status OR api.status to keep consistência.
        const itemStatusNormalized = mapApiStatusToUi(api.payment?.status ?? api.status);

        return {
            id: it.id,
            image: buildImageUrl(image?.url ?? null),
            name: it.product?.name ?? "Produto",
            variant: variantLabel,
            quantity,
            unitPrice,
            totalPrice: +(unitPrice * quantity),
            status: itemStatusNormalized,
            statusDate: formatDateBR(it.created_at ?? api.created_at ?? null),
            ipi: null,
            productId: it.product_id,
            sku: it.product?.skuMaster ?? null,
        };
    });

    const pickupAddress = {
        recipient_name: api.address?.recipient_name ?? undefined,
        street: api.address?.street ?? undefined,
        number: api.address?.number ?? undefined,
        neighborhood: api.address?.neighborhood ?? undefined,
        cep: api.address?.zipCode ?? undefined,
        city: api.address?.city ?? undefined,
        state: api.address?.state ?? undefined,
        country: api.address?.country ?? undefined,
        complement: api.address?.complement ?? undefined,
        reference: api.address?.reference ?? undefined,
        obs: undefined,
    };

    const shippingText =
        typeof api.shippingCost === "number"
            ? api.shippingCost.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
            : api.shippingAddress ?? null;

    let installments = 1;
    if (api.payment?.installment_plan && typeof api.payment.installment_plan === "number") {
        installments = api.payment.installment_plan;
    }

    // Prioriza status do payment se existir, senão usa api.status
    const normalizedStatus = mapApiStatusToUi(api.payment?.status ?? api.status);

    return {
        id: api.id,
        id_order_store: api.id_order_store ?? undefined,
        date: formatDateBR(api.created_at ?? null),
        paymentMethod: api.payment?.method ?? undefined,
        paymentLabel: paymentMethodLabel(api.payment?.method ?? undefined, api.payment ?? null),
        status: normalizedStatus,
        total: Number(api.total ?? api.grandTotal ?? 0),
        installments,
        storePickup: undefined,
        trackingCode: api.trackingCode ?? undefined,
        trackingDays: api.estimatedDelivery ?? undefined,
        items,
        // passamos o resumo vindo do backend (se existir)
        discount: (api.promotionSummary?.discountTotal ?? api.payment?.discountAmount ?? null) ?? null,
        shipping: shippingText,
        totalIpi: null,
        pickupAddress,
        raw: api,
        // mapeia promotionsApplied para a UI (se backend entregou)
        promotionsApplied: api.promotionsApplied ?? (api.appliedPromotions ? api.appliedPromotions.map((ap: any) => ap.promotion) : []),
        promotionSummary: api.promotionSummary ?? null,
    };
};

type FilterState = {
    q: string;
    sku: string;
    paymentMethod: string;
    status: string;
    orderNumber: string;
    dateFrom: string; // YYYY-MM-DD
    dateTo: string;   // YYYY-MM-DD
};

const DEFAULT_FILTERS: FilterState = {
    q: "",
    sku: "",
    paymentMethod: "",
    status: "",
    orderNumber: "",
    dateFrom: "",
    dateTo: "",
};

export const OrdersList: React.FC = () => {
    const { user } = useContext(AuthContextStore);

    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});

    // PAGINATION STATE
    const [page, setPage] = useState<number>(1);
    const [perPage, setPerPage] = useState<number>(10);
    const [total, setTotal] = useState<number>(0);
    const [totalPages, setTotalPages] = useState<number>(1);

    // FILTER STATE: `filters` = edição nos inputs; `activeFilters` = filtros aplicados (usados na query)
    const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
    const [activeFilters, setActiveFilters] = useState<FilterState>(DEFAULT_FILTERS);

    // ===== status maps (keys devem ser os valores retornados por mapApiStatusToUi) =====
    const STATUS_STYLES: Record<string, string> = {
        ENTREGUE: "bg-blue-700 text-white",
        CANCELADO: "bg-red-500 text-white",
        PROCESSANDO: "bg-yellow-500 text-white",
        PENDENTE: "bg-orange-500 text-white",
        PAGO: "bg-green-500 text-white",
        ESTORNADO: "bg-pink-500 text-white",
        FALHOU: "bg-red-800 text-white",
        ATRASADO: "bg-gray-500 text-white",
        COMPLETO: "bg-lime-300 text-black",
        REVERSO: "bg-rose-500 text-white",
        RECEBIDO: "bg-green-700 text-white",
    };

    const STATUS_LABELS: Record<string, string> = {
        ENTREGUE: "ENTREGUE",
        CANCELADO: "CANCELADO",
        PROCESSANDO: "EM PROCESSAMENTO",
        PENDENTE: "PENDENTE",
        PAGO: "PAGO",
        ESTORNADO: "ESTORNADO",
        FALHOU: "FALHOU",
        ATRASADO: "ATRASADO",
        COMPLETO: "COMPLETO",
        REVERSO: "REVERSO",
        RECEBIDO: "RECEBIDO",
    };
    // ================================================================================

    // monta query string com filtros/paginacao
    const buildQueryString = (p: number, per: number, f: FilterState) => {
        const params = new URLSearchParams();
        params.set("customer_id", user?.id ?? "");
        params.set("page", String(p));
        params.set("per_page", String(per));

        if (f.q) params.set("q", f.q);
        if (f.sku) params.set("sku", f.sku);
        if (f.paymentMethod) params.set("paymentMethod", f.paymentMethod);
        if (f.status) params.set("status", f.status);
        if (f.orderNumber) params.set("orderNumber", f.orderNumber);
        if (f.dateFrom) params.set("date_from", f.dateFrom);
        if (f.dateTo) params.set("date_to", f.dateTo);

        return params.toString();
    };

    // fetch orders -> depende de activeFilters (aplicados com botão)
    useEffect(() => {
        async function load() {
            if (!user?.id) {
                setLoading(false);
                return;
            }
            setLoading(true);
            try {
                const api = setupAPIClient();
                const qs = buildQueryString(page, perPage, activeFilters);
                const res = await api.get<{ data: ApiOrder[]; meta: { total: number; page: number; per_page: number; total_pages: number } }>(
                    `/customer/orders?${qs}`
                );

                const data = res.data?.data ?? [];
                const meta = res.data?.meta ?? null;

                const uiOrders = (data ?? []).map(mapApiOrderToUI);
                setOrders(uiOrders);

                if (meta) {
                    setTotal(meta.total ?? 0);
                    setTotalPages(meta.total_pages ?? Math.max(1, Math.ceil((meta.total ?? 0) / (meta.per_page ?? perPage))));
                    setPage(meta.page ?? page);
                    setPerPage(meta.per_page ?? perPage);
                } else {
                    setTotal(uiOrders.length);
                    setTotalPages(Math.max(1, Math.ceil((uiOrders.length) / perPage)));
                }
            } catch (err) {
                console.error(err);
                toast.error("Erro ao carregar pedidos");
            } finally {
                setLoading(false);
            }
        }
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id, page, perPage, activeFilters]);

    // reset quando troca usuário
    useEffect(() => {
        setFilters(DEFAULT_FILTERS);
        setActiveFilters(DEFAULT_FILTERS);
        setPage(1);
    }, [user?.id]);

    const toggle = (id: string) => setExpanded((e) => ({ ...e, [id]: !e[id] }));

    const formatCurrency = (v: number) =>
        v.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
        });

    // *************** PAGINATION NUMBERS LOGIC ***************
    const getPageNumbers = (current: number, totalPg: number, maxButtons = 7): (number | string)[] => {
        const pages: (number | string)[] = [];
        if (totalPg <= maxButtons) {
            for (let i = 1; i <= totalPg; i++) pages.push(i);
            return pages;
        }

        const half = Math.floor(maxButtons / 2);
        let start = Math.max(1, current - half);
        let end = Math.min(totalPg, start + maxButtons - 1);

        if (end - start + 1 < maxButtons) {
            start = Math.max(1, end - maxButtons + 1);
        }

        if (start > 1) {
            pages.push(1);
            if (start > 2) pages.push("...");
        }

        for (let i = start; i <= end; i++) pages.push(i);

        if (end < totalPg) {
            if (end < totalPg - 1) pages.push("...");
            pages.push(totalPg);
        }

        return pages;
    };

    const pageNumbers = useMemo(() => getPageNumbers(page, totalPages, 7), [page, totalPages]);

    const onPrev = () => {
        if (page > 1) setPage((p) => p - 1);
    };
    const onNext = () => {
        if (page < totalPages) setPage((p) => p + 1);
    };

    const onSelectPerPage = (value: number) => {
        setPerPage(value);
        setPage(1);
    };

    const onClearFilters = () => {
        setFilters(DEFAULT_FILTERS);
        setActiveFilters(DEFAULT_FILTERS);
        setPage(1);
    };

    // aplica filtros explicitamente (botão/Enter)
    const applyFiltersNow = () => {
        setPage(1);
        setActiveFilters({ ...filters });
    };

    // verifica se há mudança entre edição e filtros aplicados (para desabilitar botão)
    const isFiltersEqual = (a: FilterState, b: FilterState) => {
        return (
            a.q === b.q &&
            a.sku === b.sku &&
            a.paymentMethod === b.paymentMethod &&
            a.status === b.status &&
            a.orderNumber === b.orderNumber &&
            a.dateFrom === b.dateFrom &&
            a.dateTo === b.dateTo
        );
    };

    const applyDisabled = isFiltersEqual(filters, activeFilters);

    // -------------- BADGES (filtros ativos) --------------
    // retorna lista de badges com { key, label }
    const activeBadges = useMemo(() => {
        const badges: { key: string; label: string }[] = [];
        if (activeFilters.q) badges.push({ key: "q", label: `Busca: "${activeFilters.q}"` });
        if (activeFilters.sku) badges.push({ key: "sku", label: `SKU: ${activeFilters.sku}` });
        if (activeFilters.orderNumber) badges.push({ key: "orderNumber", label: `Pedido: ${activeFilters.orderNumber}` });
        if (activeFilters.paymentMethod) badges.push({ key: "paymentMethod", label: paymentMethodLabel(activeFilters.paymentMethod) || activeFilters.paymentMethod });
        if (activeFilters.status) badges.push({ key: "status", label: STATUS_LABELS[activeFilters.status] ?? activeFilters.status });
        if (activeFilters.dateFrom && activeFilters.dateTo) {
            badges.push({ key: "dateRange", label: `Data: ${activeFilters.dateFrom} → ${activeFilters.dateTo}` });
        } else {
            if (activeFilters.dateFrom) badges.push({ key: "dateFrom", label: `Data ≥ ${activeFilters.dateFrom}` });
            if (activeFilters.dateTo) badges.push({ key: "dateTo", label: `Data ≤ ${activeFilters.dateTo}` });
        }
        return badges;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeFilters]);

    // remove um filtro ativo (clicando no X da badge)
    const removeActiveFilter = (key: string) => {
        const nextActive = { ...activeFilters };
        const nextEdit = { ...filters };

        if (key === "dateRange") {
            nextActive.dateFrom = "";
            nextActive.dateTo = "";
            nextEdit.dateFrom = "";
            nextEdit.dateTo = "";
        } else if (key === "dateFrom") {
            nextActive.dateFrom = "";
            nextEdit.dateFrom = "";
        } else if (key === "dateTo") {
            nextActive.dateTo = "";
            nextEdit.dateTo = "";
        } else if (key in nextActive) {
            // @ts-ignore
            nextActive[key] = "";
            // manter consistência visual com inputs: limpar também `filters`
            // @ts-ignore
            nextEdit[key] = "";
        }

        setFilters(nextEdit);
        setActiveFilters(nextActive);
        setPage(1);
    };

    if (loading) {
        return <p>Carregando pedidos…</p>;
    }

    // se selecionado, renderiza o detalhe completo (página modal-like)
    if (selectedOrder) {
        return <OrderDetails {...selectedOrder} onBack={() => setSelectedOrder(null)} />;
    }

    return (
        <div className="space-y-6 text-black">
            {/* FILTERS BAR */}
            <div className="bg-white border rounded p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs font-medium">Busca (produto / sku / pedido)</label>
                        <input
                            type="text"
                            placeholder="Nome do produto, SKU ou número do pedido"
                            value={filters.q}
                            onChange={(e) => setFilters((s) => ({ ...s, q: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === "Enter") applyFiltersNow(); }}
                            className="w-full border rounded px-2 py-1"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-medium">SKU do produto</label>
                        <input
                            type="text"
                            placeholder="Ex: 1922.5002"
                            value={filters.sku}
                            onChange={(e) => setFilters((s) => ({ ...s, sku: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === "Enter") applyFiltersNow(); }}
                            className="w-full border rounded px-2 py-1"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-medium">Número do Pedido</label>
                        <input
                            type="text"
                            placeholder="2025-000050"
                            value={filters.orderNumber}
                            onChange={(e) => setFilters((s) => ({ ...s, orderNumber: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === "Enter") applyFiltersNow(); }}
                            className="w-full border rounded px-2 py-1"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                    <div>
                        <label className="text-xs font-medium">Forma de Pagamento</label>
                        <select
                            value={filters.paymentMethod}
                            onChange={(e) => setFilters((s) => ({ ...s, paymentMethod: e.target.value }))}
                            className="w-full border rounded px-2 py-1"
                        >
                            <option value="">— qualquer —</option>
                            <option value="CREDIT_CARD">CARTÃO DE CRÉDITO</option>
                            <option value="BOLETO">BOLETO</option>
                            <option value="PIX">PIX</option>
                            <option value="BANK_TRANSFER">BANK_TRANSFER</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-xs font-medium">Status do Pedido</label>
                        <select
                            value={filters.status}
                            onChange={(e) => setFilters((s) => ({ ...s, status: e.target.value }))}
                            className="w-full border rounded px-2 py-1"
                        >
                            <option value="">— qualquer —</option>
                            <option value="PENDING">PENDING</option>
                            <option value="CONFIRMED">CONFIRMED</option>
                            <option value="PAGO">PAGO</option>
                            <option value="CANCELLED">CANCELLED</option>
                            <option value="ENTREGUE">ENTREGUE</option>
                            <option value="ESTORNADO">ESTORNADO</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-xs font-medium">Data (de)</label>
                        <input
                            type="date"
                            value={filters.dateFrom}
                            onChange={(e) => setFilters((s) => ({ ...s, dateFrom: e.target.value }))}
                            className="w-full border rounded px-2 py-1"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-medium">Data (até)</label>
                        <input
                            type="date"
                            value={filters.dateTo}
                            onChange={(e) => setFilters((s) => ({ ...s, dateTo: e.target.value }))}
                            className="w-full border rounded px-2 py-1"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-3 mt-4">
                    <button
                        onClick={() => applyFiltersNow()}
                        className={`px-3 py-1 rounded ${applyDisabled ? "bg-gray-300 text-gray-700 cursor-not-allowed" : "bg-orange-600 text-white"}`}
                        disabled={applyDisabled}
                    >
                        Aplicar filtros
                    </button>
                    <button
                        onClick={onClearFilters}
                        className="px-3 py-1 border rounded"
                    >
                        Limpar
                    </button>
                    <div className="text-sm text-gray-600 ml-auto">Resultados: <strong>{total}</strong></div>
                </div>

                {/* ACTIVE FILTER BADGES */}
                {activeBadges.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2 items-center">
                        <div className="text-xs text-gray-600 mr-2">Filtros ativos:</div>
                        {activeBadges.map((b) => (
                            <div key={b.key} className="flex items-center gap-2 bg-gray-100 border rounded-full px-3 py-1 text-sm">
                                <span>{b.label}</span>
                                <button
                                    onClick={() => removeActiveFilter(b.key)}
                                    title="Remover filtro"
                                    className="rounded-full p-1 hover:bg-gray-200"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        ))}

                        <button
                            onClick={onClearFilters}
                            className="ml-2 px-2 py-1 text-sm border rounded bg-white"
                        >
                            Limpar todos
                        </button>
                    </div>
                )}
            </div>

            {/* ORDERS LIST */}
            {orders.map((order) => {
                const sourceStatus = order.raw?.payment?.status ?? order.raw?.status ?? order.status;
                const displayStatusNormalized = mapApiStatusToUi(sourceStatus);
                const statusClass = STATUS_STYLES[displayStatusNormalized] ?? "bg-gray-200 text-gray-800";
                const statusLabel = STATUS_LABELS[displayStatusNormalized] ?? displayStatusNormalized ?? "DESCONHECIDO";

                return (
                    <div key={order.id} className="border rounded overflow-hidden relative">
                        {/* bloco principal do pedido */}
                        <div className="flex flex-col md:flex-row items-center">
                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 md:grid-cols-5 gap-4 p-4">
                                <div>
                                    <div className="text-xs uppercase font-medium border-b pb-1">Número do Pedido</div>
                                    <div className="mt-1 text-sm font-semibold">{order.id_order_store}</div>
                                    <div className="text-xs text-gray-500 mt-1">{order.date}</div>
                                </div>

                                <div>
                                    <div className="text-xs uppercase font-medium border-b pb-1">Forma de Pagamento</div>
                                    <div className="mt-1 text-sm">{order.paymentMethod}</div>
                                    <div className="text-xs text-gray-500 mt-1">{order.paymentLabel}</div>
                                </div>

                                <div>
                                    <div className="text-xs uppercase font-medium border-b pb-1">Status do Pedido</div>
                                    <div className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mt-1 ${statusClass}`}>
                                        PED. {statusLabel}
                                    </div>
                                </div>

                                <div>
                                    <div className="text-xs uppercase font-medium border-b pb-1">Valor Total</div>
                                    <div className="mt-1 text-sm">{formatCurrency(order.raw?.grandTotal || 0)}</div>
                                    <div className="text-xs text-gray-500 mt-1">{order.installments ?? 1} x de {formatCurrency(order.total)}</div>
                                </div>

                                <div>
                                    <div className="text-xs uppercase font-medium border-b pb-1">{order.storePickup ? "Retirada na Loja" : "Código de Rastreo"}</div>
                                    <div className="mt-1 text-sm">{order.storePickup || order.trackingCode || "—"}</div>
                                    <div className="text-xs text-gray-500 mt-1">{order.storePickup ? order.storePickup : order.trackingDays}</div>
                                </div>
                            </div>

                            {/* coluna da seta vertical à direita */}
                            <div className="flex items-stretch">
                                <div
                                    className={`w-12 flex items-center justify-center cursor-pointer ${expanded[order.id] ? "bg-orange-900 text-white" : "bg-orange-800 text-white"}`}
                                    onClick={() => toggle(order.id)}
                                    role="button"
                                    aria-expanded={Boolean(expanded[order.id])}
                                    aria-controls={`order-details-${order.id}`}
                                    title={expanded[order.id] ? "Fechar detalhes" : "Abrir detalhes"}
                                >
                                    <div>
                                        {expanded[order.id] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* painel inline com detalhes — fica logo abaixo do bloco principal */}
                        {expanded[order.id] && (
                            <div id={`order-details-${order.id}`}>
                                <InlineOrderDetails order={order} onViewFull={() => setSelectedOrder(order)} />
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Pagination controls (numbers clicáveis) */}
            <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setPage(1)}
                        disabled={page <= 1}
                        className={`px-2 py-1 rounded border ${page <= 1 ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                        « Primeiro
                    </button>
                    <button
                        onClick={onPrev}
                        disabled={page <= 1}
                        className={`px-2 py-1 rounded border ${page <= 1 ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                        ‹
                    </button>

                    <div className="flex items-center gap-1">
                        {pageNumbers.map((p, idx) =>
                            typeof p === "string" ? (
                                <span key={`dots-${idx}`} className="px-3 py-1 text-sm text-gray-500">…</span>
                            ) : (
                                <button
                                    key={p}
                                    onClick={() => setPage(p)}
                                    className={`px-3 py-1 rounded ${p === page ? "bg-orange-600 text-white" : "border"}`}
                                >
                                    {p}
                                </button>
                            )
                        )}
                    </div>

                    <button
                        onClick={onNext}
                        disabled={page >= totalPages}
                        className={`px-2 py-1 rounded border ${page >= totalPages ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                        ›
                    </button>
                    <button
                        onClick={() => setPage(totalPages)}
                        disabled={page >= totalPages}
                        className={`px-2 py-1 rounded border ${page >= totalPages ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                        Último »
                    </button>
                </div>

                <div className="flex items-center gap-3">
                    <div className="text-sm text-gray-600">Itens por página:</div>
                    <select
                        value={perPage}
                        onChange={(e) => onSelectPerPage(Number(e.target.value))}
                        className="border rounded px-2 py-1"
                    >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                    </select>

                    <div className="text-sm text-gray-600 ml-4">
                        Total: <strong>{total}</strong>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrdersList;