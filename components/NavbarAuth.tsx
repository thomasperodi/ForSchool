
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";
import Image from "next/image";

export default function NavbarAuth() {
    const [user, setUser] = useState<{ 
        id: string; 
        email: string; 
        user_metadata?: { name?: string; avatar_url?: string } 
      } | null>(null);
      const [loading, setLoading] = useState(true);
      const router = useRouter();
    
      useEffect(() => {
        const checkUser = async () => {
          const { data, error } = await supabase.auth.getUser();
          if (error || !data.user) {
            toast.error("Devi essere autenticato per accedere alla home.");
            router.push("/login");
            setLoading(false);
            return;
          } else {
            // Adattiamo data.user per rispettare il tipo richiesto da setUser
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
    
      if (loading) {
        return (
          <div className="min-h-screen flex items-center justify-center text-lg">
            Caricamento...
          </div>
        );
      }

      return(
        <>
    <nav className="flex items-center justify-between px-8 py-4 bg-white/80 shadow">
        <span className="text-2xl font-bold text-[#1e293b]">ForSchool</span>
        <div className="flex items-center gap-4">
          {/* Avatar utente con tooltip/link alle impostazioni */}
          <button
            onClick={() => router.push("/profilo")}
            title="Impostazioni profilo"
            className="relative group focus:outline-none"
            style={{ background: "none", border: "none", padding: 0 }}
          >
            {user?.user_metadata?.avatar_url ? (
              <Image
                src={user.user_metadata.avatar_url}
                alt="Avatar"
                width={36}
                height={36}
                className="rounded-full border shadow"
              />
            ) : (
              <span
                className="w-9 h-9 flex items-center justify-center rounded-full bg-[#38bdf8] text-white font-bold text-lg border shadow"
                style={{ display: "inline-flex" }}
              >
                {user?.user_metadata?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "?"}
              </span>
            )}
            {/* Tooltip visibile su hover */}
            <span className="absolute left-1/2 -translate-x-1/2 mt-2 px-2 py-1 rounded bg-[#1e293b] text-white text-xs opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-10">
              Impostazioni profilo
            </span>
          </button>
          <button
            className="bg-[#38bdf8] text-white px-4 py-2 rounded hover:bg-[#0ea5e9] transition"
            onClick={async () => {
              await supabase.auth.signOut();
              router.push("/login");
            }}
          >
            Esci
          </button>
        </div>
      </nav>
    </>
      )
}