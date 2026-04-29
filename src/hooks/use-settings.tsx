import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { getSettings, type Settings } from '@/lib/api';

export interface SettingsContextType {
    settings: Settings | undefined;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
    const [settings, setSettings] = useState<Settings | undefined>(undefined);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await getSettings();
            setSettings(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch settings');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    const refetch = async () => {
        await fetchSettings();
    };

    return (
        <SettingsContext.Provider value={{ settings, loading, error, refetch }}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettings must be used within SettingsProvider');
    }
    return context;
}