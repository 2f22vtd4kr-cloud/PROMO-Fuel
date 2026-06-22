import { AlertTriangle, Trash2, X } from "lucide-react";

interface ConfirmModalProps {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  title,
  description,
  confirmLabel = "Так, видалити",
  cancelLabel = "Скасувати",
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onCancel(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 999,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "0 24px",
        background: "rgba(4,6,14,0.72)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        animation: "fadeIn 0.18s ease",
      }}
    >
      <div style={{
        width: "100%", maxWidth: 340,
        background: "linear-gradient(145deg, rgba(255,255,255,0.11) 0%, rgba(255,255,255,0.05) 60%, rgba(255,255,255,0.09) 100%)",
        border: "1px solid rgba(255,107,122,0.35)",
        borderRadius: 24,
        padding: "24px 20px 20px",
        boxShadow: "0 16px 48px rgba(0,0,0,0.55), 0 0 0 0.5px rgba(255,255,255,0.06) inset, 0 4px 32px rgba(255,107,122,0.14)",
        position: "relative",
        animation: "slideUp 0.22s ease-out both",
      }}>
        {/* Top specular edge */}
        <div style={{
          position: "absolute", top: 0, left: "8%", right: "8%", height: 1,
          background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.50) 40%,rgba(255,255,255,0.65) 50%,rgba(255,255,255,0.50) 60%,transparent)",
          pointerEvents: "none",
        }} />

        {/* Close */}
        <div
          onClick={onCancel}
          style={{ position: "absolute", top: 14, right: 14, cursor: "pointer", padding: 4, color: "rgba(255,255,255,0.28)" }}
        >
          <X size={16} />
        </div>

        {/* Icon */}
        <div style={{
          width: 52, height: 52, borderRadius: 16, margin: "0 auto 16px",
          background: "rgba(255,107,122,0.12)",
          border: "1px solid rgba(255,107,122,0.35)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 0 24px rgba(255,107,122,0.25)",
        }}>
          <AlertTriangle size={24} color="#ff6b7a" />
        </div>

        {/* Title */}
        <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", textAlign: "center", marginBottom: 8, lineHeight: 1.3 }}>
          {title}
        </div>

        {/* Description */}
        {description && (
          <div style={{ fontSize: 12, color: "rgba(160,190,230,0.65)", textAlign: "center", marginBottom: 20, lineHeight: 1.55 }}>
            {description}
          </div>
        )}
        {!description && <div style={{ marginBottom: 20 }} />}

        {/* Buttons */}
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onCancel}
            disabled={busy}
            style={{
              flex: 1, padding: "12px 0", borderRadius: 14,
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.13)",
              fontSize: 13, fontWeight: 700, color: "rgba(200,220,255,0.75)",
              cursor: busy ? "not-allowed" : "pointer",
              opacity: busy ? 0.5 : 1,
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            style={{
              flex: 1, padding: "12px 0", borderRadius: 14,
              background: busy ? "rgba(255,107,122,0.15)" : "linear-gradient(135deg, rgba(255,107,122,0.85), rgba(220,60,80,0.90))",
              border: "1px solid rgba(255,107,122,0.50)",
              fontSize: 13, fontWeight: 800, color: "#fff",
              cursor: busy ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              boxShadow: busy ? "none" : "0 4px 16px rgba(255,107,122,0.35)",
            }}
          >
            {busy ? (
              <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", animation: "spin 0.7s linear infinite" }} />
            ) : (
              <Trash2 size={13} />
            )}
            {busy ? "Видалення…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
