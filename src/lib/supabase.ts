import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://wwgvezljjaceoiybhklh.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3Z3ZlemxqamFjZW9peWJoa2xoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwNjg4NDAsImV4cCI6MjA5ODY0NDg0MH0.-sAurKU52rkdQMsxAZjbiYwik6SESsOzVv0ogFf9cd4";

let clientInstance: SupabaseClient | null = null;

export const getSupabase = (): SupabaseClient => {
  if (!clientInstance) {
    clientInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true }
    });
  }
  return clientInstance;
};

// Backwards-compatible proxy export to avoid breaking existing code while deferring startup cost
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabase();
    const value = (client as any)[prop];
    return typeof value === "function" ? value.bind(client) : value;
  }
});

