'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PagamentoSuccesso() {
  const router = useRouter();
//   const searchParams = useSearchParams();
//   const sessionId = searchParams.get('session_id');

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/home');
    }, 5000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <main className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-tr from-indigo-500 via-purple-600 to-pink-500 px-6">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-8 text-center">
        <svg
          className="mx-auto mb-6 w-16 h-16 text-green-500 animate-bounce"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>

        <h1 className="text-3xl font-extrabold text-gray-900 mb-4">
          Grazie per aver utilizzato <span className="Skoolly">Skoolly</span>!
        </h1>

        <p className="text-gray-700 mb-2 text-lg">
          La tua prenotazione della ripetizione è stata completata con successo.
        </p>

        {/* <p className="text-gray-500 font-mono break-words mb-6">
          Session ID: <code>{sessionId || 'N/A'}</code>
        </p> */}

        <p className="text-indigo-700 font-semibold">
          Verrai reindirizzato alla home tra <span className="font-bold">5</span> secondi...
        </p>
      </div>
    </main>
  );
}
