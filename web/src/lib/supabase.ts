import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. " +
      "Copy .env.example to .env.local and fill in your Supabase project URL and anon key."
  );
}

/**
 * Supabase client for the frontend.
 *
 * Uses the anon (public) key — all data access is governed by
 * Row Level Security (RLS) policies on the database.
 * This client is safe to use in browser code.
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Persist the session in localStorage so the user stays logged in
    // across page refreshes and browser restarts.
    persistSession: true,
    autoRefreshToken: true,
  },
});
