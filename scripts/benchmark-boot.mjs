import { performance } from "node:perf_hooks";

async function runBootBenchmark() {
  const bootStart = performance.now();
  const timeline = [];

  const mark = (label) => {
    const elapsed = performance.now() - bootStart;
    timeline.push({ label, elapsedMs: parseFloat(elapsed.toFixed(2)) });
    console.log(`[${elapsed.toFixed(2).padStart(7, " ")} ms] ${label}`);
  };

  mark("Process initialized");

  // Check Supabase SDK import timing
  const t0 = performance.now();
  const { createClient } = await import("@supabase/supabase-js");
  const t1 = performance.now();
  mark(`Loaded @supabase/supabase-js library (${(t1 - t0).toFixed(2)} ms)`);

  // Check Lazy DB Instantiation vs Query Handshake
  const tLazy0 = performance.now();
  const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://wwgvezljjaceoiybhklh.supabase.co";
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3Z3ZlemxqamFjZW9peWJoa2xoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwNjg4NDAsImV4cCI6MjA5ODY0NDg0MH0.-sAurKU52rkdQMsxAZjbiYwik6SESsOzVv0ogFf9cd4";

  // Lazy client instantiation (synchronous overhead only)
  let clientInstance = null;
  const getSupabaseLazy = () => {
    if (!clientInstance) {
      clientInstance = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false }
      });
    }
    return clientInstance;
  };
  const tLazy1 = performance.now();
  mark(`Lazy Database Client Setup overhead (${(tLazy1 - tLazy0).toFixed(2)} ms)`);

  // Eager Handshake evaluation
  const tHandshake0 = performance.now();
  const client = getSupabaseLazy();
  try {
    await client.from("users").select("count", { count: "exact", head: true });
    const tHandshake1 = performance.now();
    mark(`Network Database Handshake latency (${(tHandshake1 - tHandshake0).toFixed(2)} ms)`);
  } catch (err) {
    const tHandshake1 = performance.now();
    mark(`Network Database Handshake attempted (${(tHandshake1 - tHandshake0).toFixed(2)} ms) - Offline/Fallback`);
  }

  const totalBootTime = performance.now() - bootStart;
  console.log("----------------------------------------");
  console.log(`TOTAL BENCHMARK TIMELINE DURATION: ${totalBootTime.toFixed(2)} ms`);
  console.log("----------------------------------------");
}

runBootBenchmark();
