"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { getUtenteCompleto } from "@/lib/api";

/* =======================
   TIPI E DICHIARAZIONI
   ======================= */
/* ====== aggiungi in alto vicino ai tipi ====== */

// Type helpers
type NonNull<T> = Exclude<T, undefined | null>;

// Type guards per le API v13 e legacy
function hasV13API(
  store: Store,
  plat?: PlatformNS,
  runtime?: Platform
): store is Store & {
  initialize: NonNull<Store['initialize']>;
  update: NonNull<Store['update']>;
} {
  return (
    typeof store.initialize === 'function' &&
    typeof store.update === 'function' &&
    !!plat &&
    !!runtime
  );
}

function hasRegisterAPI(
  store: Store,
  plat?: PlatformNS,
  runtime?: Platform
): store is Store & { register: NonNull<Store['register']> } {
  return typeof store.register === 'function' && !!plat && !!runtime;
}

interface CustomError {
  message: string;
  code?: string;
  source?: string;
}

interface IAPProduct {
  id: string;
  transaction?: Record<string, unknown>;
  finish: () => void;
  owned: boolean;
  canPurchase: boolean;
}

interface IAPError {
  code?: string | number;
  message?: string;
  [key: string]: unknown;
}

interface Store {
  ready: (callback: () => void) => void;
  when: (productId: string) => {
    approved: (callback: (product: IAPProduct) => void) => void;
    // v13+: non esiste più owned(), ma updated()
    updated?: (callback: (product: IAPProduct) => void) => void;
  };
  error: (callback: (err: IAPError) => void) => void;
  refresh?: () => void; // legacy
  update?: () => void; // v13+
  order: (productId: string) => void;
  PAID_SUBSCRIPTION?: string;
  products: { get: (id: string) => IAPProduct | undefined } | IAPProduct[];
  get?: (id: string) => IAPProduct | undefined; // alcune versioni
  register?: (items: { id: string; type: string; platform?: string }[]) => void; // legacy
  initialize?: (opts: {
    products: { id: string; type: string; platform: string }[];
    debug?: boolean;
  }) => void; // v13+
}

type Platform = "ios" | "android";

interface ProductTypeNS {
  PAID_SUBSCRIPTION?: string;
  SUBSCRIPTION?: string; // v13+
  [k: string]: string | undefined;
}

interface PlatformNS {
  APPLE_APPSTORE?: string;
  GOOGLE_PLAY?: string;
  [k: string]: string | undefined;
}

interface CapacitorLike {
  getPlatform?: () => "ios" | "android" | "web";
}

interface DeviceLike {
  platform?: string;
}

interface CdvPurchaseNS {
  store?: Store;
  Store?: Store;
  ProductType?: ProductTypeNS;
  Platform?: PlatformNS; // v13 enum piattaforme
}

type WinEnv = Window &
  Partial<{
    CdvPurchase: CdvPurchaseNS;
    cordova: object;
    Capacitor: CapacitorLike;
    device: DeviceLike;
  }>;

declare global {
  interface Window {
    CdvPurchase?: CdvPurchaseNS;

    Capacitor?: CapacitorLike;
    device?: DeviceLike;
  }
}

/* =======================
   PROPS E COMPONENTI
   ======================= */

interface AbbonamentiProps {
  promoCodeInput: string;
  setPromoCodeInput: React.Dispatch<React.SetStateAction<string>>;
  promoCodeValid: boolean;
  loading: boolean;
  handleCheckout: (productId: string) => void;
  isMobileApp: boolean;
}

const Abbonamenti = dynamic<AbbonamentiProps>(
  () => import("@/components/Abbonamenti").then((mod) => mod.Abbonamenti),
  { ssr: false }
);

/* =======================
   PAGINA
   ======================= */

export default function AbbonamentiPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<CustomError | null>(null);

  const [promoCodeInput, setPromoCodeInput] = useState<string>("");
  const [promoCodeValid, setPromoCodeValid] = useState<boolean | null>(null);

  const [iapReady, setIapReady] = useState(false);
  const [isMobileApp, setIsMobileApp] = useState(false);

  /* Rilevamento ambiente mobile app (Cordova o Capacitor) */
  useEffect(() => {
    const w = window as unknown as WinEnv;
    const cap = w.Capacitor?.getPlatform?.();
    const isCapApp = cap === "ios" || cap === "android";
    const isCordova = !!w.cordova;
    setIsMobileApp(isCapApp || isCordova);
  }, []);

  /* Validazione codici promo */
  useEffect(() => {
    if (!promoCodeInput.trim()) {
      setPromoCodeValid(null);
      return;
    }
    const fetchValidCodes = async () => {
      try {
        const response = await fetch("/api/valid-promo-codes");
        if (!response.ok) throw new Error("Errore nel recupero codici promo");
        const data = (await response.json()) as { codes?: string[] };
        const validCodes: string[] = data.codes || [];
        setPromoCodeValid(validCodes.includes(promoCodeInput.toUpperCase()));
      } catch {
        setPromoCodeValid(false);
      }
    };
    fetchValidCodes();
  }, [promoCodeInput]);

  /* In-App Purchases */
  useEffect(() => {
    if (!isMobileApp) return;

    const initIAP = () => {
      const w = window as unknown as WinEnv;

      const ns = w.CdvPurchase;
      const store: Store | undefined =
        ns?.store ?? ns?.Store ?? w.CdvPurchase?.Store;

      if (!store) {
        console.error("CdvPurchase store non disponibile");
        return;
      }

      const productId = "it.skoolly.app.abbonamento.mensile";

      // Rileva piattaforma runtime
      const detectRuntimePlatform = (): Platform | undefined => {
        const dp = w.device?.platform?.toLowerCase();
        if (dp?.includes("ios")) return "ios";
        if (dp?.includes("android")) return "android";
        const capPlat = w.Capacitor?.getPlatform?.();
        if (capPlat === "ios" || capPlat === "android") return capPlat;
        const ua = navigator.userAgent || "";
        if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
        if (/Android/i.test(ua)) return "android";
        return undefined;
      };
      const runtime = detectRuntimePlatform();

      // Tipo prodotto cross-versione
      const paidType: string =
        ns?.ProductType?.SUBSCRIPTION ??
        ns?.ProductType?.PAID_SUBSCRIPTION ??
        store.PAID_SUBSCRIPTION ??
        "paid subscription";

      const Plat = ns?.Platform; // enum piattaforme in v13

      // v13+: initialize() -> attach listeners -> update()
      const canV13 =
        typeof store.initialize === "function" &&
        typeof store.update === "function" &&
        !!Plat &&
        !!runtime;

try {
  if (hasV13API(store, Plat, runtime)) {
    const platformEnum =
      runtime === 'ios' ? Plat!.APPLE_APPSTORE! : Plat!.GOOGLE_PLAY!;
    // qui TS sa che initialize esiste
    store.initialize({
      products: [{ id: productId, type: paidType, platform: platformEnum }],
      debug: true,
    });
  } else if (hasRegisterAPI(store, Plat, runtime)) {
    const platformEnum =
      runtime === 'ios' ? Plat!.APPLE_APPSTORE! : Plat!.GOOGLE_PLAY!;
    store.register([{ id: productId, type: paidType, platform: platformEnum }]);
  } else {
    console.warn(
      'API v13 non completa o enum Platform assente: salto init per evitare errori.'
    );
  }
} catch (e) {
  const msg = e instanceof Error ? e.message : String(e);
  console.warn('Initialize/register fallita:', msg);
}

      // LISTENER (dopo initialize/register)
      const whenObj = store.when(productId);

      whenObj.approved(async (product: IAPProduct) => {
        console.log("Abbonamento approvato:", product.id);

        const tx = product.transaction as Record<string, unknown> | undefined;
        const receiptData = (tx?.receipt as string | undefined) ?? undefined;
        const transactionId = (tx?.id as string | undefined) ?? undefined;

        const plat: Platform =
          runtime ??
          (w.Capacitor?.getPlatform?.() === "ios" ? "ios" : "android");

        if (!receiptData || !transactionId) {
          console.error("Dati di transazione mancanti per la validazione.");
          return;
        }

        try {
          const user = await getUtenteCompleto();
          const response = await fetch("/api/validate-receipt", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: user.id,
              productId: product.id,
              platform: plat,
              receiptData,
              transactionId,
            }),
          });

          if (response.ok) {
            console.log("Validazione backend riuscita. Chiamo product.finish()");
            product.finish();
            setLoading(false);
          } else {
            const errorData = (await response.json().catch(() => ({}))) as {
              error?: string;
            };
            console.error("Validazione backend fallita:", errorData);
            setError({
              message:
                errorData?.error ?? "Errore di validazione della ricevuta",
              source: "Backend",
            });
            setLoading(false);
          }
        } catch (err: unknown) {
          const msg =
            err instanceof Error
              ? err.message
              : "Errore sconosciuto durante la validazione";
          console.error("Errore nella chiamata all'API di backend:", err);
          setError({ message: msg, source: "Client" });
          setLoading(false);
        }
      });

      if (whenObj.updated) {
        whenObj.updated((product: IAPProduct) => {
          if (product.owned) {
            console.log("Abbonamento risulta posseduto:", product.id);
            setLoading(false);
          }
        });
      }

      store.error((err: IAPError) => {
        console.error("Errore IAP:", err);
        setError({
          message:
            (typeof err.message === "string" && err.message) ||
            "Errore IAP sconosciuto",
          source: "IAP",
        });
        setLoading(false);
      });

      // Ready: abilita UI quando pronto
      store.ready(() => {
        console.log("Store pronto");
        setIapReady(true);
        // opzionale: interrogare i prodotti solo qui
        const getProductById = (id: string): IAPProduct | undefined => {
          const pc = store.products;
          if (Array.isArray(pc)) return pc.find((p) => p.id === id);
          if ("get" in pc) return pc.get(id);
          return store.get?.(id);
        };
        const p = getProductById(productId);
        if (!p) console.log("Prodotto non ancora in cache, ok così.");
      });

      // Avvio discovery dei prodotti DOPO i listener
      if (canV13) {
        store.update!();
      } else {
        store.refresh?.();
      }
    };

    const w = window as unknown as WinEnv;
    const isCordova = typeof window !== "undefined" && !!w.cordova;
    const capPlat = w.Capacitor?.getPlatform?.();
    const isCapacitor = capPlat === "ios" || capPlat === "android";

    if (isCordova) {
      document.addEventListener("deviceready", initIAP, false);
      return () => document.removeEventListener("deviceready", initIAP, false);
    }

    if (isCapacitor) {
      if (
        document.readyState === "complete" ||
        document.readyState === "interactive"
      ) {
        initIAP();
      } else {
        const onReady = () => {
          initIAP();
          document.removeEventListener("DOMContentLoaded", onReady);
        };
        document.addEventListener("DOMContentLoaded", onReady);
        return () => document.removeEventListener("DOMContentLoaded", onReady);
      }
    }
  }, [isMobileApp]);

  /* Checkout */
  const handleCheckout = async (productId: string) => {
    setLoading(true);
    setError(null);

    try {
      if (isMobileApp) {
        if (!iapReady) throw new Error("Store non pronto. Riprova tra pochi istanti.");
        const w = window as unknown as WinEnv;
        const ns = w.CdvPurchase;
        const store: Store | undefined =
          ns?.store ?? ns?.Store ?? w.CdvPurchase?.Store;
        if (!store) throw new Error("Plugin IAP non disponibile");

        console.log("Avvio acquisto IAP per:", productId);
        store.order(productId);
      } else {
        const user = await getUtenteCompleto();
        const response = await fetch("/api/checkout-abbonamenti", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            priceId: productId,
            promoCode: promoCodeInput,
            userId: user.id,
          }),
        });

        const data = (await response.json()) as { url?: string; error?: string };
        if (response.ok && data.url) {
          window.location.href = data.url;
        } else {
          throw new Error(data.error || "Errore durante il checkout web.");
        }
      }
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Errore sconosciuto durante il checkout";
      setError({
        message: errorMessage,
        code: "CHECKOUT_ERROR",
        source: "Client",
      });
    } finally {
      if (!isMobileApp) setLoading(false);
    }
  };

  return (
    <Abbonamenti
      promoCodeInput={promoCodeInput}
      setPromoCodeInput={setPromoCodeInput}
      promoCodeValid={promoCodeValid ?? false}
      loading={loading}
      handleCheckout={handleCheckout}
      isMobileApp={isMobileApp}
    />
  );
}
