"use client";

import {
  Purchases,
  LOG_LEVEL,
  PurchasesOfferings,
  PurchasesOffering,
  PurchasesPackage,
  CustomerInfo,
} from "@revenuecat/purchases-capacitor";
import { Capacitor } from "@capacitor/core";

/* =====================
   Costanti di progetto
   ===================== */
type Platform = "ios" | "android" | "web";

const ENTITLEMENT_ID = "elite";
const DEFAULT_OFFERING_ID = "default";
const PKG_MONTHLY = "$rc_monthly";             // standard
const PKG_MONTHLY_PROMO = "$rc_monthly_promo"; // eventuale promo

let configured = false;
let listenerAttached = false;
let currentUserId: string | null = null;

/** Stato promo (solo in sessione) */
let promo = {
  code: null as string | null,
  packageId: null as string | null, // es. "$rc_monthly_promo"
  offeringId: DEFAULT_OFFERING_ID as string,
};

/* ============================================================
   SHIM COMPATIBILI REVENUECAT (senza any)
   ============================================================ */
type PurchasesConfigureArg = string | { apiKey: string; appUserID?: string | null };
type PurchasesLogInArg = string | { appUserID: string };
type PurchasesSetLogLevelArg = LOG_LEVEL | { level: LOG_LEVEL };
type PurchasesCustomerInfoWrapped = { customerInfo: CustomerInfo };

type PurchasesLike = {
  configure(arg: PurchasesConfigureArg): Promise<void>;
  logIn(arg: PurchasesLogInArg): Promise<CustomerInfo | PurchasesCustomerInfoWrapped>;
  logOut(): Promise<void>;
  getCustomerInfo(): Promise<CustomerInfo | PurchasesCustomerInfoWrapped>;
  getAppUserID(): Promise<string>;
  setLogLevel(arg: PurchasesSetLogLevelArg): Promise<void>;
  setAttributes(attrs: Record<string, string | null>): Promise<void>;
  addCustomerInfoUpdateListener(cb: (ci: CustomerInfo | PurchasesCustomerInfoWrapped) => void): void;
  getOfferings(): Promise<PurchasesOfferings>;
  purchasePackage(arg: { aPackage: PurchasesPackage }): Promise<
    { productIdentifier: string; customerInfo: CustomerInfo } |
    { productIdentifier: string; customerInfo: CustomerInfo }
  >;
  restorePurchases(): Promise<
    CustomerInfo | PurchasesCustomerInfoWrapped | { productIdentifier?: string; customerInfo: CustomerInfo }
  >;
};

const P = Purchases as unknown as PurchasesLike;

/* =========
   Type guards
   ========= */
function isCustomerInfo(x: unknown): x is CustomerInfo {
  return typeof x === "object" && x !== null && "entitlements" in x;
}
function isWrappedCustomerInfo(x: unknown): x is PurchasesCustomerInfoWrapped {
  return typeof x === "object" && x !== null && "customerInfo" in x;
}

/** setLogLevel: prova enum diretto, poi oggetto { level } */
async function setLogLevelSafe(level: LOG_LEVEL) {
  try {
    await P.setLogLevel(level);
  } catch {
    await P.setLogLevel({ level });
  }
}

/** configure: prova oggetto { apiKey, appUserID? }, fallback a stringa */
async function rcSafeConfigure(apiKey: string, appUserID?: string | null) {
  try {
    await P.configure({ apiKey, appUserID: appUserID ?? undefined });
  } catch {
    await P.configure(apiKey);
  }
}

/** logIn: prova oggetto { appUserID }, fallback a stringa */
async function rcSafeLogIn(appUserId: string) {
  try {
    await P.logIn({ appUserID: appUserId });
  } catch {
    await P.logIn(appUserId);
  }
}

/** getCustomerInfo: normalizza a CustomerInfo “puro” */
async function rcSafeGetCustomerInfo(): Promise<CustomerInfo> {
  const raw = await P.getCustomerInfo();
  if (isCustomerInfo(raw)) return raw;
  if (isWrappedCustomerInfo(raw)) return raw.customerInfo;
  throw new Error("Unexpected shape from Purchases.getCustomerInfo()");
}

/* =========
   Helpers
   ========= */
function getPlatform(): Platform {
  try {
    const p = Capacitor.getPlatform();
    if (p === "ios" || p === "android") return p;
  } catch {
    /* ignore */
  }
  return "web";
}
const isIOS = () => getPlatform() === "ios";
const isAndroid = () => getPlatform() === "android";

function getRCKeyForPlatform(): string {
  if (isIOS()) return process.env.NEXT_PUBLIC_REVENUECAT_IOS_KEY ?? "";
  if (isAndroid()) return process.env.NEXT_PUBLIC_REVENUECAT_ANDROID_KEY ?? "";
  return "";
}

/** alcune definizioni RC tipizzano entitlements.active come Record<string, unknown>.
    Usiamo una piccola interfaccia con isActive opzionale per leggere in sicurezza. */
type RCActiveEntry = { isActive?: boolean };

function entitlementActive(info: CustomerInfo | null, id: string): boolean {
  const active = info?.entitlements?.active as Record<string, RCActiveEntry> | undefined;
  return Boolean(active?.[id]?.isActive);
}

function parsePriceFromString(priceString: string): number | null {
  // gestisce "7,99 €", "€7.99", "US$7.99"
  const m = priceString.replace(",", ".").match(/([0-9]+(\.[0-9]+)?)/);
  return m ? parseFloat(m[1]) : null;
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
  } catch (e: unknown) {
    console.warn("[RC] syncToBackend failed:", e);
  }
}

/* =================================================
   Offerings (corretto) + retry per code 23
   ================================================= */
async function safeGetOfferings(maxRetries = 3): Promise<PurchasesOfferings> {
  let lastErr: unknown;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const offerings = await P.getOfferings();
      return offerings;
    } catch (e: unknown) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 600 * (i + 1)));
    }
  }
  throw (lastErr ?? new Error("getOfferings failed"));
}

/* =============================================
   Selezione package da un offering (con fallback)
   ============================================= */
function pickPackage(
  off: PurchasesOffering | null | undefined,
  preferredIds: string[] = []
): PurchasesPackage | null {
  if (!off) return null;

  for (const id of preferredIds) {
    const hit = off.availablePackages.find((p) => p.identifier === id);
    if (hit) return hit;
  }
  return off.availablePackages[0] ?? null;
}

/* ===================================
   Ricerca package per identifier globale
   =================================== */
async function findPackageByIdentifier(opts: {
  offeringId?: string;
  packageIdentifier: string; // es. "$rc_monthly_promo"
}): Promise<PurchasesPackage | null> {
  const offerings = await safeGetOfferings();

  // 1) offering richiesto o corrente
  const primary: PurchasesOffering | null =
    (opts.offeringId ? offerings.all?.[opts.offeringId] : null) ??
    offerings.current ??
    null;

  if (primary) {
    const hit = primary.availablePackages.find(
      (p) => p.identifier === opts.packageIdentifier
    );
    if (hit) return hit;
  }

  // 2) cerca ovunque
  const all = offerings.all ?? {};
  for (const key of Object.keys(all)) {
    const off = all[key];
    const hit = off?.availablePackages.find(
      (p) => p.identifier === opts.packageIdentifier
    );
    if (hit) return hit ?? null;
  }

  // 3) dump di debug
  const dump = {
    currentOfferingId: offerings.current?.identifier ?? null,
    currentPackages:
      offerings.current?.availablePackages.map((p) => p.identifier) ?? [],
    allOfferings: Object.fromEntries(
      Object.entries(all).map(([k, v]) => [
        k,
        v?.availablePackages.map((p) => p.identifier) ?? [],
      ])
    ),
  };
  console.warn("[RC] Package non trovato:", opts.packageIdentifier, dump);
  return null;
}

/* ==========================
   API pubbliche del modulo
   ========================== */

/** Ritorna l'App User ID corrente (o null su web) */
export async function rcGetAppUserId(): Promise<string | null> {
  if (getPlatform() === "web") return null;
  try {
    const id = await P.getAppUserID();
    return id ?? null;
  } catch {
    return null;
  }
}

/** Ritorna il CustomerInfo corrente (o null su web) */
export async function rcGetCustomerInfo(): Promise<CustomerInfo | null> {
  if (getPlatform() === "web") return null;
  try {
    return await rcSafeGetCustomerInfo();
  } catch {
    return null;
  }
}

/** Esegue logOut → diventi utente anonimo “vergine”.
 *  Ritorna il nuovo App User ID anonimo.
 */
export async function rcLogoutNewAnon(): Promise<string | null> {
  if (getPlatform() === "web") return null;
  try {
    await P.logOut(); // RC ora usa un nuovo anonymous user ID
  } catch {
    // ignora eventuali errori se già anonimo
  }
  currentUserId = null;
  clearPromoCode();
  try {
    const id = await P.getAppUserID();
    return id ?? null;
  } catch {
    return null;
  }
}

/** Forza login con un App User ID specifico (utile per “versionare” i tester) */
export async function rcLoginWithId(appUserId: string): Promise<string> {
  if (getPlatform() === "web") return appUserId;
  const trimmed = appUserId.trim();
  if (!trimmed) throw new Error("appUserId non valido");

  await rcSafeLogIn(trimmed);
  currentUserId = trimmed;

  try {
    const ci = await rcSafeGetCustomerInfo();
    await syncToBackend(trimmed, ci);
  } catch {
    /* ignore */
  }

  return trimmed;
}

/** Set di attributi utente (comodo per ambassador_code, note test, ecc.) */
export async function rcSetAttributes(attrs: Record<string, string | null>) {
  if (getPlatform() === "web") return;
  await P.setAttributes(attrs);
}

/** Inizializza RC (userId stabile) e listener sync */
export async function configureRevenueCat(userId: string): Promise<void> {
  if (getPlatform() === "web") return;

  const apiKey = getRCKeyForPlatform();
  if (!apiKey) throw new Error("RevenueCat API key mancante");

  currentUserId = userId;

  await setLogLevelSafe(LOG_LEVEL.DEBUG);

  if (!configured) {
    await rcSafeConfigure(apiKey, userId);
    configured = true;
  } else {
    try {
      await rcSafeLogIn(userId);
      const ci = await rcSafeGetCustomerInfo();
      await syncToBackend(userId, ci);
    } catch (err: unknown) {
      console.error("[RC] logIn error:", err);
    }
  }

  if (!listenerAttached) {
    P.addCustomerInfoUpdateListener(async (customerInfoLike) => {
      try {
        const ci = isCustomerInfo(customerInfoLike)
          ? customerInfoLike
          : isWrappedCustomerInfo(customerInfoLike)
          ? customerInfoLike.customerInfo
          : null;
        if (ci && currentUserId) await syncToBackend(currentUserId, ci);
      } catch (e: unknown) {
        console.warn("[RC] listener normalize error:", e);
      }
    });
    listenerAttached = true;
  }

  // sync iniziale
  try {
    const ci = await rcSafeGetCustomerInfo();
    await syncToBackend(userId, ci);
  } catch (e: unknown) {
    console.warn("[RC] getCustomerInfo init error:", e);
  }
}

export async function isEliteActive(): Promise<boolean> {
  if (getPlatform() === "web") return false;
  try {
    const ci = await rcSafeGetCustomerInfo();
    return entitlementActive(ci, ENTITLEMENT_ID);
  } catch (e: unknown) {
    console.error("[RC] isEliteActive error:", e);
    return false;
  }
}

/** Prezzo del pacchetto mensile standard */
export async function getEliteLocalizedPrice(): Promise<number | null> {
  if (getPlatform() === "web") return null;
  try {
    const offerings = await safeGetOfferings();
    const off =
      offerings.all?.[DEFAULT_OFFERING_ID] ?? offerings.current ?? null;

    const pkg = pickPackage(off, [PKG_MONTHLY]);
    if (!pkg) return null;

    return parsePriceFromString(pkg.product.priceString);
  } catch {
    return null;
  }
}

/** Helper per ottenere il prezzo di un package specifico (es. promo) */
export async function getPriceForPackage(
  offeringId: string,
  packageIdentifier: string
): Promise<number | null> {
  if (getPlatform() === "web") return null;
  const pkg = await findPackageByIdentifier({ offeringId, packageIdentifier });
  return pkg ? parsePriceFromString(pkg.product.priceString) : null;
}

/** Imposta/valida un codice promo sul backend e salva il package da usare */
export async function setPromoCode(
  code: string | null
): Promise<{ valid: boolean; message?: string }> {
  if (getPlatform() === "web") {
    promo = { code: null, packageId: null, offeringId: DEFAULT_OFFERING_ID };
    return { valid: false, message: "Promo non gestita sul web via RC" };
  }
  if (!code || !currentUserId) {
    promo = { code: null, packageId: null, offeringId: DEFAULT_OFFERING_ID };
    return { valid: false, message: "Codice mancante o utente non loggato" };
  }

  try {
    const res = await fetch("/api/promo/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: code.trim(),
        userId: currentUserId,
        platform: getPlatform(), // 'ios' | 'android'
      }),
    });

    type ValidateResp = {
      valid: boolean;
      message?: string;
      packageId?: string;
      offeringId?: string;
    };

    const data: ValidateResp = await res.json();

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
  } catch {
    promo = { code: null, packageId: null, offeringId: DEFAULT_OFFERING_ID };
    return { valid: false, message: "Errore di validazione" };
  }
}

export function clearPromoCode() {
  promo = { code: null, packageId: null, offeringId: DEFAULT_OFFERING_ID };
}

/** Acquisto esplicito di un package per identifier (usato dalla UI quando c'è promo) */
export async function purchasePackageByIdentifier(params: {
  packageIdentifier: string; // es. "$rc_monthly_promo"
  offeringId?: string; // default "default"
}): Promise<boolean> {
  if (getPlatform() === "web") return false;

  const pkg = await findPackageByIdentifier({
    packageIdentifier: params.packageIdentifier,
    offeringId: params.offeringId ?? DEFAULT_OFFERING_ID,
  });
  if (!pkg) throw new Error("Package non trovato");

  const raw = await P.purchasePackage({ aPackage: pkg });
  const res = isCustomerInfo(raw)
    ? { productIdentifier: "", customerInfo: raw }
    : isWrappedCustomerInfo(raw)
    ? { productIdentifier: "", customerInfo: raw.customerInfo }
    : (raw as { productIdentifier: string; customerInfo: CustomerInfo });

  if (currentUserId) await syncToBackend(currentUserId, res.customerInfo);
  return entitlementActive(res.customerInfo, ENTITLEMENT_ID);
}

/** Acquisto Elite. Se promo valida → compra package promo, altrimenti standard. */
export async function purchaseElite(): Promise<boolean> {
  if (getPlatform() === "web") return false;

  try {
    const offerings = await safeGetOfferings();

    // 1) Se ho promo attiva, provo quel package
    if (promo.packageId) {
      const pkgPromo = await findPackageByIdentifier({
        packageIdentifier: promo.packageId,
        offeringId: promo.offeringId,
      });

      if (pkgPromo) {
        const raw = await P.purchasePackage({ aPackage: pkgPromo });
        const res = isCustomerInfo(raw)
          ? { productIdentifier: "", customerInfo: raw }
          : isWrappedCustomerInfo(raw)
          ? { productIdentifier: "", customerInfo: raw.customerInfo }
          : (raw as { productIdentifier: string; customerInfo: CustomerInfo });

        if (currentUserId) await syncToBackend(currentUserId, res.customerInfo);
        return entitlementActive(res.customerInfo, ENTITLEMENT_ID);
      }

      console.warn("[RC] Promo package non presente, fallback a standard");
    }

    // 2) Fallback standard: default → $rc_monthly (o promo se presente nella lista)
    const off =
      offerings.all?.[DEFAULT_OFFERING_ID] ?? offerings.current ?? null;
    const pkg = pickPackage(off, [PKG_MONTHLY, PKG_MONTHLY_PROMO]);

    if (!pkg) throw new Error("Nessun package disponibile");

    const raw = await P.purchasePackage({ aPackage: pkg });
    const res = isCustomerInfo(raw)
      ? { productIdentifier: "", customerInfo: raw }
      : isWrappedCustomerInfo(raw)
      ? { productIdentifier: "", customerInfo: raw.customerInfo }
      : (raw as { productIdentifier: string; customerInfo: CustomerInfo });

    if (currentUserId) await syncToBackend(currentUserId, res.customerInfo);
    return entitlementActive(res.customerInfo, ENTITLEMENT_ID);
  } catch (e: unknown) {
    const msg =
      typeof e === "object" && e !== null
        ? (e as { errorMessage?: string; message?: string }).errorMessage ||
          (e as { message?: string }).message ||
          String(e)
        : String(e);
    console.error("[RC] purchaseElite error:", msg);
    return false;
  }
}

export async function restorePurchases(): Promise<boolean> {
  if (getPlatform() === "web") return false;
  try {
    const raw = await P.restorePurchases();
    const ci = isCustomerInfo(raw)
      ? raw
      : isWrappedCustomerInfo(raw)
      ? raw.customerInfo
      : (raw as { productIdentifier?: string; customerInfo: CustomerInfo })
          .customerInfo;

    if (currentUserId) await syncToBackend(currentUserId, ci);
    return entitlementActive(ci, ENTITLEMENT_ID);
  } catch (e: unknown) {
    console.error("[RC] restorePurchases error:", e);
    return false;
  }
}

/** Logout: scollega RC e resetta promo */
export async function onSignOut(): Promise<void> {
  if (getPlatform() === "web") return;
  try {
    await P.logOut();
  } catch (e: unknown) {
    console.warn("[RC] logOut error:", e);
  } finally {
    currentUserId = null;
    clearPromoCode();
  }
}

/* =====
   Utils
   ===== */
export async function getActivePromoPriceForUI(): Promise<number | null> {
  if (!promo.packageId || getPlatform() === "web") return null;
  const pkg = await findPackageByIdentifier({
    packageIdentifier: promo.packageId,
    offeringId: promo.offeringId,
  });
  return pkg ? parsePriceFromString(pkg.product.priceString) : null;
}

export function getPromoState() {
  return { ...promo };
}
