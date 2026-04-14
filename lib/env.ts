const requiredEnv = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"] as const;

function clean(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return trimmed;

  if (trimmed.startsWith("EVOLUTION_INSTANCE=")) {
    return trimmed.replace(/^EVOLUTION_INSTANCE=/, "");
  }

  return trimmed;
}

export function getEnv() {
  for (const key of requiredEnv) {
    if (!clean(process.env[key])) throw new Error(`Variavel de ambiente ausente: ${key}`);
  }

  return {
    supabaseUrl: clean(process.env.NEXT_PUBLIC_SUPABASE_URL)!,
    supabaseAnonKey: clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
    supabaseServiceRoleKey: clean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    webhookSecret: clean(process.env.EVOLUTION_WEBHOOK_SECRET),
    cronSecret: clean(process.env.CRON_SECRET),
    evolutionApiUrl: clean(process.env.EVOLUTION_API_URL),
    evolutionApiKey: clean(process.env.EVOLUTION_API_KEY),
    evolutionInstance: clean(process.env.EVOLUTION_INSTANCE)
  };
}
