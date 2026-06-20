import { useEffect, useRef } from "react";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

export type SseEventType =
  | "campaigns"
  | "accounts"
  | "workers"
  | "worker_heartbeats"
  | "tasks";

export function useSse(onEvent: (type: SseEventType | string, data: unknown) => void) {
  const cbRef = useRef(onEvent);
  cbRef.current = onEvent;

  useEffect(() => {
    let es: EventSource | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let dead = false;

    const EVENTS: SseEventType[] = [
      "campaigns",
      "accounts",
      "workers",
      "worker_heartbeats",
      "tasks",
    ];

    function connect() {
      if (dead) return;
      es = new EventSource(`${API_BASE}/api/events`);

      for (const evt of EVENTS) {
        es.addEventListener(evt, (e: MessageEvent) => {
          try { cbRef.current(evt, JSON.parse(e.data)); } catch {}
        });
      }

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
