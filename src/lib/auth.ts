import { betterAuth } from "better-auth";
import { Pool } from "pg";

// better-auth menyimpan tabel user/session/account-nya sendiri di
// Postgres yang sama dengan database Supabase kita (pakai connection
// string langsung ke Postgres, BUKAN Supabase REST URL).
// Lihat .env.example -> DATABASE_URL.
export const auth = betterAuth({
  database: new Pool({
    connectionString: process.env.DATABASE_URL,
  }),
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 hari
  },
});

export type Session = typeof auth.$Infer.Session;

// Admin ditentukan lewat allowlist email di env, bukan tabel role
// terpisah — cukup simpel untuk toko dengan 1-beberapa admin.
export function isAdminEmail(email: string | null | undefined) {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}
