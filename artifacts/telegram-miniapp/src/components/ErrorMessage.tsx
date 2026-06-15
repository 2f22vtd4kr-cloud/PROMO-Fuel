import { TG } from "../lib/theme";

interface Props {
  message: string;
  onRetry?: () => void;
}

export default function ErrorMessage({ message, onRetry }: Props) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "32px 20px",
      gap: 12,
      textAlign: "center",
    }}>
      <span style={{ fontSize: 32 }}>❌</span>
      <p style={{ color: TG.red ?? "#ff6b7a", fontSize: 13, margin: 0 }}>
        Ошибка: {message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            padding: "8px 20px",
            borderRadius: 10,
            background: `${TG.accent ?? "#6ba8e5"}22`,
            border: `1px solid ${TG.accent ?? "#6ba8e5"}44`,
            color: TG.accent ?? "#6ba8e5",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          🔄 Повторить
        </button>
      )}
    </div>
  );
}
