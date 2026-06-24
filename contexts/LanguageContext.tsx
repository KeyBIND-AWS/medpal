"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, Dictionary } from '@/types/i18n';
import { dictionaries } from '@/lib/dictionaries';
import { createClient } from '@/utils/supabase/client';

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => Promise<void>;
    t: Dictionary;
    isLoading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguageState] = useState<Language>('bisaya');
    const [isLoading, setIsLoading] = useState(true);

    // Instantiating the client exactly as Chubby does inside components
    const supabase = createClient();

    useEffect(() => {
        async function initLanguage() {
            try {
                // 1. Check localStorage first for instant flicker-free render
                const cached = localStorage.getItem('medpal_language_pref') as Language;
                if (cached && ['bisaya', 'filipino', 'english'].includes(cached)) {
                    setLanguageState(cached);
                }

                // 2. Safely grab session matching Chubby's error check
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();
                if (sessionError) throw sessionError;

                if (session?.user) {
                    const { data: userData, error: userError } = await supabase
                        .from('users')
                        .select('language_pref')
                        .eq('id', session.user.id)
                        .single();

                    if (!userError && userData?.language_pref) {
                        const dbLang = userData.language_pref.toLowerCase() as Language;
                        if (['bisaya', 'filipino', 'english'].includes(dbLang)) {
                            setLanguageState(dbLang);
                            localStorage.setItem('medpal_language_pref', dbLang);
                        }
                    }
                }
            } catch (err) {
                console.error('Error initializing LanguageContext:', err);
            } finally {
                setIsLoading(false);
            }
        }

        initLanguage();
    }, [supabase]);

    const changeLanguage = async (newLang: Language) => {
        setLanguageState(newLang);
        localStorage.setItem('medpal_language_pref', newLang);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                await supabase
                    .from('users')
                    .update({ language_pref: newLang })
                    .eq('id', session.user.id);
            }
        } catch (err) {
            console.error('Failed to sync language to server:', err);
        }
    };

    return (
        <LanguageContext.Provider
            value={{
                language,
                setLanguage: changeLanguage,
                t: dictionaries[language],
                isLoading
            }}
        >
            {children}
        </LanguageContext.Provider>
    );
}

export function useTranslation() {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useTranslation must be used within a LanguageProvider');
    }
    return context;
}