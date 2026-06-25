import { createClient } from "@supabase/supabase-js";

// =====================================================================
// ⚠️ INSERTA AQUÍ TUS CREDENCIALES REALES DE SUPABASE SI NO USAS .env ⚠️
// =====================================================================
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://vatdtkuyimpscvxbvyxb.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_2rf1c_gXiFjOD_Oj3FSo3g_IMSJ9Tng";

// Validar que la URL sea válida para evitar que la inicialización de Supabase rompa el build
const isUrlValida = (url: string) => url.startsWith("http://") || url.startsWith("https://");

const urlFinal = isUrlValida(supabaseUrl) ? supabaseUrl : "https://placeholder-project.supabase.co";
const anonKeyFinal = isUrlValida(supabaseUrl) ? supabaseAnonKey : "placeholder-anon-key";

if (supabaseUrl === "PEGA_AQUI_TU_SUPABASE_URL" || supabaseAnonKey === "PEGA_AQUI_TU_ANON_KEY") {
  console.warn(
    "Supabase Client: Usando credenciales de prueba por defecto. " +
    "Por favor pega tu URL y ANON_KEY reales en src/lib/supabaseClient.ts o en tu archivo .env.local"
  );
}

export const supabase = createClient(urlFinal, anonKeyFinal);
