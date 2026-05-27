"use client";

import { useEffect, useRef, useState } from "react";

type GoogleCredentialResponse = {
  credential?: string;
};

type GoogleAuthButtonProps = {
  onCredential: (idToken: string) => void;
  disabled?: boolean;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
            ux_mode?: "popup";
          }) => void;
          renderButton: (
            element: HTMLElement,
            options: {
              theme?: "outline" | "filled_blue" | "filled_black";
              size?: "large" | "medium" | "small";
              text?: "signin_with" | "signup_with" | "continue_with" | "signin";
              shape?: "rectangular" | "pill" | "circle" | "square";
              width?: number;
            },
          ) => void;
        };
      };
    };
  }
}

function loadGoogleIdentityScript() {
  const existingScript = document.getElementById("google-identity-services");

  if (existingScript) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.id = "google-identity-services";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load Google login."));
    document.head.appendChild(script);
  });
}

export function GoogleAuthButton({ onCredential, disabled = false }: GoogleAuthButtonProps) {
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const [scriptError, setScriptError] = useState("");
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

  useEffect(() => {
    if (!clientId || disabled) {
      return;
    }

    let isMounted = true;

    loadGoogleIdentityScript()
      .then(() => {
        if (!isMounted || !buttonRef.current || !window.google) {
          return;
        }

        buttonRef.current.innerHTML = "";
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            if (response.credential) {
              onCredential(response.credential);
            }
          },
          ux_mode: "popup",
        });
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "rectangular",
          width: 406,
        });
      })
      .catch((error: unknown) => {
        if (isMounted) {
          setScriptError(error instanceof Error ? error.message : "Could not load Google login.");
        }
      });

    return () => {
      isMounted = false;
    };
  }, [clientId, disabled, onCredential]);

  if (!clientId) {
    return (
      <button
        type="button"
        disabled
        className="flex h-12 w-full cursor-not-allowed items-center justify-center rounded-[7px] border border-[#c8ccd6] bg-white px-5 text-[15px] font-bold text-[#8d929d]"
      >
        Google login is not configured
      </button>
    );
  }

  if (disabled) {
    return (
      <button
        type="button"
        disabled
        className="flex h-12 w-full cursor-not-allowed items-center justify-center rounded-[7px] border border-[#c8ccd6] bg-white px-5 text-[15px] font-bold text-[#8d929d]"
      >
        Continue with Google
      </button>
    );
  }

  if (scriptError) {
    return (
      <p className="rounded-[8px] bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
        {scriptError}
      </p>
    );
  }

  return <div ref={buttonRef} className="flex min-h-12 w-full justify-center" />;
}
