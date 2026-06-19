import Spinner from "./Spinner";

export default function Button({
  children,
  variant = "primary",
  size = "md",
  loading,
  className = "",
  ...props
}) {
  const base =
    "inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-btnBg hover:bg-btnHover text-white focus:ring-primary",
    secondary:
      "bg-surface hover:bg-cardHover text-textPrimary focus:ring-divider",
    danger: "bg-danger hover:bg-danger/80 text-white focus:ring-danger",
    ghost:
      "border border-inputBorder hover:bg-cardHover text-textMuted hover:text-textPrimary focus:ring-divider",
    outline:
      "border border-inputBorder hover:bg-cardHover text-textPrimary focus:ring-divider",
  };
  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-2.5 text-base",
  };
  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  );
}
