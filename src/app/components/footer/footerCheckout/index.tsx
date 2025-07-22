"use client"

import React, { useContext } from "react"
import Image from "next/image"
import formasPagamento from "../../../../../public/formas-de-pagamento.png"
import segurancaUm from "../../../../../public/Google_Loja_Segura.svg"
import segurancaDois from "../../../../../public/100_https.svg"
import development from "../../../../../public/LogoDevelopmentSite.png"
import SafeHTML from "../../SafeHTML"
import { AuthContextStore } from "@/app/contexts/AuthContextStore"

export const FooterCheckout: React.FC = () => {

    const currentYear = new Date().getFullYear();

    const { configs } = useContext(AuthContextStore)

    return (
        <footer className="bg-white border-t border-gray-200">
            {/* Linha de pagamentos e segurança */}
            <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row items-center justify-between px-6 md:px-12 py-4">
                {/* Formas de Pagamento */}
                <div className="flex items-center space-x-3 mb-4 md:mb-0">
                    <span className="font-semibold text-sm text-gray-800">
                        Formas de Pagamento
                    </span>
                    <div className="flex items-center space-x-2">
                        <Image
                            src={formasPagamento}
                            alt="formas-de-pagamento"
                            width={400}
                            height={30}
                        />
                    </div>
                </div>

                {/* Segurança */}
                <div className="flex items-center space-x-3">
                    <span className="font-semibold text-sm text-gray-800">
                        Segurança
                    </span>
                    <div className="flex items-center space-x-2">
                        <Image
                            src={segurancaUm}
                            alt="Google Loja Segura"
                            width={100}
                            height={80}
                        />
                        <Image
                            src={segurancaDois}
                            alt="100% HTTPS"
                            width={50}
                            height={35}
                        />
                    </div>
                </div>
            </div>

            {/* Linha de copyright e plataforma */}
            <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row items-center justify-between px-6 md:px-12 py-4 text-gray-600 text-sm">
                {/* Esquerda: copyright e CNPJ */}
                <div className="mb-4 md:mb-0">
                    <div>
                        © {currentYear} {configs?.name ? configs?.name : "Loja"}. Todos os direitos
                    </div>
                    <div>
                        CNPJ: 92.236.629/0001‑53 ‑ {configs?.street}, {configs?.number} ‑ {configs?.neighborhood} ‑ {configs?.city} ‑ CEP: {configs?.zipCode}.
                    </div>
                </div>

                {/* Direita: Plataforma */}
                <div className="flex items-center space-x-2">
                    <span className="text-gray-800 text-sm">Plataforma</span>
                    <Image
                        src={development}
                        alt="builder-seu-negocio-online"
                        width={120}
                        height={32}
                    />
                </div>
            </div>
        </footer>
    )
}