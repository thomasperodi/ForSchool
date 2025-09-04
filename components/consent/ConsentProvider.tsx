'use client';

import { createContext, useContext, useEffect, useState } from "react";

export type ConsentPreferences = {
  necessary: boolean;
  analytics: boolean;
  functional: boolean;
  marketing: boolean;
  version: number;
};

// 👇 aggiungiamo questo
export type ConsentCategory = keyof Omit<ConsentPreferences, "version">;


type ConsentContextType = {
  prefs: ConsentPreferences | null;
  setPrefs: (prefs: ConsentPreferences) => Promise<void>;
};

const ConsentContext = createContext<ConsentContextType | undefined>(undefined);

export function ConsentProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefsState] = useState<ConsentPreferences | null>(null);

  // carica preferenze solo client-side
  useEffect(() => {
    try {
      const saved = localStorage.getItem("cookie-consent");
      if (saved) {
        setPrefsState(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Errore caricamento preferenze cookie:", e);
    }
  }, []);

  const setPrefs = async (newPrefs: ConsentPreferences) => {
    try {
      localStorage.setItem("cookie-consent", JSON.stringify(newPrefs));
      setPrefsState(newPrefs);
    } catch (e) {
      console.error("Errore salvataggio preferenze cookie:", e);
    }
  };

  return (
    <ConsentContext.Provider value={{ prefs, setPrefs }}>
      {children}
    </ConsentContext.Provider>
  );
}

export function useConsent() {
  const ctx = useContext(ConsentContext);
  if (!ctx) throw new Error("useConsent deve essere usato dentro ConsentProvider");
  return ctx;
}
