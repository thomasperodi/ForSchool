import Link from "next/link";

export default function SuccessPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-green-50 px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h1 className="text-2xl font-bold text-green-700 mb-2">Acquisto completato!</h1>
        <p className="text-gray-700 mb-6">
          Grazie per aver acquistato sulla nostra piattaforma.<br />
          Ti abbiamo inviato una conferma via email.<br />
          <span className="block mt-2">A presto!</span>
        </p>
        <Link
          href="/home"
          className="inline-block bg-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700 transition"
        >
          Torna alla Home
        </Link>
      </div>
    </div>
  );
}
