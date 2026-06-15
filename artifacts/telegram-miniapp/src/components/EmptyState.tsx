interface Props {
  icon?: string;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({ icon = "📭", title, description, actionLabel, onAction }: Props) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '3rem 1.5rem', gap: '0.75rem', textAlign: 'center', minHeight: '200px'
    }}>
      <div style={{ fontSize: '2.5rem', opacity: 0.3, marginBottom: '0.5rem' }}>{icon}</div>
      {title && <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-secondary)' }}>{title}</div>}
      {description && <div style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)', maxWidth: '260px', lineHeight: 1.6 }}>{description}</div>}
      {actionLabel && onAction && (
        <button className="btn-primary" style={{ marginTop: '0.75rem' }} onClick={onAction}>{actionLabel}</button>
      )}
    </div>
  );
}
