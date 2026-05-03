import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Public (anon) client — used in server components for read-only queries.
 * Respects Row Level Security policies, so it can only see what we've
 * explicitly allowed via RLS in the schema.
 */
export function createPublicClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY env vars"
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

/**
 * Service-role client — bypasses RLS. ONLY for server-side writes
 * (cron handlers, scraper persistence). Never expose to the browser.
 */
export function createServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars"
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false },
  });
}
