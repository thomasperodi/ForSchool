"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail } from "lucide-react";

export default function DeleteAccountPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="max-w-2xl w-full shadow-lg rounded-2xl">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-center">
            Eliminazione Account - Skoolly
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p>
            Se desideri eliminare il tuo account e i dati associati
            all’app <strong>Skoolly</strong>, puoi inviare una mail al nostro
            indirizzo dedicato:
          </p>

          <div className="flex items-center justify-center space-x-2 p-4 bg-gray-100 rounded-lg">
            <Mail className="w-6 h-6 text-blue-600" />
            <a
              href="mailto:Skoollyapp@gmail.com?subject=Eliminazione%20Account"
              className="text-blue-600 font-medium hover:underline"
            >
              skoollyapp@gmail.com
            </a>
          </div>

          <p>
            Per velocizzare la procedura, ti chiediamo di utilizzare la stessa
            email con cui ti sei registrato e di inserire come oggetto{" "}
            <strong>“Eliminazione Account”</strong>.
          </p>

          <h2 className="text-lg font-semibold">Cosa eliminiamo</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>Dati del profilo utente (nome, email, preferenze).</li>
            <li>Contenuti personali eventualmente salvati nell’app.</li>
          </ul>

          <h2 className="text-lg font-semibold">Tempistiche</h2>
          <p>
            L’eliminazione avverrà entro <strong>30 giorni</strong> dalla
            ricezione della richiesta. Alcuni dati relativi a fatturazione o
            obblighi legali potrebbero essere conservati fino a 12 mesi, come
            previsto dalla normativa vigente.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
