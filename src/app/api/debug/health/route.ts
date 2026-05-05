import { NextResponse } from "next/server";

/**
 * Reports which env vars are present (without revealing values) and
 * attempts a minimal Supabase connection. Protected by CRON_SECRET so
 * it can't be probed by anyone who hasn't seen our secret.
 */
export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  const url = new URL(req.url);
  const provided =
    req.headers.get("authorization") === `Bearer ${expected}` ||
    url.searchParams.get("secret") === expected;
  if (!expected || !provided) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  function describe(name: string): { present: boolean; length: number; preview: string } {
    const v = process.env[name] ?? "";
    return {
      present: v.length > 0,
      length: v.length,
      preview: v.length === 0 ? "" : `${v.slice(0, 6)}…${v.slice(-4)}`,
    };
  }

  const env = {
    NEXT_PUBLIC_SUPABASE_URL: describe("NEXT_PUBLIC_SUPABASE_URL"),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: describe("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    SUPABASE_SERVICE_ROLE_KEY: describe("SUPABASE_SERVICE_ROLE_KEY"),
    CRON_SECRET: describe("CRON_SECRET"),
  };

  // Try to actually connect with the service-role client.
  let supabase: { ok: boolean; error?: string } = { ok: false };
  try {
    const { createClient } = await import("@supabase/supabase-js");
    const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supaKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supaUrl || !supaKey) {
      throw new Error("env vars missing for service client");
    }
    const c = createClient(supaUrl, supaKey, { auth: { persistSession: false } });
    const { error } = await c.from("games").select("id", { head: true, count: "exact" });
    if (error) throw error;
    supabase = { ok: true };
  } catch (err) {
    supabase = { ok: false, error: err instanceof Error ? err.message : String(err) };
  }

  return NextResponse.json({
    runtime: process.env.VERCEL ? "vercel" : "local",
    region: process.env.VERCEL_REGION ?? null,
    env,
    supabase,
  });
}
