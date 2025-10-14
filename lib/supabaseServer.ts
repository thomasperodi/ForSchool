// lib/supabaseServer.ts
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export async function createSupabaseServerClient() {
  // ✅ usa await perché cookies() ora restituisce una Promise
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set(name, value, options);
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set(name, "", { ...options, maxAge: 0 });
        },
      },
    }
  );
}



/**
 * Restituisce l'ID utente autenticato o 401.
 */
// export async function requireUserId(req?: NextRequest) {
//   const sb = await supabaseServer()

//   // 1) Prova header Authorization (se presente)
//   const authHeader = req?.headers.get('authorization') || req?.headers.get('Authorization')
//   if (authHeader?.toLowerCase().startsWith('bearer ')) {
//     const token = authHeader.slice(7).trim()
//     const { data, error } = await sb.auth.getUser(token)
//     if (!error && data?.user) return data.user.id
//     // se il token è invalido, continua col fallback cookie
//   }

//   // 2) Fallback: cookies SSR
//   const { data: { user }, error } = await sb.auth.getUser()
//   if (error || !user) throw new Response('Unauthorized', { status: 401 })
//   return user.id
// }