export default function Select({ label, error, className = '', children, ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-textPrimary">{label}</label>}
      <select className={`input-base ${error ? 'border-red-400' : ''} ${className}`} {...props}>{children}</select>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
