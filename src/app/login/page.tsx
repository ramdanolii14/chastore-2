"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "@/lib/auth-client";

function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") || "/";

  return (
    <div className="max-w-sm mx-auto text-center py-16">
      <h1 className="text-2xl font-bold mb-2">Masuk</h1>
      <p className="text-muted mb-8">Masuk pakai akun Google buat lanjut belanja.</p>
      <button
        onClick={() => signIn.social({ provider: "google", callbackURL: next })}
        className="btn-primary w-full"
      >
        Lanjutkan dengan Google
      </button>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
