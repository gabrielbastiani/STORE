"use client";

import React, { useState, useEffect } from "react";
import { setupAPIClient } from "@/services/api";
import { toast } from "react-toastify";
import { AuthContextStore } from "@/app/contexts/AuthContextStore";
import type { ApiOrder } from "./types/orders";
import OrderDetails from "./orderDetails";
import OrderCard from "./OrderCard";
import FiltersBar from "./FiltersBar";
import ActiveBadges from "./ActiveBadges";
import PaginationControls from "./PaginationControls";
import mapApiOrderToUI from "./util/mapApiOrderToUI";
import type { FilterState } from "./types/orders";
import type { Order } from "./types/orders";

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
    const { user } = React.useContext(AuthContextStore);

    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});

    const [page, setPage] = useState<number>(1);
    const [perPage, setPerPage] = useState<number>(10);
    const [total, setTotal] = useState<number>(0);
    const [totalPages, setTotalPages] = useState<number>(1);

    const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
    const [activeFilters, setActiveFilters] = useState<FilterState>(DEFAULT_FILTERS);

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
                const res = await api.get<{ data: ApiOrder[]; meta: { total: number; page: number; per_page: number; total_pages: number } }>(`/customer/orders?${qs}`);

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

    useEffect(() => {
        setFilters(DEFAULT_FILTERS);
        setActiveFilters(DEFAULT_FILTERS);
        setPage(1);
    }, [user?.id]);

    const toggle = (id: string) => setExpanded((e) => ({ ...e, [id]: !e[id] }));

    const applyFiltersNow = () => {
        setPage(1);
        setActiveFilters({ ...filters });
    };

    const onClearFilters = () => {
        setFilters(DEFAULT_FILTERS);
        setActiveFilters(DEFAULT_FILTERS);
        setPage(1);
    };

    const isFiltersEqual = (a: FilterState, b: FilterState) => (
        a.q === b.q &&
        a.sku === b.sku &&
        a.paymentMethod === b.paymentMethod &&
        a.status === b.status &&
        a.orderNumber === b.orderNumber &&
        a.dateFrom === b.dateFrom &&
        a.dateTo === b.dateTo
    );

    const applyDisabled = isFiltersEqual(filters, activeFilters);

    const removeActiveFilter = (key: string) => {
        if (key === "clearAll" || key === "clear") {
            onClearFilters();
            return;
        }

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
            // @ts-ignore
            nextEdit[key] = "";
        }

        setFilters(nextEdit);
        setActiveFilters(nextActive);
        setPage(1);
    };

    if (loading) return <p>Carregando pedidos…</p>;
    if (selectedOrder) return <OrderDetails {...selectedOrder} onBack={() => setSelectedOrder(null)} />;

    return (
        <div className="space-y-6 text-black">
            <FiltersBar
                filters={filters}
                setFilters={setFilters}
                applyFiltersNow={applyFiltersNow}
                onClearFilters={onClearFilters}
                applyDisabled={applyDisabled}
                total={total}
            />

            <ActiveBadges activeFilters={activeFilters} removeActiveFilter={removeActiveFilter} />

            {orders.map((order) => (
                <OrderCard
                    key={order.id}
                    order={order}
                    expanded={!!expanded[order.id]}
                    toggle={toggle}
                    onViewFull={(o: Order) => setSelectedOrder(o)} // passa setSelectedOrder aqui
                />
            ))}

            <PaginationControls
                page={page}
                totalPages={totalPages}
                total={total}
                perPage={perPage}
                setPage={setPage}
                setPerPage={(per) => { setPerPage(per); setPage(1); }}
            />
        </div>
    );
};

export default OrdersList;