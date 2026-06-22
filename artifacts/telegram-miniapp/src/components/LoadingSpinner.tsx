export default function LoadingSpinner({ label = "Завантаження..." }: { label?: string }) {
  return (
    <div className="loading-spinner">
      <span>{label}</span>
    </div>
  );
}
