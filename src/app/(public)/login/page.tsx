'use client'

import { NavbarCheckout } from '@/app/components/navbar/navbarCheckout'
import { FooterCheckout } from '@/app/components/footer/footerCheckout'
import { useState } from 'react'
import { useRouter } from 'next/navigation';


export default function Login() {

    const router = useRouter();

    const [login, setLogin] = useState('')
    const [password, setPassword] = useState('')

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        // TODO: lógica de autenticação
        console.log({ login, password })
    }

    return (
        <>
            <NavbarCheckout />

            <div className="flex min-h-screen flex-col items-center justify-center bg-white">
                <div
                    className="hidden lg:block lg:w-1/2 h-full bg-cover bg-center"
                    style={{ backgroundImage: "url('/login-side.jpg')" }}
                />

                {/* Form */}
                <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-0">
                    <div className="w-full max-w-md">
                        <form onSubmit={handleSubmit} className="space-y-8">
                            {/* Título */}
                            <div>
                                <h1 className="text-2xl lg:text-3xl font-bold text-black inline-block border-b-4 border-[#E71C25] pb-1">
                                    Entrar para continuar
                                </h1>
                                <p className="mt-2 text-sm text-[#333333]">
                                    Se você já possui cadastro na loja, informe seu e‑mail e senha abaixo para continuar.
                                </p>
                            </div>

                            {/* Campos */}
                            <div className="space-y-4">
                                <input
                                    type="text"
                                    placeholder="CPF/CNPJ ou E‑mail"
                                    required
                                    value={login}
                                    onChange={e => setLogin(e.target.value)}
                                    className="w-full h-12 px-4 border border-[#999999] placeholder-[#999999] text-black text-sm focus:outline-none focus:border-black"
                                />
                                <input
                                    type="password"
                                    placeholder="Senha"
                                    required
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className="w-full h-12 px-4 border border-[#999999] placeholder-[#999999] text-black text-sm focus:outline-none focus:border-black"
                                />
                            </div>

                            {/* Botão Entrar */}
                            <div>
                                <button
                                    type="submit"
                                    className="w-full h-12 bg-[#E71C25] hover:bg-[#c21a23] text-white font-semibold text-sm"
                                >
                                    ENTRAR
                                </button>
                            </div>

                            {/* Esqueceu senha */}
                            <div className="text-center">
                                <a
                                    href="#"
                                    className="text-xs text-[#0056b3] hover:underline"
                                >
                                    Esqueceu sua senha? Clique aqui para recebê‑la por e‑mail
                                </a>
                            </div>

                            {/* Separador para criação de conta */}
                            <div className="pt-8">
                                <h2 className="text-xl font-bold text-black inline-block border-b-4 border-[#E71C25] pb-1">
                                    Ainda não tem uma conta?
                                </h2>
                            </div>

                            {/* Botão Cadastrar */}
                            <div>
                                <button
                                    type="button"
                                    onClick={() => router.push(`/cadastro`)}
                                    className="w-full h-12 bg-black hover:bg-gray-900 text-white font-semibold text-sm"
                                >
                                    CADASTRE‑SE EM NOSSA LOJA
                                </button>
                            </div>

                            {/* Aviso de segurança */}
                            <p className="mt-4 text-[10px] leading-snug text-[#666666]">
                                Usamos seu e-mail de forma 100% segura para identificar seu perfil, notificar sobre o andamento do seu pedido, gerenciar seu histórico de compras e acelerar o preenchimento de suas informaçoes.
                            </p>
                        </form>
                    </div>
                </div>
            </div>

            <FooterCheckout />
        </>
    )
}