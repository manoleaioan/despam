import { useState, useEffect } from 'react';

const LOCAL_STORAGE_KEY = 'appConfig';

export default function useConfig(defaultConfig) {
    const [config, setConfig] = useState(defaultConfig);

    // Load on mount
    useEffect(() => {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                setConfig((prev) => ({ ...prev, ...parsed }));
            } catch (err) {
                console.error('Invalid config in localStorage', err);
            }
        }
    }, []);

    // Save on change
    useEffect(() => {
        const subsetToStore = {
            autoNextMail: config.autoNextMail,
            autoLoadMails: config.autoLoadMails,
            debugMode: config.debugMode,
            deleteSuccessUnsubscribe: config.deleteSuccessUnsubscribe,
            deleteFailureUnsubscribe: config.deleteFailureUnsubscribe,
        };
        
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(subsetToStore));
    }, [config]);

    return [config, setConfig];
}
