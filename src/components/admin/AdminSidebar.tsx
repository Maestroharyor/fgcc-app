"use client";

import {
  Award,
  BarChart3,
  LayoutDashboard,
  LogOut,
  Menu,
  ScanLine,
  Send,
  Star,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BrandMark } from "@/components/ui/BrandMark";
import type { Role } from "@/lib/db/types";
import { useOverlayDismiss } from "@/lib/hooks/use-overlay-dismiss";
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
  const [open, setOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement | null>(null);

  // Close the mobile drawer whenever the route changes. pathname is the trigger,
  // not read inside — that's the intent, so the dep is deliberate.
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-run on navigation to close the drawer
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Escape-to-close + body scroll-lock while the drawer is open.
  useOverlayDismiss(open, () => setOpen(false));

  // Move focus into the drawer when it opens so keyboard users land inside.
  // preventScroll avoids a scroll-into-view jump while the panel is mid-slide.
  useEffect(() => {
    if (open) drawerRef.current?.focus({ preventScroll: true });
  }, [open]);

  const onSignOut = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  };

  return (
    <>
      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between border-b border-navy/8 bg-white px-4 py-3">
        <Link href="/admin/dashboard" className="flex items-center gap-2.5">
          <BrandMark size={30} />
          <span className="font-display text-sm font-semibold text-navy">
            SkillUp Admin
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          aria-expanded={open}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-navy/70 hover:bg-cream-100"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>
      </header>

      {/* Mobile drawer — always mounted so it can slide in/out; slides from the
          right to match the top-right trigger. */}
      <div
        className={cn(
          "md:hidden fixed inset-0 z-50 overflow-hidden",
          open ? "" : "pointer-events-none",
        )}
        aria-hidden={!open}
      >
        <button
          type="button"
          tabIndex={open ? 0 : -1}
          aria-label="Close menu"
          className={cn(
            "absolute inset-0 bg-navy/50 transition-opacity duration-300",
            open ? "opacity-100" : "opacity-0",
          )}
          onClick={() => setOpen(false)}
        />
        <div
          ref={drawerRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-label="Admin menu"
          className={cn(
            "absolute right-0 top-0 flex h-full w-72 max-w-[85%] flex-col bg-white shadow-xl outline-none transition-transform duration-300 ease-out will-change-transform",
            open ? "translate-x-0" : "translate-x-full",
          )}
        >
          <div className="flex items-center justify-between border-b border-navy/8 px-5 py-5">
            <Link
              href="/admin/dashboard"
              className="flex items-center gap-3"
              onClick={() => setOpen(false)}
            >
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
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-navy/70 hover:bg-cream-100"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>
          <SidebarBody
            role={role}
            email={email}
            pathname={pathname}
            onNavigate={() => setOpen(false)}
            onSignOut={onSignOut}
          />
        </div>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-shrink-0 md:flex-col border-r border-navy/8 bg-white md:h-dvh md:sticky md:top-0">
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
        <SidebarBody
          role={role}
          email={email}
          pathname={pathname}
          onSignOut={onSignOut}
        />
      </aside>
    </>
  );
}

/** Nav links + footer (email + sign out). Shared by the desktop aside and the
 * mobile drawer; both lay out vertically. */
function SidebarBody({
  role,
  email,
  pathname,
  onNavigate,
  onSignOut,
}: {
  role: Role;
  email: string | null;
  pathname: string;
  onNavigate?: () => void;
  onSignOut: () => void;
}) {
  return (
    <>
      <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-1">
        {baseNav.map((item) => (
          <NavLink
            key={item.href}
            {...item}
            active={pathname.startsWith(item.href)}
            onClick={onNavigate}
          />
        ))}
        {role === "superadmin" && (
          <>
            <div className="mt-3 mb-1 px-3 font-sans text-[9px] uppercase tracking-[0.2em] text-navy/45">
              Superadmin
            </div>
            {superNav.map((item) => (
              <NavLink
                key={item.href}
                {...item}
                active={pathname.startsWith(item.href)}
                onClick={onNavigate}
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
    </>
  );
}

function NavLink({
  href,
  label,
  Icon,
  active,
  onClick,
}: {
  href: string;
  label: string;
  Icon: typeof BarChart3;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
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
