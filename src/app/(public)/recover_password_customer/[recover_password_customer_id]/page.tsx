'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { NavbarCheckout } from '@/app/components/navbar/navbarCheckout'
import { FooterCheckout } from '@/app/components/footer/footerCheckout'
import { setupAPIClient } from '@/services/api'
import { toast } from 'react-toastify'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import z from 'zod'
import React from 'react'

// Import dinâmico do componente de desafio cognitivo (só no client)
const CognitiveChallenge = dynamic(
    () => import('../../../components/cognitiveChallenge').then(mod => mod.CognitiveChallenge),
    {
        ssr: false,
        loading: () => (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                Carregando desafio de segurança...
            </div>
        ),
    }
)

// Schema Zod para validação das senhas
const passwordSchema = z
    .object({
        password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
        confirmPassword: z.string().min(6, 'Confirmação de senha deve ter pelo menos 6 caracteres'),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: 'As senhas não coincidem',
        path: ['confirmPassword'], // a mensagem vai aparecer em confirmPassword
    })

type PasswordFormValues = z.infer<typeof passwordSchema>

export default function RecoverPasswordCustomer({
    params,
}: {
    params: Promise<{ recover_password_customer_id: string }>
}) {

    const { recover_password_customer_id } = React.use(params)
    const [cognitiveValid, setCognitiveValid] = useState(false)
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<PasswordFormValues>({
        resolver: zodResolver(passwordSchema),
    })

    async function onSubmit(data: PasswordFormValues) {
        if (!cognitiveValid) {
            toast.error('Complete o desafio de segurança antes de enviar')
            return
        }

        setLoading(true)
        try {
            const apiClient = setupAPIClient()
            await apiClient.put(
                `/user/customer/recovery_password_customer?passwordRecoveryCustomer_id=${recover_password_customer_id}`,
                { password: data.confirmPassword }
            )

            toast.success('Senha atualizada com sucesso!')
            router.push('/login')
        } catch (error: any) {
            console.error(error.response?.data || error)
            toast.error('Erro ao atualizar a senha!')
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <NavbarCheckout />
            <div className="flex min-h-screen flex-col items-center justify-center bg-white">
                {/* Imagem lateral (desktop) */}
                <div
                    className="hidden lg:block lg:w-1/2 h-full bg-cover bg-center"
                    style={{ backgroundImage: "url('/login-side.jpg')" }}
                />
                {/* Container do formulário */}
                <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-0">
                    <div className="w-full max-w-md">
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                            <div>
                                <h1 className="text-2xl lg:text-3xl font-bold text-black inline-block border-b-4 border-[#E71C25] pb-1">
                                    Nova senha
                                </h1>
                                <p className="mt-2 text-sm text-[#333333]">
                                    Informe sua nova senha.
                                </p>
                            </div>

                            <div className="space-y-4">
                                {/* Senha */}
                                <div>
                                    <input
                                        type="password"
                                        placeholder="Nova senha"
                                        {...register('password')}
                                        className="w-full h-12 px-4 border border-[#999999] placeholder-[#999999] text-black text-sm focus:outline-none focus:border-black"
                                    />
                                    {errors.password && (
                                        <p className="text-xs text-red-600 mt-1">
                                            {errors.password.message}
                                        </p>
                                    )}
                                </div>

                                {/* Confirmação de senha */}
                                <div>
                                    <input
                                        type="password"
                                        placeholder="Confirme a Senha"
                                        {...register('confirmPassword')}
                                        className="w-full h-12 px-4 border border-[#999999] placeholder-[#999999] text-black text-sm focus:outline-none focus:border-black"
                                    />
                                    {errors.confirmPassword && (
                                        <p className="text-xs text-red-600 mt-1">
                                            {errors.confirmPassword.message}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !cognitiveValid}
                                className={`w-full h-12 text-white font-semibold text-sm ${loading || !cognitiveValid
                                    ? 'bg-[#E71C25]/50 cursor-not-allowed'
                                    : 'bg-[#E71C25] hover:bg-[#c21a23]'
                                    }`}
                            >
                                {loading ? 'Solicitando...' : 'Solicitar'}
                            </button>
                        </form>

                        {/* Desafio cognitivo */}
                        <div className="mt-6">
                            <CognitiveChallenge
                                onValidate={(isValid: boolean) => setCognitiveValid(isValid)}
                            />
                        </div>
                    </div>
                </div>
            </div>
            <FooterCheckout />
        </>
    )
}