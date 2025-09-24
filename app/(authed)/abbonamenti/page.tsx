"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { getUtenteCompleto } from "@/lib/api";

// === Tipi già tuoi (accorciati qui dove irrilevante) ===
interface CustomError { message: string; code?: string; source?: string; }
interface IAPProduct {
  id: string;
  transaction?: Record<string, unknown>;
  finish: () => void;
  owned: boolean;
  canPurchase: boolean;
}
interface IAPError { code?: string | number; message?: string; [k: string]: unknown; }

type ProductMap = { get: (id: string) => IAPProduct | undefined };
type ProductCollection = ProductMap | IAPProduct[];
interface Store {
  ready: (callback: () => void) => void;
  when: (productId: string) => {
    approved: (callback: (product: IAPProduct) => void) => void;
    updated?: (callback: (product: IAPProduct) => void) => void;
  };
  error: (callback: (err: IAPError) => void) => void;
  refresh?: () => void;
  update?: () => void;
  order: (productId: string) => void;
  PAID_SUBSCRIPTION?: string;
  products?: ProductCollection;       // <--- QUI: niente any
  get?: (id: string) => IAPProduct | undefined;
  register?: (items: { id: string; type: string; platform?: string }[]) => void;
  initialize?: (opts: {
    products: { id: string; type: string; platform: string }[];
    debug?: boolean;
  }) => void;
}
type Platform = "ios" | "android";
interface ProductTypeNS { PAID_SUBSCRIPTION?: string; SUBSCRIPTION?: string; [k: string]: string | undefined; }
interface PlatformNS { APPLE_APPSTORE?: string; GOOGLE_PLAY?: string; [k: string]: string | undefined; }
interface CapacitorLike { getPlatform?: () => "ios" | "android" | "web"; }
interface DeviceLike { platform?: string; }
interface CdvPurchaseNS { store?: Store; Store?: Store; ProductType?: ProductTypeNS; Platform?: PlatformNS; }

type WinEnv = Window & Partial<{
  CdvPurchase: CdvPurchaseNS;
  Capacitor: CapacitorLike;
  device: DeviceLike;
  cordova: object;
}>;

const Abbonamenti = dynamic(
  () => import("@/components/Abbonamenti").then((m) => m.Abbonamenti),
  { ssr: false }
);
function isProductMap(x: unknown): x is ProductMap {
  return typeof x === "object"
    && x !== null
    && typeof (x as { get?: unknown }).get === "function";
}

export default function AbbonamentiPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<CustomError | null>(null);

  const [promoCodeInput, setPromoCodeInput] = useState<string>("");
  const [promoCodeValid, setPromoCodeValid] = useState<boolean | null>(null);

  const [iapReady, setIapReady] = useState(false);
  const [isMobileApp, setIsMobileApp] = useState(false);

  // Rilevamento ambiente “app”
  useEffect(() => {
    const w = window as unknown as WinEnv;
    const cap = w.Capacitor?.getPlatform?.();
    const isCapApp = cap === "ios" || cap === "android";
    const isCordova = !!w.cordova;
    setIsMobileApp(isCapApp || isCordova);
  }, []);

  // Validazione codici promo
  useEffect(() => {
    if (!promoCodeInput.trim()) {
      setPromoCodeValid(null);
      return;
    }
    (async () => {
      try {
        const res = await fetch("/api/valid-promo-codes");
        if (!res.ok) throw new Error("Errore nel recupero codici promo");
        const data = (await res.json()) as { codes?: string[] };
        const validCodes = data.codes || [];
        setPromoCodeValid(validCodes.includes(promoCodeInput.toUpperCase()));
      } catch {
        setPromoCodeValid(false);
      }
    })();
  }, [promoCodeInput]);

  // IAP init (solo app, con guardie forti)
  useEffect(() => {
    if (!isMobileApp) return;

    const initIAP = () => {
      const w = window as unknown as WinEnv;
      const ns = w.CdvPurchase;
      const store: Store | undefined = ns?.store ?? ns?.Store;

      if (!store || (!ns?.ProductType && !store.PAID_SUBSCRIPTION)) {
        console.warn("[IAP] store namespace non disponibile, skip init");
        return;
      }

      const productId = "it.skoolly.app.abbonamento.mensile";

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

      const paidType =
        ns?.ProductType?.SUBSCRIPTION ??
        ns?.ProductType?.PAID_SUBSCRIPTION ??
        store.PAID_SUBSCRIPTION ??
        "paid subscription";

      const Plat = ns?.Platform;

      const canV13 =
        typeof store.initialize === "function" &&
        typeof store.update === "function" &&
        !!Plat && !!runtime;

      try {
        if (canV13) {
          const platformEnum =
            runtime === "ios" ? (Plat!.APPLE_APPSTORE as string) : (Plat!.GOOGLE_PLAY as string);
          store.initialize?.({
            products: [{ id: productId, type: paidType, platform: platformEnum }],
            debug: true,
          });
        } else if (typeof store.register === "function") {
          // legacy
          const platformEnum =
            runtime === "ios" ? (Plat?.APPLE_APPSTORE as string) : (Plat?.GOOGLE_PLAY as string);
          store.register([{ id: productId, type: paidType, platform: platformEnum }]);
        } else {
          console.warn("[IAP] API non compatibile (no initialize/no register), salto init");
        }
      } catch (e) {
        console.warn("[IAP] initialize/register fallita:", e);
      }

      // LISTENER (safe)
      try {
        const whenObj = store.when(productId);
        whenObj.approved(async (product: IAPProduct) => {
          try {
            const tx = product.transaction as Record<string, unknown> | undefined;
            const receiptData = (tx?.receipt as string | undefined) ?? undefined;
            const transactionId = (tx?.id as string | undefined) ?? undefined;

            const plat: Platform =
              runtime ?? (w.Capacitor?.getPlatform?.() === "ios" ? "ios" : "android");

            if (!receiptData || !transactionId) {
              console.error("[IAP] dati transazione mancanti");
              return;
            }

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
              product.finish();
              setLoading(false);
            } else {
              const errorData = (await response.json().catch(() => ({}))) as { error?: string };
              setError({ message: errorData?.error ?? "Errore di validazione", source: "Backend" });
              setLoading(false);
            }
          } catch (err: unknown) {
            setError({ message: err instanceof Error ? err.message : "Errore sconosciuto", source: "Client" });
            setLoading(false);
          }
        });

        whenObj.updated?.((product: IAPProduct) => {
          if (product.owned) setLoading(false);
        });
      } catch (e) {
        console.warn("[IAP] attach listeners fallito:", e);
      }

      store.error((err: IAPError) => {
        setError({
          message: (typeof err.message === "string" && err.message) || "Errore IAP sconosciuto",
          source: "IAP",
        });
        setLoading(false);
      });

store.ready(() => {
  setIapReady(true);

  try {
    const pc = store.products;

    const getProductById = (id: string): IAPProduct | undefined => {
      if (!pc) return store.get?.(id);
      if (Array.isArray(pc)) return pc.find(p => p.id === id);
      if (isProductMap(pc)) return pc.get(id);
      return store.get?.(id);
    };

    void getProductById(productId);
  } catch {
    // no-op
  }
});


      // Avvio discovery DOPO i listener
      try {
        if (canV13) store.update?.();
        else store.refresh?.();
      } catch (e) {
        console.warn("[IAP] update/refresh fallita:", e);
      }
    };

    const w = window as unknown as WinEnv;
    const isCordova = !!w.cordova;
    const capPlat = w.Capacitor?.getPlatform?.();
    const isCapacitor = capPlat === "ios" || capPlat === "android";

    if (isCordova) {
      document.addEventListener("deviceready", initIAP, false);
      return () => document.removeEventListener("deviceready", initIAP, false);
    }

    if (isCapacitor) {
      if (document.readyState === "complete" || document.readyState === "interactive") {
        initIAP();
      } else {
        const onReady = () => { initIAP(); document.removeEventListener("DOMContentLoaded", onReady); };
        document.addEventListener("DOMContentLoaded", onReady);
        return () => document.removeEventListener("DOMContentLoaded", onReady);
      }
    }
  }, [isMobileApp]);

  // Checkout web / app
  const handleCheckout = async (productId: string) => {
    setLoading(true);
    setError(null);

    try {
      if (isMobileApp) {
        if (!iapReady) throw new Error("Store non pronto. Riprova tra pochi istanti.");
        const w = window as unknown as WinEnv;
        const ns = w.CdvPurchase;
        const store: Store | undefined = ns?.store ?? ns?.Store;
        if (!store) throw new Error("Plugin IAP non disponibile");
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
        if (response.ok && data.url) window.location.href = data.url;
        else throw new Error(data.error || "Errore durante il checkout web.");
      }
    } catch (err: unknown) {
      setError({
        message: err instanceof Error ? err.message : "Errore sconosciuto durante il checkout",
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
