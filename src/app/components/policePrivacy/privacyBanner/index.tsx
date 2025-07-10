'use client'

import { usePrivacy } from '@/app/contexts/PrivacyContext'; 
import Link from 'next/link';

export default function PrivacyBanner() {
    const { showBanner, acceptAll, rejectAll, setOpenSettings } = usePrivacy()

    if (!showBanner) return null

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg z-50">
            <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="text-gray-700 text-sm">
                    Nós utilizamos cookies para melhorar sua experiência. Leia nossa{' '}
                    <Link href="/politicas_de_privacidade" className="text-red-600 hover:underline">
                        Política de Privacidade
                    </Link>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={rejectAll}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                    >
                        Rejeitar Tudo
                    </button>
                    <button
                        onClick={() => setOpenSettings(true)}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                    >
                        Personalizar
                    </button>
                    <button
                        onClick={acceptAll}
                        className="px-4 py-2 text-sm font-medium text-[#FFFFFF] bg-red-600 rounded-lg hover:bg-red-700"
                    >
                        Aceitar Tudo
                    </button>
                </div>
            </div>
        </div>
    )
}