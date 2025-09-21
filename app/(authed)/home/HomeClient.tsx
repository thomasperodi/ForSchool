"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabaseClient";
import { Capacitor } from "@capacitor/core";
import {
  PushNotifications,
} from "@capacitor/push-notifications";
import { FirebaseMessaging } from "@capacitor-firebase/messaging";
import { SecureStoragePlugin } from "capacitor-secure-storage-plugin";

// shadcn/ui
import * as Dialog from "@radix-ui/react-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  // Definizione del tipo per l'utente
  type Utente = {
    id: string;
    nome?: string;
    email?: string;
    scuole?: {
      nome?: string;
      citta?: string;
    } | null;
    classi?: {
      anno?: string;
      sezione?: string;
    } | null;
    // aggiungi altri campi se necessario
  };

  const [user, setUser] = useState<Utente | null>(null);
  const [isSubscribed, setIsSubscribed] = useState<boolean | null>(null);

  // Dialog scuola/classe

  // Definizione dei tipi per province, scuole e classi
  type Provincia = {
    id: string;
    nome: string;
    codice: string;
  };

  type Scuola = {
    id: string;
    nome: string;
    citta?: string;
    provincia_id?: string;
  };

  type Classe = {
    id: string;
    anno: string;
    sezione: string;
    scuola_id?: string;
  };

  const [showSchoolDialog, setShowSchoolDialog] = useState(false);
  const [provinces, setProvinces] = useState<Provincia[]>([]);
  const [schools, setSchools] = useState<Scuola[]>([]);
  const [classes, setClasses] = useState<Classe[]>([]);
  const [provinceName, setProvinceName] = useState<string>("");
  const [schoolId, setSchoolId] = useState<string>("");
  const [classId, setClassId] = useState<string>("");

  // New states for creating a new class
  const [newAnno, setNewAnno] = useState<string>("");
  const [newSezione, setNewSezione] = useState<string>("");

  // ---------- INIT USER ----------
  useEffect(() => {
    const init = async () => {
      const tokenKey = `sb-${process.env.NEXT_PUBLIC_SUPABASE_URL!.split("//")[1].split(".")[0]}-auth-token`;

      let token: string | null = null;
      try {
        token = await SecureStoragePlugin.get({ key: tokenKey }).then(res => res.value);
      } catch (err: unknown) {
        if (err instanceof Error) console.warn("[CapacitorStorage] getItem errore:", err.message);
        token = localStorage.getItem(tokenKey) || null;
      }

      if (!token) {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
        return;
      }

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.push("/login");
        return;
      }

      // Carica dati utente dalla tabella utenti con scuola/classe
      const { data: profile } = await supabase
        .from("utenti")
        .select("*, scuole(nome, citta), classi(anno, sezione)")
        .eq("id", userData.user.id)
        .single();

      if (!profile) {
        router.push("/login");
        return;
      }

      setUser(profile);

      // Controlla abbonamento
      const { data: subData } = await supabase
        .from("abbonamenti")
        .select("stato")
        .eq("utente_id", userData.user.id)
        .eq("stato", "active")
        .single();

      setIsSubscribed(subData?.stato === "active");

      console.log("profile", profile);
       if (profile.ruolo === "studente" && (!profile.scuola_id || !profile.classe_id)) {
      setShowSchoolDialog(true);
      // Imposta la provincia e la scuola se esistono
      if (profile.scuola_id && profile.scuole?.citta) {
        setProvinceName(profile.scuole.citta);
        setSchoolId(profile.scuola_id);
      }
    }

      setLoading(false);
    };

    init();
  }, [router]);

  // ---------- LOAD PROVINCES ----------
  useEffect(() => {
    const fetchProvinces = async () => {
      try {
        const response = await fetch("https://axqvoqvbfjpaamphztgd.functions.supabase.co/province");
        if (!response.ok) throw new Error("Failed to fetch provinces");
        const data = await response.json();
        setProvinces(data);
      } catch (error) {
        console.error("Error fetching provinces:", error);
        toast.error("Errore nel caricamento delle province.");
      }
    };
    fetchProvinces();
  }, []);

  // ---------- LOAD SCHOOLS ON PROVINCE CHANGE ----------
  useEffect(() => {
    if (!provinceName) {
      setSchools([]);
      return;
    }
    const fetchSchools = async () => {
      const { data } = await supabase.from("scuole").select("*").eq("citta", provinceName);
      setSchools(data || []);
    };
    fetchSchools();
  }, [provinceName]);

  // ---------- LOAD CLASSES ON SCHOOL CHANGE ----------
  useEffect(() => {
    if (!schoolId) {
      setClasses([]);
      return;
    }
    const fetchClasses = async () => {
      const { data } = await supabase.from("classi").select("*").eq("scuola_id", schoolId);
      setClasses(data || []);
    };
    fetchClasses();
  }, [schoolId]);

  // ---------- SAVE SCHOOL & CLASS ----------
  const saveSchoolClass = async () => {
    if (!schoolId) {
      toast.error("Devi selezionare una scuola.");
      return;
    }
  
    let finalClassId = classId;
    if (classId === "create-new") {
      if (!newAnno || !newSezione) {
        toast.error("Devi inserire anno e sezione per la nuova classe.");
        return;
      }
  
      const { data, error } = await supabase
        .from("classi")
        .insert({
          scuola_id: schoolId,
          anno: parseInt(newAnno),
          sezione: newSezione.toUpperCase(),
        })
        .select("id")
        .single();
  
      if (error) {
        if (error.code === '23505') {
          toast.error("Questa classe (anno e sezione) esiste già per questa scuola.");
        } else {
          console.error("Error creating class:", error);
          toast.error("Errore nella creazione della classe. Riprova più tardi.");
        }
        return;
      }
  
      finalClassId = data.id;
      toast.success("Classe creata con successo!");
    } else if (!classId) {
      toast.error("Devi selezionare una classe o crearne una nuova.");
      return;
    }
  
    const { error: userUpdateError } = await supabase
      .from("utenti")
      .update({ scuola_id: schoolId, classe_id: finalClassId })
      .eq("id", user?.id);
  
    if (userUpdateError) {
      console.error("Error updating user profile:", userUpdateError);
      toast.error("Errore nel salvataggio del profilo. Riprova più tardi.");
      return;
    }
  
    toast.success("Profilo aggiornato!");
    // Soluzione per l'errore di TypeScript
    setUser(prev => {
      // Se lo stato precedente è nullo, non possiamo aggiornarlo.
      if (!prev) {
        return null;
      }
      // Ritorna un nuovo oggetto con le proprietà aggiornate.
      // TypeScript è ora certo che 'prev' non è nullo e che quindi
      // tutte le proprietà obbligatorie di 'Utente' sono presenti.
      return {
        ...prev,
        scuola_id: schoolId,
        classe_id: finalClassId,
      };
    });
    setShowSchoolDialog(false);
  };

  // ---------- PUSH NOTIFICATIONS ----------
  useEffect(() => {
    if (!user || Capacitor.getPlatform() === "web") return;

    const registerPush = async () => {
      try {
        const perm = await PushNotifications.requestPermissions();
        if (perm.receive !== "granted") {
          toast.error("Permessi notifiche non concessi");
          return;
        }

        await PushNotifications.register();

        PushNotifications.addListener("registration", async ({ value: apnsToken }) => {
          const { token: fcmToken } = await FirebaseMessaging.getToken();
          await fetch("/api/save-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              apns_token: apnsToken,
              fcm_token: fcmToken,
              user_id: user.id,
              platform: Capacitor.getPlatform(),
            }),
          });
        });

        PushNotifications.addListener("registrationError", (err) =>
          console.error("Errore registrazione push:", JSON.stringify(err))
        );

        PushNotifications.addListener("pushNotificationReceived", (notif) => {
          toast.success(notif.title ?? "Nuova notifica");
        });

        PushNotifications.addListener("pushNotificationActionPerformed", (action) =>
          console.log("Azione notifica:", action)
        );
      } catch (err) {
        console.error("Errore push notifications:", err);
      }
    };

    registerPush();
  }, [user]);

  if (loading)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="h-12 w-64 bg-gray-200 animate-pulse rounded"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full px-4">
          {Array(6)
            .fill(0)
            .map((_, i) => (
              <div key={i} className="h-40 bg-gray-200 rounded animate-pulse" />
            ))}
        </div>
      </div>
    );

  const firstName = user?.nome?.split(" ")[0] || user?.email || "Studente";

  return (
    <div className="px-4 md:px-8">
      <h1 className="text-3xl font-bold text-[#1e293b] mb-6 text-center min-h-[80px]">
        Ciao {firstName}! <br /> Benvenuto nella tua area personale!
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <FeatureCard
          title="Promozioni"
          description="Scopri le promozioni e gli sconti disponibili per te."
          href="/promozioni"
          emoji="🎁"
        />
        <FeatureCard
          title="Eventi"
          description="Prenota e partecipa agli eventi della scuola e della community."
          href="/eventi"
          emoji="🎟️"
        />
        <FeatureCard
          title="Merchandising"
          description="Acquista il merchandising ufficiale della scuola e della community."
          href="/merchandising"
          emoji="👕"
        />
        <FeatureCard
          title="Ripetizioni"
          description="Trova tutor o offri il tuo aiuto agli altri studenti."
          href="/ripetizioni"
          emoji="📚"
        />
        <FeatureCard
          title="Marketplace"
          description="Compra e vendi libri, appunti e materiale scolastico."
          href={isSubscribed ? "/marketplace" : "#"}
          emoji="🛒"
          badgeText="Solo abbonamento"
          onClickDisabled={() => {
            if (!isSubscribed) toast.error("Devi avere un abbonamento per accedere al Marketplace");
          }}
        />
        <FeatureCard
          title="Altro in arrivo"
          description="Nuove funzionalità saranno disponibili presto!"
          href="#"
          emoji="🚀"
          disabled
        />
      </div>

      {/* Dialog scuola/classe */}
 <Dialog.Root open={showSchoolDialog} onOpenChange={setShowSchoolDialog}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-2xl shadow-xl w-[90%] max-w-md">
          <div className="flex flex-col items-center text-center">
            <h2 className="text-2xl font-bold mb-2 text-gray-800">Completa il tuo profilo</h2>
            <p className="text-sm text-gray-600 mb-6">
              Per continuare, inserisci la tua provincia, scuola e classe.
            </p>
          </div>

          <div className="space-y-4">
            {/* Province Select */}
            <div>
              <label htmlFor="province-select" className="text-sm font-medium text-gray-700 block mb-1">
                Provincia
              </label>
              <select
                id="province-select"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                value={provinceName}
                onChange={(e) => {
                  setProvinceName(e.target.value);
                  setSchoolId('');
                  setClassId('');
                  setNewAnno('');
                  setNewSezione('');
                }}
              >
                <option value="">Seleziona provincia</option>
                {provinces.map((p) => (
                  <option key={p.codice} value={p.nome}>
                    {p.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* School Select */}
            <div>
              <label htmlFor="school-select" className="text-sm font-medium text-gray-700 block mb-1">
                Scuola
              </label>
              <select
                id="school-select"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-700 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={schoolId}
                onChange={(e) => {
                  setSchoolId(e.target.value);
                  setClassId('');
                  setNewAnno('');
                  setNewSezione('');
                }}
                disabled={!provinceName}
              >
                <option value="">Seleziona scuola</option>
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* Class Select */}
            <div>
              <label htmlFor="class-select" className="text-sm font-medium text-gray-700 block mb-1">
                Classe
              </label>
              <select
                id="class-select"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-700 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={classId}
                onChange={(e) => {
                  setClassId(e.target.value);
                  setNewAnno('');
                  setNewSezione('');
                }}
                disabled={!schoolId}
              >
                <option value="">Seleziona classe</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.anno} {c.sezione}
                  </option>
                ))}
                <option value="create-new">Crea nuova classe</option>
              </select>
            </div>

            {classId === 'create-new' && (
              <div className="flex gap-4">
                <div className="flex-1">
                  <label htmlFor="new-anno" className="text-sm font-medium text-gray-700 block mb-1">
                    Anno
                  </label>
                  <Input
                    id="new-anno"
                    placeholder="Es. 1, 2, 3"
                    type="number"
                    value={newAnno}
                    onChange={(e) => setNewAnno(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="flex-1">
                  <label htmlFor="new-sezione" className="text-sm font-medium text-gray-700 block mb-1">
                    Sezione
                  </label>
                  <Input
                    id="new-sezione"
                    placeholder="Es. A, B"
                    value={newSezione}
                    onChange={(e) => setNewSezione(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 flex justify-center">
            <Button 
              onClick={saveSchoolClass} 
              className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Salva e continua
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
    </div>
  );
}

// ---------- FEATURE CARD ----------
type FeatureCardProps = {
  title: string;
  description: string;
  href: string;
  emoji: string;
  badgeText?: string;
  disabled?: boolean;
  onClickDisabled?: () => void;
};

function FeatureCard({
  title,
  description,
  href,
  emoji,
  badgeText,
  disabled,
  onClickDisabled,
}: FeatureCardProps) {
  return (
    <div
      className={`relative rounded-xl shadow-lg bg-white p-6 flex flex-col items-start gap-3 border border-[#e0e7ef] ${
        disabled ? "opacity-60 pointer-events-none" : "hover:shadow-2xl transition"
      }`}
    >
      <div className="absolute top-3 right-3 flex items-center justify-center h-[24px]">
        {badgeText && (
          <span className="bg-yellow-400 text-white text-xs font-bold px-3 py-1 rounded-full shadow whitespace-nowrap">
            {badgeText}
          </span>
        )}
      </div>

      <div className="text-4xl">{emoji}</div>
      <h2 className="text-xl font-semibold text-[#1e293b]">{title}</h2>
      <p className="text-[#334155]">{description}</p>

      {!disabled && (
        <Link
          href={href}
          onClick={(e) => {
            if (href === "#" && onClickDisabled) {
              e.preventDefault();
              onClickDisabled();
            }
          }}
          className="mt-2 inline-block bg-[#38bdf8] text-white px-4 py-2 rounded hover:bg-[#0ea5e9] transition"
        >
          Vai
        </Link>
      )}
    </div>
  );
}