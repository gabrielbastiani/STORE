"use client";

import { setupAPIClient } from "@/services/api";
import { AuthContextStore } from "@/app/contexts/AuthContextStore";
import { useCart } from "@/app/contexts/CartContext";
import Link from "next/link";
import Image from "next/image";
import {
    FiLogIn,
    FiUser,
    FiShoppingCart,
    FiMenu,
    FiX,
    FiSearch,
    FiChevronDown,
} from "react-icons/fi";
import { ChangeEvent, useContext, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import noImage from "../../../../public/no-image.png";
import { useTheme } from "@/app/contexts/ThemeContext";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

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
    price_per?: number;
    images: { url: string }[];
};

export function Navbar() {

    const router = useRouter();
    const { colors } = useTheme();
    const { isAuthenticated, loadingAuth, user, configs } = useContext(
        AuthContextStore
    );
    const { cartCount } = useCart();

    const [menuItems, setMenuItems] = useState<MenuItemDTO[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<Store[]>([]);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

    const searchRef = useRef<HTMLDivElement>(null);

    // Fecha busca ao clicar fora
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (
                searchRef.current &&
                !searchRef.current.contains(e.target as Node)
            ) {
                setSearchTerm("");
                setSearchResults([]);
                setMobileSearchOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Carrega menu em árvore
    useEffect(() => {
        async function loadMenu() {
            try {
                const api = setupAPIClient();
                const { data } = await api.get<MenuItemDTO[]>("/menu/top");
                setMenuItems(data);
            } catch (err) {
                console.error("Erro ao carregar menu", err);
            }
        }
        loadMenu();
    }, []);

    // Busca produtos
    const handleSearch = async (e: ChangeEvent<HTMLInputElement>) => {
        const term = e.target.value;
        setSearchTerm(term);
        if (term.length < 2) {
            setSearchResults([]);
            return;
        }
        setIsSearching(true);
        try {
            const api = setupAPIClient();
            const { data } = await api.get<Store[]>(
                "/product/store/search_nav_bar",
                { params: { search: term } }
            );
            setSearchResults(data || []);
        } catch {
            toast.error("Erro ao buscar produtos.");
        } finally {
            setIsSearching(false);
        }
    };

    // Build URL de menu
    const buildUrl = (item: MenuItemDTO) => {
        if (item.type === "CATEGORY") return `/category/${item.category_id}`;
        if (item.type === "CUSTOM_PAGE") return `/pages/${item.customPageSlug}`;
        if (item.type === "INTERNAL_LINK") return item.url!;
        return item.url!;
    };

    // Desktop recursive nav item
    const DesktopNavItem = ({
        item,
        depth = 0,
    }: {
        item: MenuItemDTO;
        depth?: number;
    }) => {
        const [open, setOpen] = useState(false);
        const leftPos = depth === 0 ? 0 : "100%";
        const shouldRenderDropdown = open && (item.children.length > 0 || item.icon);

        return (
            <li
                className="relative"
                onMouseEnter={() => setOpen(true)}
                onMouseLeave={() => setOpen(false)}
            >
                <Link
                    href={buildUrl(item)}
                    className="block px-4 py-2 text-white hover:bg-gray-700 whitespace-nowrap"
                >
                    {item.label}
                </Link>

                {shouldRenderDropdown && (
                    <div
                        className="absolute flex bg-black shadow-lg rounded z-50 overflow-visible"
                        style={{
                            top: depth === 0 ? "100%" : 0,
                            left: leftPos,
                            minWidth: 240,
                        }}
                    >
                        {/* Se tiver filhos, renderiza a lista */}
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

                        {/* Se tiver ícone, renderiza o banner */}
                        {item.icon && (
                            <div className={`w-48 h-auto ${item.children.length > 0 ? "" : "p-4"}`}>
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

    // Mobile recursive nav
    function MobileNavItem({
        item,
        level,
    }: {
        item: MenuItemDTO;
        level: number;
    }) {
        const [open, setOpen] = useState(false);
        return (
            <div style={{ paddingLeft: level * 16 }} className="mb-2">
                <div
                    className="flex items-center justify-between py-2 text-gray-800 hover:text-orange-600 cursor-pointer"
                    onClick={() =>
                        item.children.length
                            ? setOpen((o) => !o)
                            : (window.location.href = buildUrl(item))
                    }
                >
                    <span className="font-medium">{item.label}</span>
                    {item.children.length > 0 && (
                        <FiChevronDown
                            className={`transition-transform ${open ? "rotate-180" : ""}`}
                        />
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
                        {item.children.map((ch) => (
                            <MobileNavItem key={ch.id} item={ch} level={level + 1} />
                        ))}
                    </>
                )}
            </div>
        );
    }

    return (
        <header className="relative w-full top-0 z-50">
            {/* LINHA 1 */}
            <div
                className="flex items-center justify-between py-6 px-4 md:px-8"
                style={{ background: colors?.fundo_do_menu || "#000" }}
            >
                <div className="flex items-center">
                    <button
                        className="md:hidden text-white mr-4"
                        onClick={() => setIsMobileMenuOpen((o) => !o)}
                    >
                        {isMobileMenuOpen ? <FiX size={28} /> : <FiMenu size={28} />}
                    </button>
                    <Link href="/">
                        <Image
                            src={
                                configs?.logo
                                    ? `${process.env.NEXT_PUBLIC_API_URL}/files/${configs.logo}`
                                    : noImage
                            }
                            width={100}
                            height={40}
                            alt="Logo"
                            className="object-contain"
                        />
                    </Link>
                </div>

                {/* Busca desktop */}
                <div className="hidden md:block flex-1 max-w-lg mx-8 relative" ref={searchRef}>
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={handleSearch}
                        placeholder="Buscar produtos..."
                        className="w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-black"
                    />
                    {isSearching && (
                        <div className="absolute right-3 top-3 text-sm text-gray-500">
                            Buscando...
                        </div>
                    )}
                    {searchResults.length > 0 && (
                        <div className="absolute top-full left-0 w-full bg-white rounded-lg shadow-lg mt-1 z-50 overflow-hidden">
                            {searchResults.map((prod) => (
                                <Link
                                    key={prod.id}
                                    href={`/product/${prod.slug}`}
                                    className="flex items-center gap-3 px-3 py-2 hover:bg-gray-100"
                                >
                                    <Image
                                        src={
                                            prod.images[0]?.url
                                                ? `${process.env.NEXT_PUBLIC_API_URL}/files/${prod.images[0].url}`
                                                : noImage
                                        }
                                        alt={prod.name}
                                        width={40}
                                        height={40}
                                        className="rounded"
                                    />
                                    <div className="flex-1">
                                        <p className="text-gray-800">{prod.name}</p>
                                        {prod.price_per != null && (
                                            <p className="text-sm font-semibold text-orange-600">
                                                R$ {prod.price_per.toFixed(2)}
                                            </p>
                                        )}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                {/* Ícones */}
                <div className="flex items-center space-x-8">
                    <button
                        className="md:hidden text-white"
                        onClick={() => setMobileSearchOpen((o) => !o)}
                    >
                        <FiSearch size={24} />
                    </button>

                    {!loadingAuth && isAuthenticated ? (
                        <button
                            onClick={() => router.push(`/profile/${user?.id}`)}
                            className="text-white hover:text-gray-200"
                        >
                            {user?.photo ? (
                                <Image
                                    src={`${process.env.NEXT_PUBLIC_API_URL}/files/${user.photo}`}
                                    alt="User"
                                    width={32}
                                    height={32}
                                    className="rounded-full"
                                />
                            ) : (
                                <FiUser size={24} />
                            )}
                        </button>
                    ) : (
                        <button
                            onClick={() => router.push("/login")}
                            className="text-white hover:text-gray-200 flex items-center gap-2"
                        >
                            <span className="text-sm">Login | Cadastre-se</span>
                            <FiLogIn size={24} />
                        </button>
                    )}

                    <button
                        onClick={() => router.push("/cart")}
                        className="relative text-white hover:text-gray-200"
                    >
                        <FiShoppingCart size={24} />
                        {cartCount > 0 && (
                            <span className="absolute -top-1 -right-2 bg-red-600 text-white text-xs rounded-full px-1">
                                {cartCount}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* PAINEL MOBILE */}
            {isMobileMenuOpen && (
                <div
                    className="md:hidden bg-white text-gray-800 p-4 space-y-4 shadow-lg z-50"
                    style={{ maxHeight: "calc(100vh - 56px)", overflowY: "auto" }}
                >
                    {mobileSearchOpen && (
                        <div ref={searchRef} className="relative">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={handleSearch}
                                placeholder="Buscar produtos..."
                                className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />
                            {isSearching && (
                                <div className="absolute right-3 top-3 text-sm text-gray-500">
                                    Buscando...
                                </div>
                            )}
                            {searchResults.length > 0 && (
                                <div className="mt-2 bg-white rounded-lg shadow overflow-hidden z-50">
                                    {searchResults.map((prod) => (
                                        <Link
                                            key={prod.id}
                                            href={`/product/${prod.slug}`}
                                            className="flex items-center gap-3 px-3 py-2 hover:bg-gray-100"
                                        >
                                            <Image
                                                src={
                                                    prod.images[0]?.url
                                                        ? `${process.env.NEXT_PUBLIC_API_URL}/files/${prod.images[0].url}`
                                                        : noImage
                                                }
                                                alt={prod.name}
                                                width={40}
                                                height={40}
                                                className="rounded"
                                            />
                                            <div className="flex-1">
                                                <p className="text-gray-800">{prod.name}</p>
                                                {prod.price_per != null && (
                                                    <p className="text-sm font-semibold text-orange-600">
                                                        R$ {prod.price_per.toFixed(2)}
                                                    </p>
                                                )}
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="pt-4 border-t">
                        {menuItems.map((item) => (
                            <MobileNavItem key={item.id} item={item} level={0} />
                        ))}
                    </div>
                </div>
            )}

            {/* MENU DESKTOP */}
            <nav
                className="hidden md:block bg-gray-800 relative overflow-visible py-3"
                style={{
                    background: colors?.fundo_do_menu || "#111",
                }}
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