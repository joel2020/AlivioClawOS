"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const nextPath = params.get("next") || "/dashboard";
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(() => {
      void (async () => {
        const res = await fetch("/api/v1/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email || undefined, password }),
        });
        if (!res.ok) {
          const payload = await res.json().catch(() => null);
          setError(payload?.error || "Failed to authenticate");
          return;
        }
        router.replace(nextPath);
        router.refresh();
      })();
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl shadow-black/20 space-y-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-100">Clawbot access</h1>
          <p className="mt-1 text-sm text-slate-400">Sign in with your operator account.</p>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-slate-500">Email</label>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500"
            autoFocus
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-slate-500">Password</label>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500"
          />
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400 disabled:opacity-60"
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
