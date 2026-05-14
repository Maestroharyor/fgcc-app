"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { type LoginInput, LoginSchema } from "@/lib/validation/schemas";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/admin/dashboard";
  const errorParam = params.get("error");
  const [pending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(
    errorParam === "forbidden"
      ? "Your account doesn't have admin access. Contact the SkillUp team."
      : errorParam === "supabase-not-configured"
        ? "Supabase isn't configured yet. Ask your administrator to set the env vars."
        : null,
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(LoginSchema) });

  const onSubmit = handleSubmit((values) => {
    setServerError(null);
    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });
      if (error) {
        setServerError(error.message);
        return;
      }
      router.push(next);
      router.refresh();
    });
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="font-sans text-[10px] uppercase tracking-[0.18em] text-navy/60">
          Email
        </span>
        <input
          type="email"
          autoComplete="email"
          className="form-input"
          {...register("email")}
        />
        {errors.email && (
          <span className="text-xs text-coral">{errors.email.message}</span>
        )}
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="font-sans text-[10px] uppercase tracking-[0.18em] text-navy/60">
          Password
        </span>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            className="form-input pr-11"
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex h-8 w-8 items-center justify-center rounded-lg text-navy/55 transition hover:bg-navy/5 hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            {showPassword ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M9.88 5.09A10.94 10.94 0 0 1 12 5c5.52 0 9.27 4.13 10.5 7-.39.92-1.04 2.1-1.96 3.27" />
                <path d="M6.61 6.61A11.93 11.93 0 0 0 1.5 12c1.23 2.87 4.98 7 10.5 7 1.94 0 3.7-.51 5.21-1.32" />
                <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
                <line x1="3" y1="3" x2="21" y2="21" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M1.5 12C2.73 9.13 6.48 5 12 5s9.27 4.13 10.5 7c-1.23 2.87-4.98 7-10.5 7S2.73 14.87 1.5 12Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>
        {errors.password && (
          <span className="text-xs text-coral">{errors.password.message}</span>
        )}
      </label>
      {serverError && <p className="text-sm text-coral">{serverError}</p>}
      <button
        type="submit"
        disabled={pending}
        className="mt-2 inline-flex h-12 items-center justify-center rounded-full bg-primary px-7 font-display font-semibold text-white shadow-card hover:bg-primary-700 disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
