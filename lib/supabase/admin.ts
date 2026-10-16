import { createClient } from "@supabase/supabase-js";
import { getSupabaseServiceRoleKey, getSupabaseUrl } from "@/lib/supabase/config";

// Cliente com chave de administrador. Use SOMENTE no servidor (Server Actions).
export function createAdminClient() {
  const url = getSupabaseUrl();
  const key = getSupabaseServiceRoleKey();

  if (!url || !key) {
    throw new Error("Supabase admin configuration is missing. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }

  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
