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
    asaas_customer_id?: string;
    email: string;
    password?: string;
    name: string;
    phone?: string;
    type_user?: string;
    cpf?: string;
    cnpj?: string;
    date_of_birth?: string;
    sexo?: string;
    state_registration?: string;
    photo?: string;
    newsletter?: boolean;
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
    cnpj?: string;
    cpf?: string;
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
    asaas_customer_id?: string;
    token: string;
    password?: string;
    name: string;
    email: string;
    type_user?: string;
    phone?: string;
    cpf?: string;
    cnpj?: string;
    date_of_birth?: string;
    sexo?: string;
    state_registration?: string;
    photo?: string;
    newsletter?: boolean;
}

export const AuthContextStore = createContext({} as AuthContextData);

export function AuthProviderStore({ children }: AuthProviderProps) {

    const [configs, setConfigs] = useState<ConfigProps>({
        name: "",
        email: "",
        cnpj: "",
        cpf: "",
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
    const [cookies, setCookie, removeCookie] = useCookies(['storeToken']);
    const [cookiesId, setCookieId, removeCookieId] = useCookies(['idCustomerStore']);
    const [user, setUser] = useState<UserProps>();
    const [loadingAuth, setLoadingAuth] = useState<boolean>(true);
    const isAuthenticated = !!user;

    useEffect(() => {
        async function loadConfigs() {
            try {
                const response = await api.get(`/configuration_ecommerce/get_configs`);

                if (response.status === 200) {
                    const defaultConfigs: ConfigProps = {
                        cnpj: "",
                        cpf: "",
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
                        cnpj: "",
                        cpf: "",
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

            setCookie('storeToken', token, cookieOptions);
            setCookieId('idCustomerStore', id, cookieOptions);

            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

            toast.success('Logado com sucesso!');
            setUser(
                {
                    id,
                    name: response.data.name,
                    email,
                    phone: response.data.phone,
                    type_user: response.data.type_user,
                    cpf: response.data.cpf,
                    cnpj: response.data.cnpj,
                    date_of_birth: response.data.date_of_birth,
                    sexo: response.data.sexo,
                    state_registration: response.data.state_registration,
                    photo: response.data.photo,
                    newsletter: response.data.newsletter,
                    asaas_customer_id: response.data.asaas_customer_id
                }
            );
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
        let token = cookies['storeToken'];
        let customerId = cookiesId['idCustomerStore'];

        async function loadUserData() {
            if (token) {
                try {
                    const response = await api.get<SessionResponse>(`/user/customer/me?customer_id=${customerId}`);

                    const {
                        id,
                        asaas_customer_id,
                        email,
                        password,
                        name,
                        phone,
                        type_user,
                        cpf,
                        cnpj,
                        date_of_birth,
                        sexo,
                        state_registration,
                        photo,
                        newsletter
                    } = response.data;

                    setUser({
                        id,
                        asaas_customer_id,
                        email,
                        password,
                        name,
                        phone,
                        type_user,
                        cpf,
                        cnpj,
                        date_of_birth,
                        sexo,
                        state_registration,
                        photo,
                        newsletter
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
            removeCookie('storeToken', { path: '/' });
            removeCookieId('idCustomerStore', { path: '/' });
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