'use client'

import "react-toastify/dist/ReactToastify.css";
import NextTopLoader from 'nextjs-toploader';
import { ThemeProvider } from './contexts/ThemeContext'
import { AuthProviderStore } from './contexts/AuthContextStore';
import { ToastContainer } from 'react-toastify'
import { PrivacyProvider } from "./contexts/PrivacyContext";
import PrivacyBanner from "./components/policePrivacy/privacyBanner";
import PrivacySettingsModal from "./components/policePrivacy/privacySettingsModal";
import { CartProvider } from "./contexts/CartContext";
import { FavoritesProvider } from "./contexts/FavoritesContext";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider>
            <CartProvider>
                <NextTopLoader color="#ff4444" showSpinner={false} />
                <PrivacyProvider>
                    <AuthProviderStore>
                        <FavoritesProvider>
                            <ToastContainer autoClose={5000} />
                            {children}
                        </FavoritesProvider>
                    </AuthProviderStore>
                    <PrivacyBanner />
                    <PrivacySettingsModal />
                </PrivacyProvider>
            </CartProvider>
        </ThemeProvider>
    )
}