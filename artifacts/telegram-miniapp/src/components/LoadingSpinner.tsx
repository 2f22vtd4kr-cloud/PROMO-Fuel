export default function LoadingSpinner({ label = "Загрузка..." }: { label?: string }) {
  return (
    <div className="loading-spinner">
      <span>{label}</span>
    </div>
  );
}
