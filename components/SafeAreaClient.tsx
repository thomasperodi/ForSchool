"use client";

import { useEffect } from "react";
import { SafeArea } from "@capacitor-community/safe-area";

const SafeAreaClient = () => {
  useEffect(() => {
    const enableSafeArea = async () => {
      try {
        await SafeArea.enable({
          config: {
            customColorsForSystemBars: true,
            statusBarColor: "#00000000",
            statusBarContent: "dark",
            navigationBarColor: "#00000000",
            navigationBarContent: "light",
          },
        });
      } catch (e) {
        console.error("Failed to enable safe area plugin:", e);
      }
    };

    // Aggiungi un log per il debug
    const logSafeAreaValues = () => {
      // Accedi direttamente alle variabili CSS
      const root = document.documentElement;
      const top = getComputedStyle(root).getPropertyValue('--safe-area-inset-top');
      const bottom = getComputedStyle(root).getPropertyValue('--safe-area-inset-bottom');
      const left = getComputedStyle(root).getPropertyValue('--safe-area-inset-left');
      const right = getComputedStyle(root).getPropertyValue('--safe-area-inset-right');

      console.log('Safe Area Insets:', {
        top,
        bottom,
        left,
        right,
      });
    };

    enableSafeArea();
    
    // Attendi un po' prima di leggere i valori per essere sicuro che siano stati iniettati
    setTimeout(logSafeAreaValues, 2000);

  }, []);

  return null;
};

export default SafeAreaClient;