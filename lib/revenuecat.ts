import { Purchases, LOG_LEVEL, PurchasesOfferings, PurchasesPackage, CustomerInfo } from '@revenuecat/purchases-capacitor';

type RevenueCatError = {
  userCancelled?: boolean;
  code?: string;
  message?: string;
};

/**
 * Configura RevenueCat
 * @param isIOS true se iOS, false se Android
 * @param appUserID opzionale, per associare un ID utente
 */
export async function configureRevenueCat(isIOS: boolean, appUserID?: string) {
  const apiKey = isIOS
    ? process.env.REACT_APP_REVENUECAT_IOS_KEY || "appl_tua_api_key_ios_da_dashboard"
    : process.env.REACT_APP_REVENUECAT_ANDROID_KEY || "goog_tua_api_key_android_da_dashboard";

  try {
    await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG }); // utile per debug
    await Purchases.configure({ apiKey, appUserID });
    console.log("RevenueCat inizializzato correttamente");
  } catch (e) {
    console.error("Errore inizializzazione RevenueCat:", e);
  }
}

/**
 * Acquista abbonamento Elite
 * @param usePromo se true, acquista il pacchetto scontato
 */
export async function purchaseElite(usePromo: boolean = false): Promise<boolean> {
  try {
    const offerings: PurchasesOfferings = await Purchases.getOfferings();
    const currentOffering = offerings.current;

    if (!currentOffering) {
      console.error("Nessuna offerta trovata");
      return false;
    }

    // Scegli il pacchetto normale o promo
    const packageId = usePromo ? "monthly_promo" : "monthly"; // identifier pacchetto RevenueCat
    const selectedPackage: PurchasesPackage | undefined = currentOffering.availablePackages.find(
      (p) => p.identifier === packageId
    );

    if (!selectedPackage) {
      console.error(`Pacchetto '${packageId}' non trovato`);
      return false;
    }

    const { customerInfo }: { customerInfo: CustomerInfo } = await Purchases.purchasePackage({ aPackage: selectedPackage });

    if (customerInfo.entitlements.active?.["elite"]) {
      console.log("Abbonamento Elite attivo!");
      return true;
    }

    return false;
  } catch (e: unknown) {
    const err = e as RevenueCatError;
    if (err.userCancelled) {
      console.log("Acquisto annullato dall’utente");
    } else {
      console.error("Errore RevenueCat:", err.message || e);
    }
    return false;
  }
}

/**
 * Controlla se l'abbonamento Elite è attivo
 */

