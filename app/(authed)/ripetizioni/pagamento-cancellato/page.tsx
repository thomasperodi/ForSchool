'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PagamentoCancellato() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/home');
    }, 5000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <main className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-tr from-red-500 via-pink-600 to-purple-700 px-6">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-8 text-center">
        <svg
          className="mx-auto mb-6 w-16 h-16 text-red-500 animate-pulse"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>

        <h1 className="text-3xl font-extrabold text-gray-900 mb-4">
          Prenotazione <span className="text-red-600">non completata</span>
        </h1>

        <p className="text-gray-700 mb-2 text-lg">
          La tua prenotazione della ripetizione non è andata a buon fine.
        </p>

        <p className="text-gray-500 mb-6">
          Puoi riprovare quando vuoi!
        </p>

        <p className="text-red-700 font-semibold">
          Verrai reindirizzato alla home tra <span className="font-bold">5</span> secondi...
        </p>
      </div>
    </main>
  );
}
