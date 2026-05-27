"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import {
  getAuthSessionSnapshot,
  subscribeAuthSession,
} from "@/lib/authSession";

export function AuthRoleGuard() {
  const pathname = usePathname();
  const router = useRouter();
  const session = useSyncExternalStore(
    subscribeAuthSession,
    getAuthSessionSnapshot,
    () => null,
  );
  const isAdmin = session?.role?.toUpperCase() === "ADMIN";

  useEffect(() => {
    if (!session) {
      if (pathname.startsWith("/admin")) {
        router.replace("/login");
      }
      return;
    }

    if (isAdmin && !pathname.startsWith("/admin")) {
      router.replace("/admin");
      return;
    }

    if (!isAdmin && pathname.startsWith("/admin")) {
      router.replace("/");
    }
  }, [isAdmin, pathname, router, session]);

  return null;
}
