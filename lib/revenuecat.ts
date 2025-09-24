// lib/revenuecat.ts
import { Capacitor } from "@capacitor/core";
import {
  Purchases,
  LOG_LEVEL,
  PurchasesOfferings,
  PurchasesPackage,
  CustomerInfo,
} from "@revenuecat/purchases-capacitor";

type RevenueCatError = {
  userCancelled?: boolean;
  code?: string | number;
  message?: string;
};

// Leggi le chiavi anche lato client: usare NEXT_PUBLIC_ è fondamentale in Next.js
const RC_IOS_KEY =
  process.env.NEXT_PUBLIC_REVENUECAT_IOS_KEY ||
  process.env.REVENUECAT_IOS_KEY || // fallback se builda lato native senza Next
  "appl_tua_api_key_ios_da_dashboard";

const RC_ANDROID_KEY =
  process.env.NEXT_PUBLIC_REVENUECAT_ANDROID_KEY ||
  process.env.REVENUECAT_ANDROID_KEY || // fallback
  "goog_tua_api_key_android_da_dashboard";

/**
 * Configura RevenueCat rilevando automaticamente la piattaforma.
 * Non passare booleani: in Capacitor possiamo leggere il runtime reale.
 */
export async function configureRevenueCat(appUserID?: string) {
  const platform = Capacitor.getPlatform(); // 'ios' | 'android' | 'web'
  const apiKey =
    platform === "ios"
      ? RC_IOS_KEY
      : platform === "android"
      ? RC_ANDROID_KEY
      : undefined;

  if (!apiKey) {
    console.warn(
      "[RevenueCat] piattaforma non mobile o apiKey mancante, skip configure()"
    );
    return;
  }

  await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
  await Purchases.configure({ apiKey, appUserID });
  console.log(
    `[RevenueCat] configurato (${platform}) con appUserID=${appUserID ?? "anon"}`
  );
}

/**
 * Acquisto del pacchetto Elite (monthly o monthly_promo).
 * Gli identifier devono esistere nell'Offering corrente in RevenueCat.
 */
export async function purchaseElite(
  usePromo: boolean = false
): Promise<boolean> {
  try {
    const offerings: PurchasesOfferings = await Purchases.getOfferings();
    const current = offerings.current;
    if (!current) {
      console.error("[RevenueCat] Nessuna offering corrente trovata");
      return false;
    }

    const wantedId = usePromo ? "monthly_promo" : "monthly";
    const selected: PurchasesPackage | undefined =
      current.availablePackages.find((p) => p.identifier === wantedId);

    if (!selected) {
      console.error(
        `[RevenueCat] Pacchetto '${wantedId}' non presente in offerings.current`
      );
      return false;
    }

    const { customerInfo }: { customerInfo: CustomerInfo } =
      await Purchases.purchasePackage({ aPackage: selected });

    const isElite =
      Boolean(customerInfo.entitlements.active?.["elite"]) ||
      Boolean(customerInfo.entitlements.active?.["Elitè"]); // nel dubbio, verifica entrambe

    if (isElite) {
      console.log("[RevenueCat] Abbonamento Elite attivo");
      return true;
    }

    console.warn(
      "[RevenueCat] acquisto riuscito ma entitlement 'elite' non attivo"
    );
    return false;
  } catch (e: unknown) {
    const err = e as RevenueCatError;
    if (err?.userCancelled) {
      console.log("[RevenueCat] acquisto annullato dall’utente");
    } else {
      console.error("[RevenueCat] purchase error:", err?.message || e);
    }
    return false;
  }
}

/** Controlla se l’utente ha l’entitlement 'elite' attivo */
export async function isEliteActive(): Promise<boolean> {
  try {
    const { customerInfo }: { customerInfo: CustomerInfo } =
      await Purchases.getCustomerInfo();
    return Boolean(customerInfo.entitlements.active?.["elite"]);
  } catch (e) {
    console.warn("[RevenueCat] getCustomerInfo error:", e);
    return false;
  }
}

/** Ripristina acquisti (iOS sandbox utile) */
export async function restorePurchases(): Promise<boolean> {
  try {
    const { customerInfo } = await Purchases.restorePurchases();
    return Boolean(customerInfo.entitlements.active?.["elite"]);
  } catch (e) {
    console.warn("[RevenueCat] restorePurchases error:", e);
    return false;
  }
}
