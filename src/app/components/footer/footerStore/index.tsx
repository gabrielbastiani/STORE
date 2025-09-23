"use client"

import React, { useContext, useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useTheme } from "@/app/contexts/ThemeContext"
import { AuthContextStore } from "@/app/contexts/AuthContextStore"
import { setupAPIClient } from "@/services/api"
import formasPagamento from "../../../../../public/formas-de-pagamento.png"
import segurancaUm from "../../../../../public/Google_Loja_Segura.svg"
import segurancaDois from "../../../../../public/100_https.svg"
import SafeHTML from "../../SafeHTML"

const API_URL = process.env.NEXT_PUBLIC_API_URL

interface MediasProps {
    id: string
    name_media: string
    link: string
    logo_media: string
}

export const FooterStore: React.FC = () => {

    const { colors } = useTheme()

    const { configs } = useContext(AuthContextStore)
    const [dataMedias, setDataMedias] = useState<MediasProps[]>([])

    useEffect(() => {
        async function fetchData() {
            try {
                const apiClient = setupAPIClient()
                const { data } = await apiClient.get<MediasProps[]>("/get/media_social")
                setDataMedias(data || [])
            } catch (error) {
                console.error(error)
            }
        }
        fetchData()
    }, []);

    const formatPhone = (raw?: string) => {
        if (!raw) return ""
        const digits = raw.replace(/\D/g, "")
        if (digits.length === 11) {
            return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
        }
        if (digits.length === 10) {
            return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
        }
        return raw
    }

    return (
        <footer className="mt-12">
            {/* 1ª LINHA: logo + texto institucional + social */}
            <div className="bg-black text-white px-6 md:px-12 lg:px-24 py-16">
                <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-6 gap-8">

                    {/* Logo + Texto institucional (span 4 cols) */}
                    <div className="md:col-span-4 flex items-start space-x-6">
                        {configs?.logo && (
                            <div className="flex-shrink-0">
                                <Image
                                    src={`${API_URL}/files/${configs?.logo}`}
                                    alt={`${configs.name} logo`}
                                    width={110}
                                    height={130}
                                />
                            </div>
                        )}
                        <div className="text-sm leading-relaxed">
                            <SafeHTML html={configs?.resume_about_store || ""} />
                        </div>
                    </div>

                    {/* Social (span 2 cols) */}
                    <div className="md:col-span-2">
                        <h4 className="font-bold mb-2">
                            Siga a {configs?.name}
                        </h4>
                        <div className="flex space-x-3">
                            {dataMedias.map((s) => (
                                <Link
                                    key={s.id}
                                    href={s.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-8 h-8 border border-white flex items-center justify-center rounded"
                                >
                                    <Image
                                        src={`${API_URL}/files/${s.logo_media}`}
                                        alt={s.name_media}
                                        width={20}
                                        height={20}
                                    />
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 2ª LINHA: menus + empresa */}
                <div className="max-w-[1200px] mx-auto grid grid-cols-1 sm:grid-cols-4 gap-8 mt-12">

                    {/* Institucional + Minha Conta */}
                    <div>
                        <h4 className="font-extrabold mb-2 underline">Institucional</h4>
                        <ul className="space-y-1 text-sm mb-4">
                            <li>
                                <Link href="/quem-somos" className="hover:underline">
                                    Quem Somos
                                </Link>
                            </li>
                            <li>
                                <Link href="/politicas-de-privacidade" className="hover:underline">
                                    Política de Privacidade
                                </Link>
                            </li>
                        </ul>
                        <h4 className="font-bold mb-2 underline">Minha Conta</h4>
                        <ul className="space-y-1 text-sm">
                            <li>
                                <Link href="/meus-dados" className="hover:underline">
                                    Meus pedidos
                                </Link>
                            </li>
                            <li>
                                <Link href="/meus-dados" className="hover:underline">
                                    Meus dados
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Atendimento */}
                    <div>
                        <h4 className="font-bold mb-2 underline">Atendimento</h4>
                        <ul className="space-y-1 text-sm">
                            <li>
                                <Link href="/atendimento" className="hover:underline">
                                    Fale conosco
                                </Link>
                            </li>
                            <li>
                                <Link href="/trocas-e-devolucao" className="hover:underline">
                                    Trocas e devoluções
                                </Link>
                            </li>
                            <li>
                                <Link href="/como-comprar" className="hover:underline">
                                    Como comprar
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/envio-e-prazo-de-entrega"
                                    className="hover:underline"
                                >
                                    Envio e prazo de entrega
                                </Link>
                            </li>
                            <li>
                                <Link href="/perguntas-frequentes" className="hover:underline">
                                    Perguntas frequentes
                                </Link>
                            </li>
                            <li>
                                <Link href="/formas-de-pagamento" className="hover:underline">
                                    Formas de pagamento
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Assistência Técnica */}
                    {configs?.technical_assistance ?
                        <div>
                            <h4 className="font-bold mb-2 underline">Assistência Técnica</h4>
                            <p className="text-sm leading-relaxed">
                                Para melhor atender nossos clientes, fale diretamente conosco para orientar você.{" "}
                                <Link
                                    href="/assistencia-tecnica"
                                    className="underline font-medium"
                                >
                                    Entre em contato.
                                </Link>
                            </p>
                        </div>
                        :
                        null
                    }

                    {/* Empresa */}
                    <div>
                        <h4 className="font-bold mb-2">{configs?.name}</h4>
                        <ul className="text-sm space-y-1">
                            <li>{`${configs?.street} ${configs?.number}`}</li>
                            <li>{configs?.city}</li>
                            <li>{formatPhone(configs?.phone)}</li>
                            <li>{configs?.email}</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* faixa branca de ícones */}
            <div className="bg-white py-6 px-6 md:px-12 lg:px-24">
                <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row items-center justify-between">

                    {/* pagamentos */}
                    <div className="flex items-center space-x-3 mb-4 md:mb-0">
                        <span className="font-extrabold text-sm text-black">
                            Formas de Pagamento
                        </span>
                        <Image
                            src={formasPagamento}
                            alt="formas-de-pagamento"
                            width={400}
                            height={30}
                        />
                    </div>

                    {/* seguranças */}
                    <div className="flex items-center space-x-3">
                        <span className="font-extrabold text-sm text-black">
                            Segurança
                        </span>
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

            {/* copyright */}
            <div className="bg-white border-t border-gray-200 py-4 text-center text-xs text-gray-500">
                <p className="mb-4">
                    &copy; {new Date().getFullYear()}{" "}
                    {configs?.name ? configs?.name : "Loja"}. Todos os direitos
                    reservados.
                </p>
            </div>
        </footer>
    )
}