"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDebouncedCallback } from "@/lib/hooks/use-debounced-callback";

/**
 * URL-as-state filter helpers for admin tables. There is no local filter
 * state: `apply` merges updates into the current search params (empty value =
 * delete), resets pagination, and soft-navigates with router.replace so
 * keystrokes don't flood history. `debouncedSearch` wraps apply({ q }) with a
 * 400 ms debounce for text inputs; selects should call `apply` directly.
 */
export function useUrlFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const apply = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    params.delete("page");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const debouncedSearch = useDebouncedCallback(
    (value: string) => apply({ q: value }),
    400,
  );

  return { searchParams, apply, debouncedSearch };
}
