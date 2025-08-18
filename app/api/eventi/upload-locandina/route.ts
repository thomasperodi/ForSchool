// app/api/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseClientAdmin";

export const POST = async (req: NextRequest) => {
    try {
      const formData = await req.formData();
      const file = formData.get("file") as File;
  
      if (!file) {
        return NextResponse.json({ error: "Nessun file inviato" }, { status: 400 });
      }
  
      const fileName = `eventi/${Date.now()}_${file.name}`;
      const arrayBuffer = await file.arrayBuffer();
  
      const { error: uploadError } = await supabaseAdmin.storage
        .from("skoolly")
        .upload(fileName, new Uint8Array(arrayBuffer), { cacheControl: "3600", upsert: false });
  
      if (uploadError) throw uploadError;

      // getPublicUrl restituisce un oggetto con la proprietà data.publicUrl
      const { data } = supabaseAdmin.storage.from("skoolly").getPublicUrl(fileName);
      const publicUrl = data.publicUrl;

      return NextResponse.json({ url: publicUrl });
    } catch (err) {
      console.error("Errore upload:", err);
      return NextResponse.json({ error: "Errore upload file" }, { status: 500 });
    }
  };