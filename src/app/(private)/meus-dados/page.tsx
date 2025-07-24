"use client";

import { useState } from "react";
import { useContext } from "react";
import { AuthContextStore } from "@/app/contexts/AuthContextStore";
import { MenuKey, Sidebar } from "@/app/components/paginaCliente/sidebar";
import { NavbarCheckout } from "@/app/components/navbar/navbarCheckout";
import { FooterCheckout } from "@/app/components/footer/footerCheckout";
import { MeusDados } from "@/app/components/paginaCliente/meusDados";

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
                <main className="flex-1 p-8 overflow-auto">
                    <h1 className="text-2xl font-bold mb-6 text-black">
                        {active === "dados" ? `Meus Dados`
                            : active === "pedidos" ? `Meus Pedidos`
                                : active === "creditos" ? `Meus Créditos`
                                    : active === "digitais" ? `Meus Produtos Digitais`
                                        : active === "enderecos" ? `Meus Endereços`
                                            : active === "alterar-email" ? `Alterar E‑mail`
                                                : active === "alterar-senha" ? `Alterar Senha`
                                                    : active === "sair" ? `Saindo…`
                                                        : ""}
                    </h1>

                    {active === "dados" && <MeusDados />}
                    {/* {active === "pedidos"     && <OrdersList userId={user.id} />}
          {active === "creditos"    && <CreditsList credits={user.credits} />}
          {active === "digitais"    && <DigitalProductsList products={user.digitalProducts} />}
          {active === "enderecos"   && <AddressesList addresses={user.addresses} />}
          {active === "alterar-email"  && <ChangeEmail currentEmail={user.email} />}
          {active === "alterar-senha"  && <ChangePassword />} */}
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