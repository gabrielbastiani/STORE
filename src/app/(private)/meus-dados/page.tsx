"use client"

import { useState } from "react";
import { useContext } from "react";
import { AuthContextStore } from "@/app/contexts/AuthContextStore";
import { MenuKey, Sidebar } from "@/app/components/paginaCliente/sidebar";
import { NavbarCheckout } from "@/app/components/navbar/navbarCheckout";
import { FooterCheckout } from "@/app/components/footer/footerCheckout";
import { MeusDados } from "@/app/components/paginaCliente/meusDados";
import AddressList from "@/app/components/paginaCliente/addressList";
import { OrdersList } from "@/app/components/paginaCliente/ordersList";

export default function MinhaContaPage() {

    const { user, loadingAuth, signOut } = useContext(AuthContextStore);
    const [active, setActive] = useState<MenuKey>("dados");

    if (loadingAuth) {
        return (
            <div className="flex items-center justify-center h-screen">
                <p>Carregando seus dados…</p>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex items-center justify-center h-screen">
                <p>Você precisa estar logado para acessar esta página.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-white">
            <NavbarCheckout />

            <div className="flex flex-1">
                {/* Sidebar fixa à esquerda */}
                <Sidebar active={active} onSelect={setActive} />

                {/* Conteúdo à direita */}
                <main className="flex-1 p-4 md:p-8">
                    <h1 className="text-2xl font-bold mb-6 text-black">
                        {active === "dados" ? `Meus Dados`
                            : active === "pedidos" ? `Meus Pedidos`
                                : active === "enderecos" ? `Meus Endereços`
                                    : active === "sair" ? `Saindo…`
                                        : ""}
                    </h1>

                    {active === "dados" && <MeusDados />}
                    {active === "pedidos" && <OrdersList />}
                    {active === "enderecos" && <AddressList />}
                    {active === "sair" && (
                        <div>
                            {/** dispara o logout via contexto */}
                            <button
                                onClick={() => signOut()}
                                className="bg-red-600 text-white px-4 py-2 rounded"
                            >
                                Confirmar Logout
                            </button>
                        </div>
                    )}
                </main>
            </div>

            <FooterCheckout />
        </div>
    );
}