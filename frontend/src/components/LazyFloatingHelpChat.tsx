"use client";

import { useEffect, useState, type ComponentType } from "react";

export function LazyFloatingHelpChat() {
  const [ChatComponent, setChatComponent] = useState<ComponentType | null>(null);

  useEffect(() => {
    let isCancelled = false;

    const timer = window.setTimeout(() => {
      import("@/components/FloatingHelpChat").then((module) => {
        if (!isCancelled) {
          setChatComponent(() => module.FloatingHelpChat);
        }
      });
    }, 1200);

    return () => {
      isCancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  return ChatComponent ? <ChatComponent /> : null;
}
