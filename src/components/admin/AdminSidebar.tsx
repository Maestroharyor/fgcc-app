"use client";

import {
  Award,
  BarChart3,
  LayoutDashboard,
  LogOut,
  ScanLine,
  Send,
  Star,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BrandMark } from "@/components/ui/BrandMark";
import type { Role } from "@/lib/db/types";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils/cn";

interface Props {
  role: Role;
  email: string | null;
}

const baseNav: Array<{ href: string; label: string; Icon: typeof BarChart3 }> =
  [
    { href: "/admin/dashboard", label: "Dashboard", Icon: LayoutDashboard },
    { href: "/admin/registrations", label: "Registrations", Icon: Users },
    { href: "/admin/tracks", label: "Tracks", Icon: BarChart3 },
    { href: "/admin/checkin", label: "Check-in", Icon: ScanLine },
    { href: "/admin/feedback", label: "Feedback", Icon: Star },
  ];

const superNav: Array<{ href: string; label: string; Icon: typeof BarChart3 }> =
  [
    { href: "/admin/sms", label: "SMS broadcast", Icon: Send },
    { href: "/admin/certificates", label: "Certificates", Icon: Award },
  ];

export function AdminSidebar({ role, email }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  const onSignOut = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  };

  return (
    <aside className="w-full md:w-64 md:flex-shrink-0 border-r border-navy/8 bg-white md:h-dvh md:sticky md:top-0">
      <div className="flex flex-col md:h-full">
        <div className="px-5 py-5 border-b border-navy/8">
          <Link href="/admin/dashboard" className="flex items-center gap-3">
            <BrandMark size={36} />
            <div className="leading-tight">
              <div className="font-display text-sm font-semibold text-navy">
                SkillUp Admin
              </div>
              <div className="font-sans text-[10px] uppercase tracking-[0.18em] text-primary">
                {role}
              </div>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-4 flex flex-row md:flex-col gap-1 overflow-x-auto">
          {baseNav.map((item) => (
            <NavLink
              key={item.href}
              {...item}
              active={pathname.startsWith(item.href)}
            />
          ))}
          {role === "superadmin" && (
            <>
              <div className="hidden md:block mt-3 mb-1 px-3 font-sans text-[9px] uppercase tracking-[0.2em] text-navy/45">
                Superadmin
              </div>
              {superNav.map((item) => (
                <NavLink
                  key={item.href}
                  {...item}
                  active={pathname.startsWith(item.href)}
                />
              ))}
            </>
          )}
        </nav>

        <div className="px-5 py-4 border-t border-navy/8 flex flex-col gap-2">
          <div className="text-xs text-navy/55 truncate">{email}</div>
          <button
            type="button"
            onClick={onSignOut}
            className="inline-flex items-center justify-center gap-1.5 rounded-full border border-navy/15 bg-white px-3 py-1.5 text-xs font-display font-medium text-navy hover:bg-cream-100"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden /> Sign out
          </button>
        </div>
      </div>
    </aside>
  );
}

function NavLink({
  href,
  label,
  Icon,
  active,
}: {
  href: string;
  label: string;
  Icon: typeof BarChart3;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2.5 rounded-lg px-3 py-2 font-display text-sm font-medium transition whitespace-nowrap",
        active
          ? "bg-primary/8 text-primary"
          : "text-navy/70 hover:bg-cream-100 hover:text-navy",
      )}
    >
      <Icon className="h-4 w-4" aria-hidden />
      {label}
    </Link>
  );
}
