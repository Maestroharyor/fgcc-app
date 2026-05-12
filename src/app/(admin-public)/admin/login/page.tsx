import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "@/components/forms/LoginForm";
import { BrandMark } from "@/components/ui/BrandMark";

export const metadata: Metadata = {
  title: "Admin sign in · SkillUp 1.0",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <main className="min-h-dvh hero-mesh flex flex-col">
      <div className="px-6 sm:px-10 pt-8">
        <Link href="/" className="inline-flex items-center gap-3">
          <BrandMark size={40} />
          <div className="leading-tight">
            <div className="font-display text-sm font-semibold text-navy">
              SkillUp 1.0
            </div>
            <div className="font-sans text-[10px] uppercase tracking-[0.18em] text-navy/55">
              Admin
            </div>
          </div>
        </Link>
      </div>
      <div className="flex flex-1 items-center justify-center px-6">
        <div className="w-full max-w-md rounded-3xl border border-navy/8 bg-white p-8 shadow-card">
          <h1 className="font-display text-2xl font-semibold text-navy">
            Sign in
          </h1>
          <p className="mt-1 text-sm text-navy/65">
            Admin and superadmin accounts only.
          </p>
          <div className="mt-6">
            <Suspense
              fallback={
                <div className="h-40 animate-pulse rounded-xl bg-navy/5" />
              }
            >
              <LoginForm />
            </Suspense>
          </div>
        </div>
      </div>
    </main>
  );
}
