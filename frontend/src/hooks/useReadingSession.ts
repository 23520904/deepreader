import { useEffect, useRef } from "react";

export function useReadingSession(bookId: string, token: string) {
  const secondsRef = useRef<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const syncSession = async (seconds: number) => {
    if (seconds === 0 || !token) return;
    try {
      await fetch("/api/v1/reading-sessions/sync", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bookId, secondsSpent: seconds }),
        keepalive: true,
      });
    } catch (e) {
      console.error("Failed to sync reading session:", e);
    }
  };

  const syncBeacon = (seconds: number) => {
    if (seconds === 0 || !token) return;
    const blob = new Blob(
      [JSON.stringify({ bookId, secondsSpent: seconds, token })],
      { type: "application/json" }
    );
    navigator.sendBeacon("/api/v1/reading-sessions/sync-beacon", blob);
  };

  useEffect(() => {
    if (!bookId || !token) return;

    secondsRef.current = 0;

    const startTimer = () => {
      intervalRef.current = setInterval(() => {
        secondsRef.current += 1;
        // Sync to server every 30 seconds
        if (secondsRef.current % 30 === 0) {
          syncSession(secondsRef.current);
        }
      }, 1000);
    };

    startTimer();

    // Pause timer when tab is inactive
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      } else {
        startTimer();
      }
    };

    const handleUnload = () => syncBeacon(secondsRef.current);

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      syncSession(secondsRef.current);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [bookId, token]);
}
