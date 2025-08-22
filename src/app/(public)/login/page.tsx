'use client'

import dynamic from 'next/dynamic'
import { useContext, useState } from 'react'
import { useRouter } from 'next/navigation'
import { NavbarCheckout } from '@/app/components/navbar/navbarCheckout'
import { FooterCheckout } from '@/app/components/footer/footerCheckout'
import { setupAPIClient } from '@/services/api'
import { toast } from 'react-toastify'
import { AuthContextStore } from '@/app/contexts/AuthContextStore'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import z from 'zod'
import { useCart } from '@/app/contexts/CartContext'

const CognitiveChallenge = dynamic(
    () =>
        import('../../components/cognitiveChallenge/index').then(
            (mod) => mod.CognitiveChallenge
        ),
    {
        ssr: false,
        loading: () => (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                Carregando desafio de segurança...
            </div>
        ),
    }
)

// Schemas Zod
const loginSchema = z.object({
    email: z.string().email('Insira um email válido'),
    password: z.string().nonempty('O campo senha é obrigatório'),
})
type LoginFormData = z.infer<typeof loginSchema>

const recoverSchema = z.object({
    email: z.string().email('Insira um email válido'),
})
type RecoverFormData = z.infer<typeof recoverSchema>

export default function Login() {

    const router = useRouter()
    const { cartCount } = useCart();
    const cartOk = cartCount >= 1;

    const { signIn } = useContext(AuthContextStore)

    const [recoverMode, setRecoverMode] = useState(false)
    const [loading, setLoading] = useState(false)
    const [cognitiveValid, setCognitiveValid] = useState(false)

    // Login form
    const {
        register: registerLogin,
        handleSubmit: handleSubmitLogin,
        formState: { errors: loginErrors },
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
        mode: 'onChange',
    })

    // Recover form
    const {
        register: registerRecover,
        handleSubmit: handleSubmitRecover,
        formState: { errors: recoverErrors },
    } = useForm<RecoverFormData>({
        resolver: zodResolver(recoverSchema),
        mode: 'onChange',
    })

    // Envio do login
    type SignInResult = boolean | { success: boolean; message?: string };

    function isSignInObject(v: SignInResult): v is { success: boolean; message?: string } {
        return typeof v === 'object' && v !== null && 'success' in v;
    }

    async function onSubmitLogin(data: LoginFormData) {
        if (!cognitiveValid) {
            toast.error('Complete o desafio de segurança antes de enviar');
            return;
        }

        setLoading(true);

        try {
            const dataUser = { email: data.email, password: data.password };
            const result = (await signIn(dataUser)) as SignInResult; // assegure o tipo localmente

            // normaliza para booleano
            const success = typeof result === 'boolean' ? result : Boolean(result.success);

            if (!success) {
                const message =
                    isSignInObject(result) && result.message ? result.message : 'Credenciais inválidas';
                toast.error(message);
                return;
            }

            // redirecionamento prioritário para finalizar pedido se houver itens no carrinho
            if (cartOk) {
                router.replace('/finalizar-pedido'); // replace evita voltar ao login com back
                return;
            }

            router.replace('/meus-dados');
        } catch (err: any) {
            console.error('Erro onSubmitLogin:', err);
            const remoteMsg = err?.response?.data?.message ?? err?.message;
            toast.error(remoteMsg || 'Erro ao autenticar');
        } finally {
            setLoading(false);
        }
    }

    // Envio da recuperação
    async function onSubmitRecover(data: RecoverFormData) {
        if (!cognitiveValid) {
            toast.error('Complete o desafio de segurança antes de enviar')
            return
        }

        setLoading(true)
        try {
            const apiClient = setupAPIClient()
            await apiClient.post(
                '/user/customer/email_recovery_password_customer',
                { email: data.email }
            )
            toast.success(`Email enviado para "${data.email}"`)
            // opcional: voltar ao login
            setRecoverMode(false)
        } catch (err: any) {
            console.error(err.response ?? err)
            toast.error('Erro ao enviar email de recuperação')
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <NavbarCheckout />

            <div className="flex min-h-screen flex-col items-center justify-center bg-white">
                {/* Imagem lateral desktop */}
                <div
                    className="hidden lg:block lg:w-1/2 h-full bg-cover bg-center"
                    style={{ backgroundImage: "url('/login-side.jpg')" }}
                />

                {/* Box do formulário */}
                <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-0">
                    <div className="w-full max-w-md">
                        {/* ---------- LOGIN ---------- */}
                        {!recoverMode && (
                            <form
                                onSubmit={handleSubmitLogin(onSubmitLogin)}
                                className="space-y-6"
                            >
                                <div>
                                    <h1 className="text-2xl lg:text-3xl font-bold text-black inline-block border-b-4 border-[#E71C25] pb-1">
                                        Entrar para continuar
                                    </h1>
                                    <p className="mt-2 text-sm text-[#333333]">
                                        Informe seu e‑mail e senha para realizar o login para a sua conta e acessar seus dados, e demais dados.
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <input
                                            type="text"
                                            placeholder="E‑mail"
                                            {...registerLogin('email')}
                                            className="w-full h-12 px-4 border border-[#999999] placeholder-[#999999] text-black text-sm focus:outline-none focus:border-black"
                                        />
                                        {loginErrors.email && (
                                            <p className="text-xs text-red-600 mt-1">
                                                {loginErrors.email.message}
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <input
                                            type="password"
                                            placeholder="Senha"
                                            {...registerLogin('password')}
                                            className="w-full h-12 px-4 border border-[#999999] placeholder-[#999999] text-black text-sm focus:outline-none focus:border-black"
                                        />
                                        {loginErrors.password && (
                                            <p className="text-xs text-red-600 mt-1">
                                                {loginErrors.password.message}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading || !cognitiveValid}
                                    className={`w-full h-12 text-white font-semibold text-sm ${!cognitiveValid || loading
                                        ? 'bg-[#E71C25]/50 cursor-not-allowed'
                                        : 'bg-[#E71C25] hover:bg-[#c21a23]'
                                        }`}
                                >
                                    {loading ? 'Entrando...' : 'ENTRAR'}
                                </button>

                                <div className="text-center">
                                    <button
                                        type="button"
                                        onClick={() => setRecoverMode(true)}
                                        className="text-xs text-[#e78a32] hover:underline"
                                    >
                                        Esqueceu sua senha? Clique aqui para recebê‑la por e‑mail
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* ---------- RECUPERAÇÃO ---------- */}
                        {recoverMode && (
                            <form
                                onSubmit={handleSubmitRecover(onSubmitRecover)}
                                className="space-y-4"
                            >
                                <div>
                                    <input
                                        type="text"
                                        placeholder="E‑mail para recuperação de senha"
                                        {...registerRecover('email')}
                                        className="w-full h-12 px-4 border border-[#999999] placeholder-[#999999] text-black text-sm focus:outline-none focus:border-black"
                                    />
                                    {recoverErrors.email && (
                                        <p className="text-xs text-red-600 mt-1">
                                            {recoverErrors.email.message}
                                        </p>
                                    )}
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading || !cognitiveValid}
                                    className={`w-full h-12 text-white font-semibold text-sm ${!cognitiveValid || loading
                                        ? 'bg-[#E71C25]/50 cursor-not-allowed'
                                        : 'bg-[#E71C25] hover:bg-[#c21a23]'
                                        }`}
                                >
                                    {loading ? 'Enviando...' : 'ENVIAR'}
                                </button>

                                <div className="text-center pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setRecoverMode(false)}
                                        className="text-xs text-[#0056b3] hover:underline"
                                    >
                                        Voltar ao login
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* Desafio de segurança (mesmo para login ou recover) */}
                        <div className="mt-6">
                            <CognitiveChallenge
                                onValidate={(isValid: boolean) => setCognitiveValid(isValid)}
                            />
                        </div>

                        {/* ---------- CADASTRO ---------- */}
                        {!recoverMode && (
                            <>
                                <div className="pt-8">
                                    <h2 className="text-xl font-bold text-black inline-block border-b-4 border-[#E71C25] pb-1">
                                        Ainda não tem uma conta?
                                    </h2>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => router.push('/cadastro')}
                                    className="w-full h-12 bg-black hover:bg-gray-900 text-white font-semibold text-sm mt-2"
                                >
                                    CADASTRE‑SE EM NOSSA LOJA
                                </button>
                                <p className="mt-4 text-[10px] leading-snug text-[#666666]">
                                    Usamos seu e‑mail de forma 100% segura para identificar seu perfil,
                                    notificar sobre o andamento do seu pedido, gerenciar seu histórico de
                                    compras e acelerar o preenchimento de suas informações.
                                </p>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <FooterCheckout />
        </>
    )
}