"use client"
import Image from "next/image";
import DebugSession from "./_DebugSession";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import "@/app/globals.css";
import Link from "next/link";

interface NavbarProps {
  className?: string;
}

export default function Navbar({ className }: NavbarProps) {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/");
  };

  const handleLogin = () => {
    router.push("/login");
  };

  const isLogged = !!user;

  return (
    <nav
      className={`w-full flex items-center justify-between px-4 py-3 bg-background/80 backdrop-blur border-b sticky top-0 z-30 ${className || ""}`}
    >
      {/* Logo */}
      <div className="flex items-center gap-2">
        <Link href="/" className="flex items-center gap-2 no-underline">
          <Image
            src="/images/SkoollyLogo.png"
            alt="Logo"
            width={32}
            height={32}
            loading="lazy"
          />
          <h1 className="Skoolly text-3xl">Skoolly</h1>
        </Link>
      </div>

      {/* Desktop */}
      <div className="hidden md:flex gap-6 items-center">
        <a href="#features" className="hover:underline">Funzionalità</a>
        <a href="#how" className="hover:underline">Come funziona</a>
        <a href="#faq" className="hover:underline">FAQ</a>
        <a href="#contact" className="hover:underline">Contattaci</a>

        {isLogged ? (
          <>
            <span className="ml-4 font-medium text-[#1e293b] flex items-center gap-2">
              <Image
                src={user.user_metadata?.avatar_url || "/file.svg"}
                alt="Avatar"
                width={28}
                height={28}
                className="rounded-full border"
                loading="lazy"
              />
              {user.user_metadata?.name || user.email}
            </span>
            <button
              onClick={handleLogout}
              className="ml-2 px-4 py-2 rounded-md bg-[#fb7185] text-white font-medium shadow hover:bg-[#fbbf24] hover:text-[#1e293b] transition-colors"
            >
              Logout
            </button>
          </>
        ) : (
          <button
            onClick={handleLogin}
            className="ml-4 px-4 py-2 rounded-md bg-[#38bdf8] text-[#1e293b] font-medium shadow hover:bg-[#fbbf24] hover:text-[#1e293b] transition-colors"
          >
            Login
          </button>
        )}
      </div>

      {/* Mobile */}
      <div className="md:hidden flex items-center gap-2">
        {isLogged ? (
          <>
            <Image
              src={user.user_metadata?.avatar_url || "/file.svg"}
              alt="Avatar"
              width={28}
              height={28}
              className="rounded-full border"
              loading="lazy"
            />
            <button
              onClick={handleLogout}
              className="px-3 py-2 rounded-md bg-[#fb7185] text-white font-medium shadow hover:bg-[#fbbf24] hover:text-[#1e293b] transition-colors"
            >
              Logout
            </button>
          </>
        ) : (
          <button
            onClick={handleLogin}
            className="px-4 py-2 rounded-md bg-[#38bdf8] text-[#1e293b] font-medium shadow hover:bg-[#fbbf24] hover:text-[#1e293b] transition-colors"
          >
            Login
          </button>
        )}
      </div>

      <DebugSession user={user} />
    </nav>
  );
}
