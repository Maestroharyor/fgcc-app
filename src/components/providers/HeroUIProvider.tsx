"use client";

import { ToastProvider } from "@heroui/react";
import { HeroUIProvider as RootHeroUIProvider } from "@heroui/system";
import { useRouter } from "next/navigation";

declare module "@react-types/shared" {
  interface RouterConfig {
    routerOptions: NonNullable<
      Parameters<ReturnType<typeof useRouter>["push"]>[1]
    >;
  }
}

export function HeroUIProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  return (
    <RootHeroUIProvider navigate={router.push} locale="en-NG">
      <ToastProvider placement="top end" />
      {children}
    </RootHeroUIProvider>
  );
}
