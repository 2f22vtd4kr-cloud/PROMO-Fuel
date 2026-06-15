import { useEffect, useRef } from "react";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

export function useSse(onEvent: (type: string, data: unknown) => void) {
  const cbRef = useRef(onEvent);
  cbRef.current = onEvent;

  useEffect(() => {
    let es: EventSource | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let dead = false;

    function connect() {
      if (dead) return;
      es = new EventSource(`${API_BASE}/api/events`);

      es.addEventListener("campaigns", (e: MessageEvent) => {
        try { cbRef.current("campaigns", JSON.parse(e.data)); } catch {}
      });
      es.addEventListener("accounts", (e: MessageEvent) => {
        try { cbRef.current("accounts", JSON.parse(e.data)); } catch {}
      });

      es.onerror = () => {
        es?.close();
        if (!dead) retryTimer = setTimeout(connect, 4000);
      };
    }

    connect();

    return () => {
      dead = true;
      if (retryTimer) clearTimeout(retryTimer);
      es?.close();
    };
  }, []);
}
