"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";
import Image from "next/image";
import Link from "next/link";
import { Gem, LogOut, User } from "lucide-react";

export default function NavbarAuth() {
  const [user, setUser] = useState<{
    id: string;
    email: string;
    user_metadata?: { name?: string; avatar_url?: string };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const checkUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        
        router.push("/login");
        setLoading(false);
        return;
      } else {
        setUser({
          id: data.user.id,
          email: data.user.email ?? "",
          user_metadata: data.user.user_metadata,
        });
      }
      setLoading(false);
    };
    checkUser();
  }, [router]);
useEffect(() => {
  const handleClickOutside = (event: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
      setMenuOpen(false);
    }
  };
  document.addEventListener("mousedown", handleClickOutside);
  return () => document.removeEventListener("mousedown", handleClickOutside);
}, []);
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-lg">
        Caricamento...
      </div>
    );
  }

  return (
    <>
      <nav className="w-full flex items-center justify-between px-4 py-3 bg-background backdrop-blur border-b sticky top-0 z-30">
        <div className="flex items-center gap-2">
                <Link href="/home" className="flex items-center gap-2 no-underline">
  <Image src="/images/SkoollyLogo.png" alt="Logo" width={32} height={32}  loading="lazy"/>
  <h1 className="Skoolly text-3xl">Skoolly</h1>
</Link>
              </div>

        {/* Hamburger */}
        <button
          className="md:hidden relative w-7 h-7 flex items-center justify-center cursor-pointer"
          aria-label="Toggle menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span
            className={`absolute left-1/2 top-1/2 w-6 h-0.5 bg-[#1e293b] rounded transition-all duration-300
              -translate-x-1/2 -translate-y-1/2
              ${menuOpen ? 'rotate-45' : '-translate-y-2'}
            `}
          />
          <span
            className={`absolute left-1/2 top-1/2 w-6 h-0.5 bg-[#1e293b] rounded transition-all duration-300
              -translate-x-1/2 -translate-y-1/2
              ${menuOpen ? 'opacity-0' : ''}
            `}
          />
          <span
            className={`absolute left-1/2 top-1/2 w-6 h-0.5 bg-[#1e293b] rounded transition-all duration-300
              -translate-x-1/2 -translate-y-1/2
              ${menuOpen ? '-rotate-45' : 'translate-y-2'}
            `}
          />
        </button>

        <div className="hidden md:flex items-center gap-6">
  <button
    onClick={() => router.push("/home")}
    className="text-[#1e293b] font-medium hover:underline transition"
  >
    Home
  </button>
  <button
    onClick={() => router.push("/dashboard")}
    className="text-[#1e293b] font-medium hover:underline transition"
  >
    Dashboard
  </button>
  <button
    onClick={() => router.push("/promozioni")}
    className="text-[#1e293b] font-medium hover:underline transition"
  >
    Promozioni
  </button>
  <button
    onClick={() => router.push("/eventi")}
    className="text-[#1e293b] font-medium hover:underline transition"
  >
    Eventi
  </button>
  <button
    onClick={() => router.push("/merchandising")}
    className="text-[#1e293b] font-medium hover:underline transition"
  >
    Merchandising
  </button>
  <button
    onClick={() => router.push("/ripetizioni")}
    className="text-[#1e293b] font-medium hover:underline transition"
  >
    Ripetizioni
  </button>
  {/* <button
    onClick={() => router.push("/foto-di-classe")}
    className="text-[#1e293b] font-medium hover:underline transition"
  >
    Foto di Classe
  </button>
  <button
    onClick={() => router.push("/blog")}
    className="text-[#1e293b] font-medium hover:underline transition"
  >
    Blog
  </button> */}
  <button
    onClick={() => router.push("/marketplace")}
    className="text-[#1e293b] font-medium hover:underline transition"
  >
    Marketplace
  </button>
  


  
  {/* <button
    disabled
    className="text-[#1e293b] font-medium opacity-60 cursor-not-allowed"
  >
    Altro in arrivo
  </button> */}

  {/* Profilo + Logout */}
  <div className="relative group">
  <button
    className="focus:outline-none"
    style={{ background: "none", border: "none", padding: 0 }}
  >
    {user?.user_metadata?.avatar_url ? (
      <Image
        src={user.user_metadata.avatar_url}
        alt="Avatar"
        width={36}
        height={36}
        className="rounded-full border shadow"
        loading="lazy"
      />
    ) : (
      <span
        className="w-9 h-9 flex items-center justify-center rounded-full bg-[#38bdf8] text-white font-bold text-lg border shadow"
        style={{ display: "inline-flex" }}
      >
        {user?.user_metadata?.name?.[0]?.toUpperCase() ||
          user?.email?.[0]?.toUpperCase() ||
          "?"}
      </span>
    )}
  </button>

  {/* Tooltip menu */}
<div
  className="absolute right-0 mt-2 w-40 bg-white border rounded shadow z-50 text-sm opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 flex flex-col"
>
  <button
    onClick={() => router.push("/profilo")}
    className="w-full flex items-center px-4 py-2 hover:bg-gray-100"
  >
    <User className="w-4 h-4" />
    <span className="flex-grow text-center">Profilo</span>
  </button>

  <button
    onClick={() => router.push("/abbonamenti")}
    className="w-full flex items-center px-4 py-2 hover:bg-gray-100"
  >
    <Gem className="w-4 h-4 text-yellow-400 animate-pulse" />
    <span className="flex-grow text-center font-semibold">Abbonati</span>
  </button>

  <button
    onClick={async () => {
      // Revoca la sessione su Supabase
      await supabase.auth.signOut()

      // Chiama la tua API per eliminare i cookie
      await fetch("/api/auth/logout", { method: "POST" })

      // Redirect al login
      router.push("/login")
    }}
    className="w-full flex items-center px-4 py-2 hover:bg-gray-100"
  >
    <LogOut className="w-4 h-4" />
    <span className="flex-grow text-center">Logout</span>
  </button>
</div>


</div>

</div>

      </nav>

      {/* Overlay Menu per mobile */}
      <div
        className={`fixed top-0 left-0 w-full h-full bg-[#3b82f6] text-white transform transition-transform duration-300 ease-in-out z-10
          ${menuOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Top bar: logo and close button */}
        {/* <div className="flex items-center justify-between px-6 py-4 border-b border-blue-500 relative">
          <span className="text-2xl font-bold">ForSchool</span>
          <button
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
            className="absolute right-6 top-4 text-white text-3xl font-bold z-20 bg-transparent border-none"
            style={{ lineHeight: 1 }}
          >
            &times;
          </button>
        </div> */}
        {/* Navigation options */}
        <nav className="px-6 py-20 flex flex-col gap-6 overflow-y-auto h-[calc(100vh-72px)]">
          <button
            className="text-lg font-semibold text-white text-left hover:underline flex items-center gap-2"
            onClick={() => { router.push("/home"); setMenuOpen(false); }}
          >
            <span role="img" aria-label="Home">🏠</span> Home
          </button>
          <button
            className="text-lg font-semibold text-white text-left hover:underline flex items-center gap-2"
            onClick={() => { router.push("/ripetizioni"); setMenuOpen(false); }}
          >
            <span role="img" aria-label="Ripetizioni">📚</span> Ripetizioni
          </button>
          <button
            className="text-lg font-semibold text-white text-left hover:underline flex items-center gap-2"
            onClick={() => { router.push("/marketplace"); setMenuOpen(false); }}
          >
            <span role="img" aria-label="Marketplace">🛒</span> Marketplace
          </button>
          <button
            className="text-lg font-semibold text-white text-left hover:underline flex items-center gap-2"
            onClick={() => { router.push("/merch"); setMenuOpen(false); }}
          >
            <span role="img" aria-label="Merch">👕</span> Merch
          </button>
          <button
            className="text-lg font-semibold text-white text-left hover:underline flex items-center gap-2"
            onClick={() => { router.push("/eventi"); setMenuOpen(false); }}
          >
            <span role="img" aria-label="Biglietti Eventi">🎟️</span> Biglietti Eventi
          </button>
          <button
            className="text-lg font-semibold text-white text-left hover:underline flex items-center gap-2"
            onClick={() => { router.push("/blog"); setMenuOpen(false); }}
          >
            <span role="img" aria-label="Blog">📝</span> Blog
          </button>
          {/* <button
            className="text-lg font-semibold text-white text-left hover:underline flex items-center gap-2 opacity-60 cursor-not-allowed"
            disabled
          >
            <span role="img" aria-label="Altro in arrivo">🚀</span> Altro in arrivo
          </button> */}
          <button
            className="text-lg font-semibold text-white text-left hover:underline flex items-center gap-2"
            onClick={() => { router.push("/profilo"); setMenuOpen(false); }}
          >
            <span role="img" aria-label="Profilo">👤</span> Profilo
          </button>
        </nav>
      </div>
    </>
  );
}
