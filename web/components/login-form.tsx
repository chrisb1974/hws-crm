"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { t } from "@/lib/i18n";

type Status = "idle" | "sending" | "sent" | "error";

export default function LoginForm({ suite }: { suite: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setMessage("");

    const supabase = createClient();
    const callback = new URL("/auth/callback", window.location.origin);
    if (suite) callback.searchParams.set("suite", suite);

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: callback.toString() },
    });

    if (error) {
      setStatus("error");
      setMessage(error.message || t.login.genericError);
      return;
    }
    setStatus("sent");
  }

  if (status === "sent") {
    return (
      <div className="space-y-4">
        <p
          role="status"
          className="rounded-md border border-ok/30 bg-ok-fond px-4 py-3 text-[13px] text-ok"
        >
          {t.login.sent}
        </p>
        <p className="font-mono text-[13px] text-encre-75">{email}</p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="text-[13px] font-medium text-navy-500 underline underline-offset-2 hover:text-navy-700"
        >
          {t.login.sentAgain}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <label
          htmlFor="email"
          className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-encre-60"
        >
          {t.login.emailLabel}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          autoFocus
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={t.login.emailPlaceholder}
          className="w-full rounded-md border border-bordure-forte bg-surface px-3 py-2.5 text-[14px] text-encre-100 placeholder:text-encre-30 focus:border-navy-500 focus:outline-none"
        />
      </div>

      {status === "error" && message ? (
        <p
          role="alert"
          className="rounded-md border border-danger/30 bg-danger-fond px-3 py-2 text-[13px] text-danger"
        >
          {message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={status === "sending" || email.trim().length === 0}
        className="w-full rounded-md bg-navy-500 px-4 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-navy-600 disabled:cursor-not-allowed disabled:bg-navy-300"
      >
        {status === "sending" ? t.login.submitting : t.login.submit}
      </button>
    </form>
  );
}
