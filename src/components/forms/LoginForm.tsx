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
        <input
          type="password"
          autoComplete="current-password"
          className="form-input"
          {...register("password")}
        />
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
