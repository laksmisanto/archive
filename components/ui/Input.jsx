export default function Input({
  label,
  error,
  hint,
  className = "",
  ...props
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-textPrimary">{label}</label>
      )}
      <input
        className={`input-base input-field ${error ? "border-danger" : ""} ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      {hint && !error && <p className="text-xs text-textMuted">{hint}</p>}
    </div>
  );
}
