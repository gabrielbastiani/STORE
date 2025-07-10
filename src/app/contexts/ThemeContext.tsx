'use client'

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { setupAPIClient } from '@/services/api'; 

interface ThemeContextType {
    colors: Record<string, string>;
    setColors: (colors: Record<string, string>) => void;
    openPicker: string | null;
    setOpenPicker: (name: string | null) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {

    const [colors, setColors] = useState<Record<string, string>>({});
    const [openPicker, setOpenPicker] = useState<string | null>(null);
    const api = setupAPIClient();

    const loadColors = async () => {
        try {
            const response = await api.get<{ colors: Record<string, string> }>('/colors');
            setColors(response.data.colors || {});
        } catch (error) {
            console.error('Erro ao carregar cores:', error);
        }
    };

    const handleSetColors = (newColors: Record<string, string>) => {
        setColors(newColors);
    };

    useEffect(() => {
        loadColors();
        const interval = setInterval(loadColors, 10000);

        return () => {
            clearInterval(interval);
        };
    }, []);

    return (
        <ThemeContext.Provider value={{ 
            colors, 
            setColors: handleSetColors,
            openPicker,
            setOpenPicker
        }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) throw new Error('useTheme deve ser usado dentro de ThemeProvider');
    return context;
};