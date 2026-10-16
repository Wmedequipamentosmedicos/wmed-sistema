import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseAnonKey, getSupabaseUrl, hasSupabaseAnonConfig } from "@/lib/supabase/config";

function createMissingClient() {
  const queryBuilder = {
    select: async () => ({ data: [], error: null, count: 0 }),
    insert: async () => ({ data: [], error: null }),
    update: async () => ({ data: [], error: null }),
    delete: async () => ({ data: [], error: null }),
    eq: () => queryBuilder,
    order: () => queryBuilder,
    limit: () => queryBuilder,
    range: () => queryBuilder,
    single: async () => ({ data: null, error: null }),
    maybeSingle: async () => ({ data: null, error: null }),
  };

  return {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      signInWithPassword: async () => ({ data: { user: null, session: null }, error: null }),
      signOut: async () => ({ error: null }),
    },
    from: () => queryBuilder,
  } as any;
}

// Cliente Supabase para Server Components e Server Actions (usa a sessão do usuário logado).
export async function createClient() {
  if (!hasSupabaseAnonConfig()) {
    return createMissingClient();
  }

  const cookieStore = await cookies();
  return createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(list: any[]) {
          try {
            list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Chamado de um Server Component: o middleware já renova a sessão.
          }
        },
      },
    }
  );
}
