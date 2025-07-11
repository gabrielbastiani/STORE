'use client'

import "react-toastify/dist/ReactToastify.css";
import NextTopLoader from 'nextjs-toploader';
import { ThemeProvider } from './contexts/ThemeContext'
import { AuthProviderStore } from './contexts/AuthContextStore';
import { ToastContainer } from 'react-toastify'
import { PrivacyProvider } from "./contexts/PrivacyContext";
import PrivacyBanner from "./components/policePrivacy/privacyBanner";
import PrivacySettingsModal from "./components/policePrivacy/privacySettingsModal";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider>
            <NextTopLoader color="#ff4444" showSpinner={false} />
            <PrivacyProvider>
                <AuthProviderStore>
                    <ToastContainer autoClose={5000} />
                    {children}
                </AuthProviderStore>
                <PrivacyBanner />
                <PrivacySettingsModal />
            </PrivacyProvider>
        </ThemeProvider>
    )
}