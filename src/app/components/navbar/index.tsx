"use client";

import { setupAPIClient } from "@/services/api";
import { AuthContextStore } from "@/app/contexts/AuthContextStore";
import { useCart } from "@/app/contexts/CartContext";
import { useTheme } from "@/app/contexts/ThemeContext";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
    FiLogIn,
    FiUser,
    FiShoppingCart,
    FiMenu,
    FiX,
    FiSearch,
    FiChevronDown,
} from "react-icons/fi";
import {
    ChangeEvent,
    KeyboardEvent,
    useContext,
    useEffect,
    useRef,
    useState,
} from "react";
import debounce from "lodash.debounce";
import { toast } from "react-toastify";
import noImage from "../../../../public/no-image.png";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;
const HISTORY_KEY = "@store:searchHistory";

type MenuItemDTO = {
    id: string;
    label: string;
    type: string;
    url: string | null;
    category_id: string | null;
    customPageSlug: string | null;
    icon: string | null;
    order: number;
    parentId: string | null;
    children: MenuItemDTO[];
};

type Store = {
    id: string;
    name: string;
    slug: string;
    images: { url: string }[];
    price_per: number;
};

export function Navbar() {
    const router = useRouter();
    const { colors } = useTheme();
    const { isAuthenticated, loadingAuth, user, configs } =
        useContext(AuthContextStore);
    const { cartCount } = useCart();

    const [menuItems, setMenuItems] = useState<MenuItemDTO[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<Store[]>([]);
    const [history, setHistory] = useState<string[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

    const searchRef = useRef<HTMLDivElement>(null);

    // Fecha dropdown de busca ao clicar fora
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (
                searchRef.current &&
                !searchRef.current.contains(e.target as Node)
            ) {
                setShowHistory(false);
                setSearchResults([]);
                setSelectedIndex(-1);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Carrega menu + histórico
    useEffect(() => {
        setupAPIClient()
            .get<MenuItemDTO[]>("/menu/get/store?position=topo_header_menu")
            .then((res) => setMenuItems(res.data))
            .catch(console.error);

        const saved = localStorage.getItem(HISTORY_KEY);
        if (saved) setHistory(JSON.parse(saved));
    }, []);

    // Busca com debounce
    const doSearch = useRef(
        debounce(async (term: string) => {
            setIsSearching(true);
            try {
                const api = setupAPIClient();
                const res = await api.get<{
                    data: Store[];
                    meta: any;
                }>("/products/search", {
                    params: { q: term, page: 1, perPage: 5 },
                });
                setSearchResults(res.data.data || []);
            } catch {
                toast.error("Erro ao buscar produtos.");
            } finally {
                setIsSearching(false);
            }
        }, 300)
    ).current;

    const handleSearch = (e: ChangeEvent<HTMLInputElement>) => {
        const term = e.target.value;
        setSearchTerm(term);
        setSelectedIndex(-1);
        if (term.length < 2) {
            setSearchResults([]);
            return;
        }
        doSearch(term);
    };
    const handleFocus = () => {
        if (history.length > 0) setShowHistory(true);
    };
    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        const list = searchResults.length
            ? searchResults
            : history.map((h) => ({
                id: h,
                slug: "",
                name: h,
                images: [],
                price_per: 0,
            }));
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setSelectedIndex((i) => Math.min(i + 1, list.length - 1));
        }
        if (e.key === "ArrowUp") {
            e.preventDefault();
            setSelectedIndex((i) => Math.max(i - 1, 0));
        }
    };

    const submitSearch = (term: string) => {
        setHistory((h) => {
            const updated = [term, ...h.filter((x) => x !== term)].slice(0, 10);
            localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
            return updated;
        });
        router.push(`/search?query=${encodeURIComponent(term)}`);
        setShowHistory(false);
        setSearchTerm("");
    };
    const clearHistory = () => {
        localStorage.removeItem(HISTORY_KEY);
        setHistory([]);
    };

    const buildUrl = (item: MenuItemDTO) => {
        if (item.type === "CATEGORY") return `/category/${item.category_id}`;
        if (item.type === "CUSTOM_PAGE") return `/pages/${item.customPageSlug}`;
        if (item.type === "INTERNAL_LINK") return item.url!;
        return item.url!;
    };

    // --- DesktopNavItem com onMouseDown para navegação antecipada ---
    const DesktopNavItem = ({
        item,
        depth = 0,
    }: {
        item: MenuItemDTO;
        depth?: number;
    }) => {
        const [open, setOpen] = useState(false);
        const submenuPosition =
            depth === 0
                ? { top: "100%", left: 0 }
                : { top: 0, left: "100%" };

        return (
            <li
                className="relative"
                onMouseEnter={() => setOpen(true)}
                onMouseLeave={() => setOpen(false)}
            >
                <div
                    className="px-4 py-2 text-white hover:bg-gray-700 whitespace-nowrap cursor-pointer select-none"
                    onMouseDown={() => router.push(buildUrl(item))}
                >
                    {item.label}
                </div>

                {open && (item.children.length > 0 || item.icon) && (
                    <div
                        className="absolute flex bg-black shadow-lg rounded z-50 overflow-visible"
                        style={{ minWidth: 240, ...submenuPosition }}
                    >
                        {item.children.length > 0 && (
                            <ul className="flex-1 divide-y">
                                {item.children.map((child) => (
                                    <DesktopNavItem
                                        key={child.id}
                                        item={child}
                                        depth={depth + 1}
                                    />
                                ))}
                            </ul>
                        )}
                        {item.icon && (
                            <div
                                className={`w-48 h-auto ${item.children.length ? "" : "p-4"
                                    }`}
                            >
                                <Image
                                    src={`${API_URL}/files/${item.icon}`}
                                    alt={`${item.label} banner`}
                                    width={192}
                                    height={192}
                                    className="object-cover rounded-r"
                                />
                            </div>
                        )}
                    </div>
                )}
            </li>
        );
    };

    // --- MobileNavItem mantém router.push ---
    const MobileNavItem = ({
        item,
        level,
    }: {
        item: MenuItemDTO;
        level: number;
    }) => {
        const [open, setOpen] = useState(false);
        return (
            <div style={{ paddingLeft: level * 16 }} className="mb-2">
                <div
                    className="flex items-center justify-between py-2 text-gray-800 hover:text-orange-600 cursor-pointer"
                    onClick={() =>
                        item.children.length
                            ? setOpen((o) => !o)
                            : router.push(buildUrl(item))
                    }
                >
                    <span className="font-medium">{item.label}</span>
                    {item.children.length > 0 && (
                        <FiChevronDown className={open ? "rotate-180" : ""} />
                    )}
                </div>
                {open && (
                    <>
                        {item.icon && (
                            <div className="my-2">
                                <Image
                                    src={`${API_URL}/files/${item.icon}`}
                                    alt={`${item.label} banner`}
                                    width={320}
                                    height={160}
                                    className="object-cover rounded"
                                />
                            </div>
                        )}
                        {item.children.map((child) => (
                            <MobileNavItem
                                key={child.id}
                                item={child}
                                level={level + 1}
                            />
                        ))}
                    </>
                )}
            </div>
        );
    };

    return (
        <header className="relative w-full top-0 z-50">
            {/* Barra superior */}
            <div
                className="flex items-center justify-between py-6 px-4 md:px-8"
                style={{ background: colors?.fundo_do_menu || "#000" }}
            >
                {/* Mobile toggle + logo */}
                <div className="flex items-center">
                    <button
                        className="md:hidden text-white mr-4"
                        onClick={() => setIsMobileMenuOpen((o) => !o)}
                    >
                        {isMobileMenuOpen ? <FiX size={28} /> : <FiMenu size={28} />}
                    </button>
                    <div
                        className="cursor-pointer"
                        onClick={() => router.push("/")}
                    >
                        <Image
                            src={configs?.logo ? `${API_URL}/files/${configs.logo}` : noImage}
                            width={120}
                            height={60}
                            alt="Logo"
                            className="object-contain"
                        />
                    </div>
                </div>

                {/* Busca desktop */}
                <div
                    ref={searchRef}
                    className="hidden md:flex flex-1 max-w-lg mx-8 relative"
                >
                    <form
                        className="flex flex-1 items-center"
                        onSubmit={(e) => {
                            e.preventDefault();
                            submitSearch(searchTerm);
                        }}
                    >
                        <input
                            type="text"
                            className="flex-1 px-4 py-2 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-black"
                            placeholder="Buscar produtos..."
                            value={searchTerm}
                            onChange={handleSearch}
                            onFocus={handleFocus}
                            onKeyDown={handleKeyDown}
                        />
                        <button
                            type="submit"
                            className="bg-orange-500 hover:bg-orange-600 px-4 py-2 rounded-r-lg text-white"
                        >
                            <FiSearch size={20} />
                        </button>

                        {isSearching && (
                            <div className="absolute right-12 top-3 text-sm text-gray-500">
                                Buscando…
                            </div>
                        )}

                        {((showHistory && history.length) || searchResults.length) > 0 && (
                            <div className="absolute top-full left-0 w-full bg-white rounded-lg shadow-lg mt-1 z-50 max-h-64 overflow-auto">
                                {/* Histórico */}
                                {showHistory &&
                                    history.length > 0 &&
                                    searchResults.length === 0 && (
                                        <div className="p-2">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="font-medium text-gray-600">
                                                    Histórico de buscas
                                                </span>
                                                <button
                                                    onClick={clearHistory}
                                                    className="text-sm text-red-500"
                                                >
                                                    Limpar
                                                </button>
                                            </div>
                                            {history.map((h, idx) => (
                                                <div
                                                    key={h}
                                                    className={`px-3 py-2 hover:bg-gray-100 cursor-pointer text-gray-500 ${selectedIndex === idx ? "bg-gray-200" : ""
                                                        }`}
                                                    onMouseDown={() => submitSearch(h)}
                                                >
                                                    {h}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                {/* Resultados */}
                                {searchResults.map((prod, idx) => (
                                    <div
                                        key={prod.id}
                                        onMouseDown={() => submitSearch(prod.name)}
                                        className={`flex items-center gap-3 px-3 py-2 hover:bg-gray-100 ${selectedIndex === idx ? "bg-gray-200" : ""
                                            }`}
                                    >
                                        <div
                                            className="flex items-center flex-1 cursor-pointer"
                                            onClick={() => router.push(`/product/${prod.slug}`)}
                                        >
                                            <Image
                                                src={
                                                    prod.images[0]?.url
                                                        ? `${API_URL}/files/${prod.images[0].url}`
                                                        : noImage
                                                }
                                                alt={prod.name}
                                                width={40}
                                                height={40}
                                                className="rounded"
                                            />
                                            <div className="flex-1 ml-2">
                                                <p className="text-gray-800">{prod.name}</p>
                                                <p className="text-sm font-semibold text-orange-600">
                                                    R$ {prod.price_per.toFixed(2)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {!isSearching &&
                                    searchTerm.length >= 2 &&
                                    !searchResults.length &&
                                    !showHistory && (
                                        <div className="p-3 text-gray-500">
                                            Nenhum produto encontrado.
                                        </div>
                                    )}
                            </div>
                        )}
                    </form>
                </div>

                {/* Ícones usuário/carrinho */}
                <div className="flex items-center space-x-4">
                    <button
                        className="md:hidden text-white"
                        onClick={() => setMobileSearchOpen((o) => !o)}
                    >
                        <FiSearch size={24} />
                    </button>
                    {!loadingAuth &&
                        (isAuthenticated ? (
                            <div
                                className="text-white cursor-pointer"
                                onClick={() => router.push(`/profile/${user?.id}`)}
                            >
                                {user?.photo ? (
                                    <Image
                                        src={`${API_URL}/files/${user.photo}`}
                                        alt="User"
                                        width={32}
                                        height={32}
                                        className="rounded-full"
                                    />
                                ) : (
                                    <FiUser size={24} />
                                )}
                            </div>
                        ) : (
                            <div
                                className="text-white hover:text-gray-200 flex items-center gap-2 cursor-pointer"
                                onClick={() => router.push("/login")}
                            >
                                <span className="text-sm">Login | Cadastre-se</span>
                                <FiLogIn size={24} />
                            </div>
                        ))}
                    <div
                        className="relative text-white cursor-pointer"
                        onClick={() => router.push("/cart")}
                    >
                        <FiShoppingCart size={24} />
                        {cartCount > 0 && (
                            <span className="absolute -top-1 -right-2 bg-red-600 text-white text-xs rounded-full px-1">
                                {cartCount}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Painel Mobile */}
            {isMobileMenuOpen && (
                <div
                    className="md:hidden bg-white text-gray-800 p-4 space-y-4 shadow-lg z-50"
                    style={{ maxHeight: "calc(100vh - 56px)", overflowY: "auto" }}
                >
                    {/* Busca mobile */}
                    {mobileSearchOpen && (
                        <div ref={searchRef} className="relative">
                            <input
                                type="text"
                                className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-orange-500"
                                placeholder="Buscar produtos..."
                                value={searchTerm}
                                onChange={handleSearch}
                                onFocus={handleFocus}
                                onKeyDown={handleKeyDown}
                            />
                            {isSearching && (
                                <div className="absolute right-3 top-3 text-sm text-gray-500">
                                    Buscando...
                                </div>
                            )}
                            {((showHistory && history.length) || searchResults.length) > 0 && (
                                <div className="mt-2 bg-white rounded-lg shadow z-50 max-h-64 overflow-auto">
                                    {showHistory &&
                                        history.length > 0 &&
                                        searchResults.length === 0 && (
                                            <div className="p-2">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="font-medium">Histórico</span>
                                                    <button
                                                        onClick={clearHistory}
                                                        className="text-sm text-red-500"
                                                    >
                                                        Limpar
                                                    </button>
                                                </div>
                                                {history.map((h) => (
                                                    <div
                                                        key={h}
                                                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                                                        onMouseDown={() => submitSearch(h)}
                                                    >
                                                        {h}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    {searchResults.map((prod) => (
                                        <div
                                            key={prod.id}
                                            className="flex items-center gap-3 px-3 py-2 hover:bg-gray-100 cursor-pointer"
                                            onClick={() => router.push(`/product/${prod.slug}`)}
                                        >
                                            <Image
                                                src={
                                                    prod.images[0]?.url
                                                        ? `${API_URL}/files/${prod.images[0].url}`
                                                        : noImage
                                                }
                                                alt={prod.name}
                                                width={40}
                                                height={40}
                                                className="rounded"
                                            />
                                            <div className="flex-1">
                                                <p className="text-gray-800">{prod.name}</p>
                                                <p className="text-sm font-semibold text-orange-600">
                                                    R$ {prod.price_per.toFixed(2)}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                    {!isSearching &&
                                        searchTerm.length >= 2 &&
                                        !searchResults.length &&
                                        !showHistory && (
                                            <div className="p-3 text-gray-500">
                                                Nenhum produto encontrado.
                                            </div>
                                        )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Menu Mobile */}
                    <div className="pt-4 border-t">
                        {menuItems.map((item) => (
                            <MobileNavItem key={item.id} item={item} level={0} />
                        ))}
                    </div>
                </div>
            )}

            {/* Menu Desktop */}
            <nav
                className="hidden md:block bg-gray-800 relative overflow-visible py-3"
                style={{ background: colors?.fundo_do_menu || "#111" }}
            >
                <ul className="flex flex-wrap gap-x-4 gap-y-2 px-4 py-2">
                    {menuItems.map((item) => (
                        <DesktopNavItem key={item.id} item={item} depth={0} />
                    ))}
                </ul>
            </nav>
        </header>
    );
}