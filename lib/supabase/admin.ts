import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import { getEnv } from "@/lib/env";

let cachedClient: SupabaseClient<Database> | null = null;

export function createSupabaseAdminClient(): SupabaseClient<Database> {
  if (cachedClient) return cachedClient;

  const env = getEnv();
  if (!env.supabaseServiceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY nao configurada");

  cachedClient = createClient<Database>(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  return cachedClient;
}
