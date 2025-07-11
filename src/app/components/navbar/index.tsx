"use client"

import { setupAPIClient } from "@/services/api";
import { AuthContextStore } from "@/app/contexts/AuthContextStore";
import Link from "next/link";
import Image from "next/image";
import { FiLogIn, FiMenu, FiSearch, FiUser, FiX } from "react-icons/fi";
import { ChangeEvent, useContext, useState } from "react";
import { toast } from "react-toastify";
import noImage from '../../../../public/no-image.png';
import { useTheme } from "@/app/contexts/ThemeContext";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

type Store = {
    id: string
    name: string;
    slug: string;
    images: any;
};

export function Navbar() {

    const router = useRouter();

    const { colors } = useTheme();

    const { isAuthenticated, loadingAuth, user, configs } = useContext(AuthContextStore);


    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const toggleMobileMenu = () => setIsMobileMenuOpen((prev) => !prev);

    const [searchTerm, setSearchTerm] = useState("");
    const [searchResults, setSearchResults] = useState<Store[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const [showSearch, setShowSearch] = useState(false);

    const handleSearch = async (e: ChangeEvent<HTMLInputElement>) => {
        const term = e.target.value;
        setSearchTerm(term);

        if (term.length >= 2) {
            setIsSearching(true);
            try {
                const apiClientBlog = setupAPIClient();
                const response = await apiClientBlog.get<Store[]>(`/product/store/search_nav_bar`, {
                    params: { search: term },
                });
                setSearchResults(response?.data || []);
            } catch (error) {
                console.error("Erro ao buscar produtos:", error);
                toast.error("Erro ao buscar produtos.");
            } finally {
                setIsSearching(false);
            }
        } else {
            setSearchResults([]);
        }
    };

    return (
        <header
            className="shadow-md sticky top-0 z-50"
            style={{ background: colors?.fundo_do_menu || "#000000" }}
        >
            <nav className="container mx-auto flex justify-between items-center py-2 px-2 md:px-8">
                {/* Logo */}
                <Link href="/">
                    <Image
                        src={configs?.logo ? `${API_URL}/files/${configs?.logo}` : noImage}
                        width={120}
                        height={120}
                        alt="logo"
                        className="w-20 h-20 md:w-28 md:h-28 object-contain mr-14"
                    />
                </Link>

                {/* Campo de Busca */}
                <div className="relative flex items-center justify-center">
                    {showSearch ? (
                        <div id="search-container" className="relative">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={handleSearch}
                                placeholder="Buscar artigos..."
                                className="w-60 px-4 py-2 rounded-md border focus:outline-none focus:ring-2 focus:ring-gray-600 text-black"
                            />
                            <button
                                onClick={() => setShowSearch(false)}
                                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-black hover:text-gray-600"
                            >
                                <FiX size={20} />
                            </button>
                            {isSearching && (
                                <div className="absolute top-full left-0 w-full bg-white text-black p-2">Buscando...</div>
                            )}
                            {searchResults.length > 0 && (
                                <ul className="absolute top-full left-0 w-full bg-white shadow-lg z-10">
                                    {searchResults.map((product) => (
                                        <li key={product.id} className="flex items-center gap-2 p-2 border-b hover:bg-gray-100">
                                            <Image
                                                src={product.images[0].url ? `${API_URL}/files/${product.images[0].url}` : noImage}
                                                alt={product.name}
                                                width={50}
                                                height={50}
                                                className="w-12 h-12 object-cover"
                                            />
                                            <Link
                                                href={`/article/${product.slug}`}
                                                className="text-sm font-medium text-black"
                                            >
                                                {product.name}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    ) : (
                        <button
                            onClick={() => setShowSearch(true)}
                        >
                            <FiSearch
                                style={{ color: colors?.textos_menu || "#ffffff" }}
                                size={24}
                            />
                        </button>
                    )}
                </div>

                {/* Menu para dispositivos móveis */}
                <div className="md:hidden flex items-center">
                    <button
                        onClick={toggleMobileMenu}
                        className="focus:outline-none"
                    >
                        <FiMenu
                            style={{ color: colors?.textos_menu || "#ffffff" }}
                            size={28}
                        />
                    </button>
                </div>

                {/* Lista de links */}
                <ul
                    style={{ color: colors?.textos_menu || "#ffffff", background: colors?.fundo_do_menu || "#000000" }}
                    className={`absolute top-full left-0 w-full bg-black shadow-md p-4 flex flex-col gap-4 items-center md:static md:flex md:flex-row md:gap-6 md:shadow-none md:bg-transparent ${isMobileMenuOpen ? "block" : "hidden"
                        }`}
                >
                    <li>
                        <Link href="/posts_blog" className="hover:text-hoverButtonBackground">
                            Artigos
                        </Link>
                    </li>
                    <li>
                        <Link href="/posts_categories" className="hover:text-hoverButtonBackground">
                            Categorias
                        </Link>
                    </li>
                    <li>
                        <Link href="/contact" className="hover:text-hoverButtonBackground">
                            Contato
                        </Link>
                    </li>
                    <li>
                        <Link href="/about" className="hover:text-hoverButtonBackground">
                            Sobre
                        </Link>
                    </li>
                </ul>

                {!loadingAuth && isAuthenticated ? (
                    <button onClick={() => router.push(`/profile/${user?.id}`)}>
                        <div className="border-2 rounded-full p-1 border-var(--foreground) overflow-hidden w-[50px] h-[50px] flex items-center justify-center">
                            {user?.photo ? (
                                <Image
                                    src={`${API_URL}/files/${user.photo}`}
                                    alt="user"
                                    width={50}
                                    height={50}
                                    className="object-cover w-full h-full rounded-full"
                                />
                            ) : (
                                <FiUser cursor="pointer" size={24} style={{ color: colors?.icone_usuario_menu || "#ffffff" }} />
                            )}
                        </div>
                    </button>
                ) : (
                    <button onClick={() => router.push(`/login`)}>
                        <div className="border-2 rounded-full p-1">
                            <FiLogIn size={22} style={{ color: colors?.icone_login_menu || "#ffffff", border: colors?.icone_login_menu || "#ffffff" }} />
                        </div>
                    </button>
                )}
            </nav>
        </header>
    )
}