'use client';

import { createContext, useContext, useEffect, useState } from "react";

export type ConsentPreferences = {
  necessary: boolean;
  analytics: boolean;
  version: number;
};

type ConsentContextType = {
  prefs: ConsentPreferences | null;
  setPrefs: (prefs: ConsentPreferences) => Promise<void>;
};

const ConsentContext = createContext<ConsentContextType | undefined>(undefined);

export function ConsentProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefsState] = useState<ConsentPreferences | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("cookie-consent");
     // quando non esiste o version < 2, riparti da null per mostrare il nuovo banner
if (saved) {
  const parsed = JSON.parse(saved);
  if (!parsed.version || parsed.version < 2) {
    setPrefsState(null);
  } else {
    setPrefsState(parsed);
  }
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
