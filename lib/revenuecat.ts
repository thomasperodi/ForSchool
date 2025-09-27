"use client";

import {
  Purchases,
  LOG_LEVEL,
  PurchasesOfferings,
  PurchasesOffering,
  PurchasesPackage,
  CustomerInfo,
} from "@revenuecat/purchases-capacitor";

type Platform = "ios" | "android" | "web";

declare global {
  interface Window {
    Capacitor?: { getPlatform?: () => Platform };
  }
}

const ENTITLEMENT_ID = "elite";
const DEFAULT_OFFERING_ID = "default";
const PACKAGE_MONTHLY = "$rc_monthly";

let configured = false;
let listenerAttached = false;
let currentUserId: string | null = null;

// Stato PROMO in memoria (per la sessione corrente dell’app)
let promo = {
  code: null as string | null,
  packageId: null as string | null,   // es. "$rc_monthly_promo" o "elite_promo"
  offeringId: DEFAULT_OFFERING_ID as string,
};

function getPlatform(): Platform {
  try {
    const p = window?.Capacitor?.getPlatform?.();
    if (p === "ios" || p === "android") return p;
  } catch {}
  return "web";
}

function getRCKeyForPlatform(): string {
  const p = getPlatform();
  if (p === "ios") return process.env.NEXT_PUBLIC_REVENUECAT_IOS_KEY ?? "";
  if (p === "android") return process.env.NEXT_PUBLIC_REVENUECAT_ANDROID_KEY ?? "";
  return "";
}

function isEntitlementActive(info: CustomerInfo | null, id: string): boolean {
  return !!info?.entitlements?.active?.[id]?.isActive;
}

async function syncToBackend(userId: string, info: CustomerInfo) {
  try {
    const ent = info.entitlements?.all?.[ENTITLEMENT_ID];
    await fetch("/api/subscription/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appUserId: userId,
        environment: ent?.isSandbox ? "SANDBOX" : "PRODUCTION",
        customerInfo: info,
      }),
    });
  } catch (e) {
    console.warn("[RC] syncToBackend failed:", e);
  }
}

/** Inizializza RC con userId stabile e attiva sync DB. */
export async function configureRevenueCat(userId: string): Promise<void> {
  if (getPlatform() === "web") return;
  const apiKey = getRCKeyForPlatform();
  if (!apiKey) throw new Error("RevenueCat API key mancante");

  currentUserId = userId;
  await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });

  if (!configured) {
    await Purchases.configure({ apiKey, appUserID: userId }); // niente anonimo
    configured = true;
  } else {
    // merge su utente stabile
    try {
      const { customerInfo } = await Purchases.logIn({ appUserID: userId });
      await syncToBackend(userId, customerInfo);
    } catch (err) {
      console.error("[RC] Errore in logIn:", err);
    }
  }

  if (!listenerAttached) {
    // Nota: il plugin Capacitor passa direttamente CustomerInfo al listener
    Purchases.addCustomerInfoUpdateListener(async (customerInfo: CustomerInfo) => {
      if (currentUserId) await syncToBackend(currentUserId, customerInfo);
    });
    listenerAttached = true;
  }

  // sync iniziale
  try {
    const infoResp = await Purchases.getCustomerInfo();
    const info = infoResp.customerInfo;
    await syncToBackend(userId, info);
  } catch (e) {
    console.warn("[RC] getCustomerInfo init error:", e);
  }
}

export async function isEliteActive(): Promise<boolean> {
  if (getPlatform() === "web") return false;
  try {
    const infoResp = await Purchases.getCustomerInfo();
    const info = infoResp.customerInfo;
    return isEntitlementActive(info, ENTITLEMENT_ID);
  } catch (e) {
    console.error("[RC] isEliteActive error:", e);
    return false;
  }
}

export async function getEliteLocalizedPrice(): Promise<number | null> {
  if (getPlatform() === "web") return null;
  try {
    const offerings: PurchasesOfferings = await Purchases.getOfferings();
    const off: PurchasesOffering | null =
      offerings.all?.[DEFAULT_OFFERING_ID] ?? offerings.current ?? null;

    const pkg: PurchasesPackage | undefined =
      off?.availablePackages.find((p) => p.identifier === PACKAGE_MONTHLY) ??
      off?.availablePackages[0];
    if (!pkg) return null;

    const priceString = pkg.product.priceString; // es. "7,99 €"
    const match = priceString.replace(",", ".").match(/([0-9]+(\.[0-9]+)?)/);
    return match ? parseFloat(match[1]) : null;
  } catch {
    return null;
  }
}

/* =========================
   PROMO: helper & acquisto
   ========================= */

// Trova un package per identifier dentro un offering
async function findPackageByIdentifier(opts: {
  offeringId?: string;                 // facoltativo
  packageIdentifier: string;           // es. "$rc_monthly_promo"
}): Promise<PurchasesPackage | null> {
  const offerings: PurchasesOfferings = await Purchases.getOfferings();

  // 1) prova prima nell'offering richiesto (se passato) o in current
  const primaryOffering: PurchasesOffering | null =
    (opts.offeringId ? offerings.all?.[opts.offeringId] : null) ??
    offerings.current ??
    null;

  if (primaryOffering) {
    const fromPrimary = primaryOffering.availablePackages.find(p => p.identifier === opts.packageIdentifier);
    if (fromPrimary) return fromPrimary;
  }

  // 2) cerca in TUTTI gli offering
  const allOfferings: PurchasesOffering[] = Object.values(offerings.all ?? {}).filter(Boolean);
  for (const off of allOfferings) {
    const hit = off.availablePackages.find(p => p.identifier === opts.packageIdentifier);
    if (hit) return hit;
  }

  // 3) Debug: elenca tutto quello che c’è
  const dump = {
    currentOfferingId: offerings.current?.identifier ?? null,
    currentPackages: offerings.current?.availablePackages.map(p => p.identifier) ?? [],
    allOfferings: Object.fromEntries(
      Object.entries(offerings.all ?? {}).map(([k, v]) => [k, v?.availablePackages.map(p => p.identifier) ?? []])
    ),
  };
  console.warn("[RC] Package non trovato:", opts.packageIdentifier, "Dump offerings:", dump);

  return null;
}


// Acquista un package specifico (es. promo)
export async function purchasePackageByIdentifier(opts: {
  packageIdentifier: string;
  offeringId?: string;
}): Promise<boolean> {
  if (getPlatform() === "web") return false;

  const pkg = await findPackageByIdentifier(opts);
  if (!pkg) {
    throw new Error(`Package non trovato: ${opts.packageIdentifier}. Controlla l'identifier in RevenueCat (Offerings).`);
  }

  const res = await Purchases.purchasePackage({ aPackage: pkg }) as {
    productIdentifier: string;
    customerInfo: CustomerInfo;
  };
  const info = res.customerInfo;
  if (currentUserId) await syncToBackend(currentUserId, info);
  return isEntitlementActive(info, ENTITLEMENT_ID);
}


// Legge il prezzo di un package specifico (per UI)
export async function getPromoLocalizedPrice(): Promise<number | null> {
  if (getPlatform() === "web") return null;
  if (!promo.packageId) return null;
  try {
    const pkg = await findPackageByIdentifier({
      packageIdentifier: promo.packageId,
      offeringId: promo.offeringId,
    });
    if (!pkg) return null;
    const priceString = pkg.product.priceString;
    const match = priceString.replace(",", ".").match(/([0-9]+(\.[0-9]+)?)/);
    return match ? parseFloat(match[1]) : null;
  } catch {
    return null;
  }
}

/** Imposta/valida un codice promo lato server e memorizza il package promo da usare al checkout. */
export async function setPromoCode(code: string | null): Promise<{ valid: boolean; message?: string }> {
  if (getPlatform() === "web") {
    // nessun RC su web; qui non ha senso validare (usa la tua UI web/Stripe)
    promo = { code: null, packageId: null, offeringId: DEFAULT_OFFERING_ID };
    return { valid: false, message: "Promo non gestita sul web via RC" };
  }
  if (!code || !currentUserId) {
    promo = { code: null, packageId: null, offeringId: DEFAULT_OFFERING_ID };
    return { valid: false, message: "Codice mancante o utente non loggato" };
  }

  // rileva piattaforma per la validazione
  const platform = getPlatform(); // 'ios' | 'android'
  if (platform === "web") {
    return { valid: false, message: "Ambiente non mobile" };
  }

  try {
    const res = await fetch("/api/promo/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: code.trim(),
        userId: currentUserId,
        platform,
      }),
    });
    const data = await res.json() as {
      valid: boolean;
      message?: string;
      packageId?: string;
      offeringId?: string;
    };

    if (!res.ok || !data.valid || !data.packageId) {
      promo = { code: null, packageId: null, offeringId: DEFAULT_OFFERING_ID };
      return { valid: false, message: data?.message ?? "Codice non valido" };
    }

    promo = {
      code: code.trim(),
      packageId: data.packageId,
      offeringId: data.offeringId ?? DEFAULT_OFFERING_ID,
    };
    return { valid: true, message: data.message ?? "Codice valido" };
  } catch (e) {
    promo = { code: null, packageId: null, offeringId: DEFAULT_OFFERING_ID };
    return { valid: false, message: "Errore di validazione" };
  }
}

export function clearPromoCode() {
  promo = { code: null, packageId: null, offeringId: DEFAULT_OFFERING_ID };
}

// Acquisto “Elite”: se c’è un promo attivo valido → compra il package promo, altrimenti quello standard
type PurchaseResult = {
  productIdentifier: string;
  customerInfo: CustomerInfo;
  transaction?: {
    transactionIdentifier?: string;
    productIdentifier?: string;
    purchaseDateMillis?: number;
    purchaseDate?: string;
  };
};

export async function purchaseElite(): Promise<boolean> {
  if (getPlatform() === "web") return false;
  try {
    // Se è presente un package promo valido, acquistalo
    if (promo.packageId) {
      return await purchasePackageByIdentifier({
        packageIdentifier: promo.packageId,
        offeringId: promo.offeringId,
      });
    }

    // Altrimenti flusso standard
    const offerings = await Purchases.getOfferings();
    const off = offerings.all?.[DEFAULT_OFFERING_ID] ?? offerings.current ?? null;
    const pkg =
      off?.availablePackages.find((p) => p.identifier === PACKAGE_MONTHLY) ??
      off?.availablePackages[0];

    if (!pkg) throw new Error("Nessun package disponibile");

    const res = (await Purchases.purchasePackage({ aPackage: pkg })) as PurchaseResult;
    const info = res.customerInfo;
    if (currentUserId) await syncToBackend(currentUserId, info);
    return isEntitlementActive(info, ENTITLEMENT_ID);
  } catch (e) {
    console.error("[RC] purchaseElite error:", e);
    return false;
  }
}

export async function restorePurchases(): Promise<boolean> {
  if (getPlatform() === "web") return false;
  try {
    const restoreResp = await Purchases.restorePurchases();
    const info = restoreResp.customerInfo;
    if (currentUserId) await syncToBackend(currentUserId, info);
    return isEntitlementActive(info, ENTITLEMENT_ID);
  } catch (e) {
    console.error("[RC] restorePurchases error:", e);
    return false;
  }
}

/** Logout app: scollega l’utente RC e resetta promo. */
export async function onSignOut(): Promise<void> {
  if (getPlatform() === "web") return;
  try {
    await Purchases.logOut();
  } catch (e) {
    console.warn("[RC] logOut error:", e);
  } finally {
    currentUserId = null;
    clearPromoCode();
  }
}

/* ===========
   Utils extra
   =========== */

// opzionale: prezzo promo per UI (se vuoi mostrarlo quando il codice è valido)
export async function getActivePromoPriceForUI(): Promise<number | null> {
  if (!promo.packageId) return null;
  return getPromoLocalizedPrice();
}

// per debugging
export function getPromoState() {
  return { ...promo };
}
