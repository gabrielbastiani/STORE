"use client"

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { setupAPIClient } from "@/services/api";
import { AuthContextStore } from "@/app/contexts/AuthContextStore";
import { toast } from "react-toastify";

const LOCAL_FAVORITES_KEY = "favorites";

type FavoritesContextType = {
    favorites: string[];
    favoritesCount: number;
    isFavorite: (id: string) => boolean;
    add: (id: string) => Promise<void>;
    remove: (id: string) => Promise<void>;
    toggle: (id: string) => Promise<void>;
    reloadFromLocal: () => void;
    forceSyncWithServer: () => Promise<void>;
};

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
    
    const { isAuthenticated, user } = React.useContext(AuthContextStore);
    const [favorites, setFavorites] = useState<string[]>([]);
    const initializedRef = useRef(false);
    const prevRef = useRef<string[] | null>(null);
    const syncingRef = useRef(false);

    // --- util: parse robusto (trata JSON duplamente-serializado)
    const tryParseMaybeDoubleEncoded = (raw: string | null) => {
        if (raw === null || raw === undefined) return null;
        try {
            const parsed = JSON.parse(raw);
            if (typeof parsed === "string") {
                try { return JSON.parse(parsed); } catch { return parsed; }
            }
            return parsed;
        } catch {
            const trimmed = (raw || "").trim();
            if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
                try { return JSON.parse(trimmed); } catch { return null; }
            }
            return null;
        }
    };

    const readLocal = (): string[] => {
        try {
            const raw = localStorage.getItem(LOCAL_FAVORITES_KEY);
            const parsed = tryParseMaybeDoubleEncoded(raw);
            if (!parsed) return [];
            if (Array.isArray(parsed)) {
                return parsed.map(p => typeof p === "string" ? p : p?.product_id ?? p?.id ?? String(p)).filter(Boolean);
            }
            // se estiver dentro de um objeto, tenta encontrar primeira array
            if (typeof parsed === "object") {
                const arrInside = Object.values(parsed).find(v => Array.isArray(v));
                if (Array.isArray(arrInside)) return arrInside.map((p: any) => typeof p === "string" ? p : p?.product_id ?? p?.id ?? String(p)).filter(Boolean);
            }
            return [];
        } catch (err) {
            console.error("FavoritesProvider: erro lendo local favorites", err);
            return [];
        }
    };

    const persistLocalIfChanged = (arr: string[]) => {
        try {
            const prev = prevRef.current ?? [];
            const prevSorted = [...prev].map(String).sort().join(",");
            const nowSorted = [...arr].map(String).sort().join(",");
            if (prevSorted !== nowSorted) {
                localStorage.setItem(LOCAL_FAVORITES_KEY, JSON.stringify(arr));
                prevRef.current = arr.slice();
                // console.debug("FavoritesProvider: gravou local favorites", arr);
            }
        } catch (err) {
            console.error("FavoritesProvider: erro gravando local favorites", err);
        }
    };

    const fetchServerFavorites = async (): Promise<string[]> => {
        if (!user?.id) return [];
        try {
            const api = setupAPIClient();
            const res = await api.get(`/favorite/customer/pageProduct?customer_id=${user.id}`);
            const payload = res.data;
            if (Array.isArray(payload) && payload.length && typeof payload[0] === "object") {
                return payload.map((p: any) => p?.product_id || p?.id).filter(Boolean);
            }
            if (Array.isArray(payload?.data)) {
                if (typeof payload.data[0] === "object") return payload.data.map((p: any) => p?.product_id || p?.id).filter(Boolean);
                return payload.data.filter(Boolean);
            }
            const arrInside = Object.values(payload).find((v: any) => Array.isArray(v));
            if (Array.isArray(arrInside)) return arrInside.map((p: any) => typeof p === "string" ? p : p?.product_id || p?.id).filter(Boolean);
            return [];
        } catch (err) {
            console.error("FavoritesProvider: erro ao buscar favoritos do servidor", err);
            return [];
        }
    };

    // inicial: ler do localStorage imediatamente (sync) e salvar prevRef
    useEffect(() => {
        try {
            const local = readLocal();
            setFavorites(local);
            prevRef.current = local.slice();
        } catch (err) {
            console.error(err);
        } finally {
            initializedRef.current = true;
        }
        // listener storage (outras abas)
        const onStorage = (e: StorageEvent) => {
            if (e.key === LOCAL_FAVORITES_KEY) {
                const local = readLocal();
                setFavorites(local);
                prevRef.current = local.slice();
            }
        };
        window.addEventListener("storage", onStorage);
        return () => window.removeEventListener("storage", onStorage);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // quando autenticação muda para logado => pegar do servidor e unir com local
    useEffect(() => {
        let cancelled = false;
        const sync = async () => {
            if (!initializedRef.current) return;
            if (isAuthenticated && user?.id) {
                syncingRef.current = true;
                try {
                    const local = readLocal();
                    const server = await fetchServerFavorites();
                    if (cancelled) return;
                    const union = Array.from(new Set([...(local || []), ...(server || [])]));
                    setFavorites(union);
                    persistLocalIfChanged(union);
                } finally {
                    syncingRef.current = false;
                }
            } else {
                // logged out -> mantemos local (não apagamos)
                const local = readLocal();
                setFavorites(local);
            }
        };
        sync();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated, user?.id]);

    // persistir sempre que mudar *depois da inicialização*
    useEffect(() => {
        if (!initializedRef.current) return;
        persistLocalIfChanged(favorites);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [favorites]);

    // operações
    const add = async (id: string) => {
        if (!id) return;
        // otimista
        const prev = favorites.slice();
        if (!prev.includes(id)) {
            const next = [...prev, id];
            setFavorites(next);
            persistLocalIfChanged(next);
        }
        // se estiver logado, tentar criar no servidor
        if (isAuthenticated && user?.id) {
            try {
                const api = setupAPIClient();
                await api.post("/favorite/create", { customer_id: user.id, product_id: id });
                // opcional: re-sync server canonical
                if (!syncingRef.current) {
                    const server = await fetchServerFavorites();
                    const merged = Array.from(new Set([...(readLocal() || []), ...(server || [])]));
                    setFavorites(merged);
                    persistLocalIfChanged(merged);
                }
            } catch (err) {
                console.error("FavoritesProvider: erro ao criar favorito no servidor", err);
                // reverte local
                setFavorites(prev);
                persistLocalIfChanged(prev);
                toast.error("Não foi possível favoritar. Tente novamente.");
            }
        }
    };

    const remove = async (id: string) => {
        if (!id) return;
        const prev = favorites.slice();
        if (prev.includes(id)) {
            const next = prev.filter(i => i !== id);
            setFavorites(next);
            persistLocalIfChanged(next);
        }
        if (isAuthenticated && user?.id) {
            try {
                const api = setupAPIClient();
                await api.delete(`/favorite/delete?customer_id=${user.id}&product_id=${id}`);
                if (!syncingRef.current) {
                    const server = await fetchServerFavorites();
                    const merged = Array.from(new Set([...(readLocal() || []), ...(server || [])]));
                    setFavorites(merged);
                    persistLocalIfChanged(merged);
                }
            } catch (err) {
                console.error("FavoritesProvider: erro ao remover favorito no servidor", err);
                // reverte
                setFavorites(prev);
                persistLocalIfChanged(prev);
                toast.error("Não foi possível remover favorito. Tente novamente.");
            }
        }
    };

    const toggle = async (id: string) => {
        if (!id) return;
        if (favorites.includes(id)) {
            await remove(id);
        } else {
            await add(id);
        }
    };

    const isFav = (id: string) => {
        return favorites.includes(id);
    };

    const reloadFromLocal = () => {
        const local = readLocal();
        setFavorites(local);
    };

    const forceSyncWithServer = async () => {
        if (!user?.id) return;
        try {
            const server = await fetchServerFavorites();
            const union = Array.from(new Set([...(readLocal() || []), ...(server || [])]));
            setFavorites(union);
            persistLocalIfChanged(union);
        } catch (err) {
            console.error("FavoritesProvider: erro forceSyncWithServer", err);
        }
    };

    const value: FavoritesContextType = {
        favorites,
        favoritesCount: favorites.length,
        isFavorite: isFav,
        add,
        remove,
        toggle,
        reloadFromLocal,
        forceSyncWithServer,
    };

    return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
    const ctx = useContext(FavoritesContext);
    if (!ctx) throw new Error("useFavorites must be used within FavoritesProvider");
    return ctx;
}