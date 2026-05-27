"use client";

import { usePathname } from "next/navigation";
import { useState, type ComponentType } from "react";

type FloatingHelpChatProps = {
  initiallyOpen?: boolean;
};

type FloatingHelpChatComponent = ComponentType<FloatingHelpChatProps>;

export function LazyFloatingHelpChat() {
  const pathname = usePathname();
  const [ChatComponent, setChatComponent] =
    useState<FloatingHelpChatComponent | null>(null);
  const [shouldOpenWhenLoaded, setShouldOpenWhenLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  function loadChat(openAfterLoad: boolean) {
    setShouldOpenWhenLoaded(openAfterLoad);

    if (ChatComponent || isLoading) {
      return;
    }

    setIsLoading(true);

    import("@/components/FloatingHelpChat")
      .then((module) => {
        setChatComponent(() => module.FloatingHelpChat);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }

  if (pathname.startsWith("/admin")) {
    return null;
  }

  if (ChatComponent) {
    return <ChatComponent initiallyOpen={shouldOpenWhenLoaded} />;
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 max-[640px]:inset-x-0 max-[640px]:bottom-0 max-[640px]:flex max-[640px]:justify-end max-[640px]:px-4 max-[640px]:pb-4">
      <button
        type="button"
        onClick={() => loadChat(true)}
        className={`group ml-auto grid h-16 w-16 cursor-pointer place-items-center rounded-full bg-[linear-gradient(135deg,#2563eb_0%,#38bdf8_100%)] text-white shadow-[0_18px_38px_rgba(37,99,235,0.34)] ring-4 ring-white/90 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_24px_44px_rgba(37,99,235,0.42)] max-[640px]:h-14 max-[640px]:w-14 ${
          isLoading ? "animate-pulse" : ""
        }`}
        aria-label="Open help chatbot"
        aria-busy={isLoading}
      >
        <ChatIcon />
      </button>
    </div>
  );
}

function ChatIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-8 w-8 max-[640px]:h-7 max-[640px]:w-7"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.4"
    >
      <path d="M7.5 18.5 4 20l1.1-3.3A8.1 8.1 0 0 1 3.5 12c0-4.1 3.8-7.5 8.5-7.5s8.5 3.4 8.5 7.5-3.8 7.5-8.5 7.5a9.5 9.5 0 0 1-4.5-1Z" />
      <path d="M8.5 11.5h.01" />
      <path d="M12 11.5h.01" />
      <path d="M15.5 11.5h.01" />
    </svg>
  );
}
