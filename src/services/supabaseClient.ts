import { createClient } from "@supabase/supabase-js";

/** Default local Supabase CLI (`supabase start`) — same as Studio / API */
const LOCAL_SUPABASE_URL = "http://127.0.0.1:54321";
const LOCAL_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

function isBrowserLocalHost(): boolean {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return h === "localhost" || h === "127.0.0.1" || h === "[::1]";
}

const envUrl = import.meta.env.VITE_SUPABASE_URL;
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** Only when both are unset: safe to fall back to bundled local Supabase (dev / localhost). */
const useLocalSupabaseFallback =
  !envUrl &&
  !envKey &&
  (import.meta.env.DEV || isBrowserLocalHost() || import.meta.env.VITE_USE_LOCAL_SUPABASE === "true");

const supabaseUrl = envUrl || (useLocalSupabaseFallback ? LOCAL_SUPABASE_URL : "");
const supabaseAnonKey = envKey || (useLocalSupabaseFallback ? LOCAL_SUPABASE_ANON_KEY : "");

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase config. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (production), or run against local Supabase on localhost without env."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
