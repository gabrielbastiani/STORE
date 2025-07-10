"use client"

import { createContext, ReactNode, useState, useEffect } from 'react';
import { api } from '@/services/apiClient';
import { toast } from 'react-toastify';
import { useCookies } from 'react-cookie';

type AuthContextData = {
    user?: UserProps;
    isAuthenticated: boolean;
    loadingAuth?: boolean;
    signIn: (credentials: SignInProps) => Promise<boolean>;
    signOut: () => void;
    updateUser: (newUserData: Partial<UserProps>) => void;
    configs?: ConfigProps;
}

type UserProps = {
    id: string;
    name: string;
    email: string;
    photo?: string;
}

type SignInProps = {
    email: string;
    password: string;
}

type AuthProviderProps = {
    children: ReactNode;
}

interface ConfigProps {
    name?: string;
    email?: string;
    phone?: string;
    whatsapp?: string;
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    number?: string;
    neighborhood?: string;
    country?: string;
    logo?: string;
    favicon?: string;
    privacy_policies?: string;
    about_store?: string;
    exchanges_and_returns?: string;
    how_to_buy?: string;
    shipping_delivery_time?: string;
    faq?: string;
    payment_methods?: string;
    technical_assistance?: string;
}

interface SessionResponse {
    id: string;
    token: string;
    name: string;
    email: string;
    photo: string;
}

export const AuthContextStore = createContext({} as AuthContextData);

export function AuthProviderStore({ children }: AuthProviderProps) {

    const [configs, setConfigs] = useState<ConfigProps>({
        name: "",
        email: "",
        phone: "",
        whatsapp: "",
        street: "",
        city: "",
        state: "",
        zipCode: "",
        number: "",
        neighborhood: "",
        country: "",
        logo: "",
        favicon: "",
        privacy_policies: "",
        about_store: "",
        exchanges_and_returns: "",
        how_to_buy: "",
        shipping_delivery_time: "",
        faq: "",
        payment_methods: "",
        technical_assistance: ""
    });
    const [cookies, setCookie, removeCookie] = useCookies(['@store.token']);
    const [cookiesId, setCookieId, removeCookieId] = useCookies(['@idUserStore']);
    const [user, setUser] = useState<UserProps>();
    const [loadingAuth, setLoadingAuth] = useState<boolean>(true);
    const isAuthenticated = !!user;

    useEffect(() => {
        async function loadConfigs() {
            try {
                const response = await api.get(`/configuration_ecommerce/get_configs`);

                if (response.status === 200) {
                    const defaultConfigs: ConfigProps = {
                        name: "Loja Padrão",
                        logo: "../../../public/no-image.png",
                        email: "contato@loja.com",
                        phone: "(00) 0000-0000",
                        whatsapp: "(00) 0000-0000",
                        street: "Rua XXX",
                        city: "Cidade XXX",
                        state: "Estado XXX",
                        zipCode: "00000-000",
                        number: "0000",
                        neighborhood: "Bairro XXX",
                        country: "XXX",
                        favicon: "../../app/favicon.ico",
                        about_store: "Sem descrição",
                        exchanges_and_returns: "Seu nome",
                        privacy_policies: "Sua politica",
                        payment_methods: "Pagamentos",
                        technical_assistance: "Assistencia tecnica",
                        faq: "Perguntas",
                        shipping_delivery_time: "Tempo de entrega",
                        how_to_buy: "Como comprar"
                    };

                    setConfigs(response.data || defaultConfigs);
                }
            } catch (error: any) {
                if (error.response?.status === 404) {
                    console.warn("Endpoint não encontrado. Usando configurações padrão.");
                    setConfigs({
                        name: "Loja Padrão",
                        logo: "../../../public/no-image.png",
                        email: "contato@loja.com",
                        phone: "(00) 0000-0000",
                        whatsapp: "(00) 0000-0000",
                        street: "Rua XXX",
                        city: "Cidade XXX",
                        state: "Estado XXX",
                        zipCode: "00000-000",
                        number: "0000",
                        neighborhood: "Bairro XXX",
                        country: "XXX",
                        favicon: "../../app/favicon.ico",
                        about_store: "Sem descrição",
                        exchanges_and_returns: "Seu nome",
                        privacy_policies: "Sua politica",
                        payment_methods: "Pagamentos",
                        technical_assistance: "Assistencia tecnica",
                        faq: "Perguntas",
                        shipping_delivery_time: "Tempo de entrega",
                        how_to_buy: "Como comprar"
                    });
                } else {
                    console.error("Erro na requisição:", error);
                }
            }
        }
        loadConfigs();
    }, []);

    async function signIn({ email, password }: SignInProps): Promise<boolean> {
        setLoadingAuth(true);
        try {
            const response = await api.post<SessionResponse>('/user/customer/session', { email, password });
            const { id, token } = response.data;

            const cookieOptions = {
                maxAge: 60 * 60 * 24 * 30,
                path: '/',
                secure: process.env.NODE_ENV === 'development',
                sameSite: 'lax' as const
            };

            setCookie('@store.token', token, cookieOptions);
            setCookieId('@idUserStore', id, cookieOptions);

            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

            toast.success('Logado com sucesso!');
            setUser({ id, name: response.data.name, email });
            return true;
        } catch (err: any) {
            toast.error("Erro ao acessar");
            toast.error(`${err.response.data.error}`);
            console.log("Erro ao acessar", err);
            return false;
        } finally {
            setLoadingAuth(false);
        }
    }

    const updateUser = (newUserData: Partial<UserProps>) => {
        if (user) {
            setUser({
                ...user,
                ...newUserData,
            });
        }
    };

    useEffect(() => {
        let token = cookies['@store.token'];
        let userid = cookiesId['@idUserStore'];

        async function loadUserData() {
            if (token) {
                try {
                    const response = await api.get<SessionResponse>(`/user/customer/me?user_id=${userid}`);

                    const { id, name, email, photo } = response.data;

                    setUser({
                        id,
                        name,
                        email,
                        photo
                    });

                } catch (error) {
                    console.error("Erro ao carregar dados do usuário: ", error);
                }
            }

            setLoadingAuth(false);
        }

        loadUserData();
    }, [cookies, cookiesId]);

    function signOut() {
        try {
            removeCookie('@store.token', { path: '/' });
            removeCookieId('@idUserStore', { path: '/' });
            setUser(undefined);
            toast.success('Usuário deslogado com sucesso!');
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } catch (error) {
            toast.error("OPS... Erro ao deslogar");
        }
    }

    return (
        <AuthContextStore.Provider value={{ configs, user, isAuthenticated, loadingAuth, signIn, signOut, updateUser }}>
            {children}
        </AuthContextStore.Provider>
    )
}