import Link from "next/link";

export default function OnboardingSuccessPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
      <h1 className="text-3xl font-bold mb-4">Account Stripe creato con successo!</h1>
      <p className="mb-6">
        Hai completato la configurazione del tuo account Stripe. Ora puoi tornare alla tua dashboard per gestire i pagamenti.
      </p>
      <Link href="/dashboard">
        <p className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 transition">
          Vai alla Dashboard
        </p>
      </Link>
    </div>
  );
}
