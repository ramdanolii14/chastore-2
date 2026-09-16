import { createClient } from "@supabase/supabase-js";

// PENTING: file ini hanya boleh diimport dari server (route handler,
// server component, server action) — service role key bisa bypass RLS,
// jangan pernah dikirim ke client/browser.
if (!process.env.SUPABASE_URL) {
  throw new Error("Env SUPABASE_URL belum di-set");
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Env SUPABASE_SERVICE_ROLE_KEY belum di-set");
}

export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { autoRefreshToken: false, persistSession: false },
  }
);
