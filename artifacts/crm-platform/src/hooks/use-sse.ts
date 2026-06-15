import { useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getListCampaignsQueryKey } from "@workspace/api-client-react";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

export function useCampaignSSE() {
  const qc = useQueryClient();
  const esRef = useRef<EventSource | null>(null);
  const retriesRef = useRef(0);

  const connect = useCallback(() => {
    if (esRef.current) esRef.current.close();

    const es = new EventSource(`${API_BASE}/api/events`);
    esRef.current = es;

    es.addEventListener("campaigns", () => {
      qc.invalidateQueries({ queryKey: getListCampaignsQueryKey() });
      retriesRef.current = 0;
    });

    es.addEventListener("accounts", () => {
      qc.invalidateQueries({ queryKey: ["accounts"] });
      retriesRef.current = 0;
    });

    es.onerror = () => {
      es.close();
      esRef.current = null;
      retriesRef.current += 1;
      const delay = Math.min(1000 * 2 ** retriesRef.current, 30_000);
      setTimeout(connect, delay);
    };
  }, [qc]);

  useEffect(() => {
    connect();
    return () => {
      esRef.current?.close();
      esRef.current = null;
    };
  }, [connect]);
}
