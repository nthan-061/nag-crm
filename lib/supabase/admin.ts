import { createClient } from "@supabase/supabase-js";
import { getEnv } from "@/lib/env";

let cachedClient: ReturnType<typeof createClient> | null = null;

export function createSupabaseAdminClient() {
  if (cachedClient) return cachedClient;

  const env = getEnv();
  if (!env.supabaseServiceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY nao configurada");

  cachedClient = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  return cachedClient;
}
