interface Props {
  message: string;
  onRetry?: () => void;
}

export default function ErrorMessage({ message, onRetry }: Props) {
  return (
    <div className="error-message">
      <div style={{ fontWeight: 700, color: 'var(--status-cancelled)', marginBottom: '0.25rem' }}>
        Не удалось загрузить данные
      </div>
      <div style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
        {message}
      </div>
      {onRetry && (
        <button className="btn-glass" style={{ marginTop: '0.75rem', alignSelf: 'flex-start' }} onClick={onRetry}>
          Повторить
        </button>
      )}
    </div>
  );
}
