import axios from 'axios';
import Cookies from 'universal-cookie';
import { toast } from 'react-toastify';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

function signOut() {
    try {
        const remove_cookie_user = new Cookies();
        remove_cookie_user.remove('storeToken', { path: '/' });
        toast.success('Usuario deslogado com sucesso!');
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    } catch (error) {
        toast.error("OPS... Erro ao deslogar");
        console.log(error)
    }
}

export function setupAPIClient() {

    const cookie_user = new Cookies();
    const cookies = cookie_user.get('storeToken');

    const api = axios.create({
        baseURL: API_URL,
        headers: {
            Authorization: `Bearer ${cookies}`
        }
    });

    api.interceptors.response.use(
        /* @ts-ignore */
        (response) => response,
        /* @ts-ignore */
        (error) => {
            console.log(error)
            if (error.response?.status === 401) {
                signOut();
                window.location.href = '/login';
            }
            return Promise.reject(error);
        }
    );

    return api;

}