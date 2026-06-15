import { useEffect, useState } from "react";

interface ToastProps {
  message: string;
  type?: "success" | "error" | "info";
  duration?: number;
  onDismiss: () => void;
}

export function Toast({ message, type = "info", duration = 3000, onDismiss }: ToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const show = setTimeout(() => setVisible(true), 10);
    const hide = setTimeout(() => { setVisible(false); setTimeout(onDismiss, 300); }, duration);
    return () => { clearTimeout(show); clearTimeout(hide); };
  }, [duration, onDismiss]);

  const colors: Record<string, string> = {
    success: "var(--status-running)",
    error: "var(--status-cancelled)",
    info: "var(--accent-primary)"
  };

  return (
    <div style={{
      position: 'fixed', bottom: '88px', left: '50%',
      transform: `translateX(-50%) translateY(${visible ? '0' : '16px'})`,
      zIndex: 10000,
      transition: `opacity 0.25s, transform 0.3s var(--ease-spring)`,
      opacity: visible ? 1 : 0,
      pointerEvents: 'none',
      background: 'rgba(10,13,24,0.92)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: `1px solid ${colors[type]}33`,
      borderRadius: 'var(--radius-pill)',
      padding: '0.6rem 1.25rem',
      color: colors[type],
      fontWeight: 600,
      fontSize: '0.85rem',
      boxShadow: `0 4px 24px rgba(0,0,0,0.4), 0 0 16px ${colors[type]}22`,
      whiteSpace: 'nowrap',
      fontFamily: 'var(--font-ui)',
    }}>
      {message}
    </div>
  );
}

export function useToast() {
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; type: "success" | "error" | "info" }>>([]);
  const show = (message: string, type: "success" | "error" | "info" = "info") =>
    setToasts(prev => [...prev, { id: Date.now(), message, type }]);
  const dismiss = (id: number) => setToasts(prev => prev.filter(t => t.id !== id));
  const node = (
    <>
      {toasts.map(t => <Toast key={t.id} message={t.message} type={t.type} onDismiss={() => dismiss(t.id)} />)}
    </>
  );
  return { show, node };
}
