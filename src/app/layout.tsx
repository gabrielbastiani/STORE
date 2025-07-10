import type { Metadata } from "next";
import localFont from "next/font/local";
import NextTopLoader from "nextjs-toploader";
import { CookiesProvider } from "react-cookie";
import "./globals.css";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProviderStore } from "./contexts/AuthContextStore";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { PrivacyProvider } from "./contexts/PrivacyContext";
import PrivacyBanner from "./components/policePrivacy/privacyBanner";
import PrivacySettingsModal from "./components/policePrivacy/privacySettingsModal";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const STORE_URL = process.env.NEXT_PUBLIC_URL_STORE || 'http://localhost:3001';

const geistSans = localFont({
  src: "./fonts/Poppins-Regular.ttf",
  variable: "--font-poppins-regular",
  weight: "100 900",
});

export async function generateMetadata(): Promise<Metadata> {
  let store = null;

  try {
    const response = await fetch(`${API_URL}/configuration_ecommerce/get_configs`, {
      headers: { 'Cache-Control': 'public, max-age=3600' }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    store = await response.json();
  } catch (error) {
    console.error("Error fetching store configuration:", error);
  }

  const defaultMetadata = {
    title: "Loja",
    description: "Descrição da loja",
    favicon: "./favicon.ico",
  };

  const faviconUrl = store?.favicon
    ? new URL(`/files/${store.favicon}`, API_URL).toString()
    : defaultMetadata.favicon;

  return {
    metadataBase: new URL(STORE_URL),
    title: store?.name || defaultMetadata.title,
    description: store?.about_store || defaultMetadata.description,
    icons: {
      icon: faviconUrl,
    },
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-br">
      <body id="root" className={`${geistSans.variable} antialiased`}>
        <ThemeProvider>
          <NextTopLoader color="#ff4444" showSpinner={false} />
          <PrivacyProvider>
            <CookiesProvider>
              <AuthProviderStore>
                <ToastContainer autoClose={5000} />
                {children}
              </AuthProviderStore>
            </CookiesProvider>
            <PrivacyBanner />
            <PrivacySettingsModal />
          </PrivacyProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}