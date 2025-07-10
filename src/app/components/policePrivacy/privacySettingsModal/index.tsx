'use client'

import { usePrivacy } from '@/app/contexts/PrivacyContext' 
import { useState } from 'react'

export default function PrivacySettingsModal() {
    const { consent, savePreferences, openSettings, setOpenSettings } = usePrivacy()

    const [prefs, setPrefs] = useState(consent)

    if (!openSettings) return null

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
                <h2 className="text-2xl font-bold mb-4 text-black">Preferências de Privacidade</h2>

                <div className="space-y-4 mb-6">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                            <h3 className="font-medium text-black">Cookies Necessários</h3>
                            <p className="text-sm text-gray-600">Sempre ativos para funcionamento do site</p>
                        </div>
                        <input type="checkbox" checked disabled className="h-5 w-5 text-red-600" />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                            <h3 className="font-medium text-black">Analytics</h3>
                            <p className="text-sm text-gray-600">Coleta de dados de uso do site</p>
                        </div>
                        <input
                            type="checkbox"
                            checked={prefs.analytics}
                            onChange={(e) => setPrefs({ ...prefs, analytics: e.target.checked })}
                            className="h-5 w-5 text-red-600"
                        />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                            <h3 className="font-medium text-black">Marketing</h3>
                            <p className="text-sm text-gray-600">Cookies para personalização de anúncios</p>
                        </div>
                        <input
                            type="checkbox"
                            checked={prefs.marketing}
                            onChange={(e) => setPrefs({ ...prefs, marketing: e.target.checked })}
                            className="h-5 w-5 text-red-600"
                        />
                    </div>
                </div>

                <div className="flex gap-2 justify-end">
                    <button
                        onClick={() => setOpenSettings(false)}
                        className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={() => savePreferences(prefs)}
                        className="px-4 py-2 text-[#FFFFFF] bg-red-600 rounded-lg hover:bg-red-700"
                    >
                        Salvar Preferências
                    </button>
                </div>
            </div>
        </div>
    )
}