import { AlertTriangle, CheckCircle, Info, XCircle, X } from 'lucide-react';

const config = {
  warning: { icon: AlertTriangle, bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-700', text: 'text-amber-800 dark:text-amber-300' },
  success: { icon: CheckCircle, bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-700', text: 'text-green-800 dark:text-green-300' },
  error:   { icon: XCircle, bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-700', text: 'text-red-800 dark:text-red-300' },
  info:    { icon: Info, bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-700', text: 'text-blue-800 dark:text-blue-300' },
};

export default function Alert({ type = 'info', title, children, onDismiss }) {
  const { icon: Icon, bg, border, text } = config[type];
  return (
    <div className={`flex gap-3 p-4 rounded-lg border ${bg} ${border} animate-fadeIn`}>
      <Icon size={18} className={`${text} flex-shrink-0 mt-0.5`} />
      <div className="flex-1 min-w-0">
        {title && <p className={`text-sm font-medium ${text}`}>{title}</p>}
        {children && <div className={`text-sm ${text} mt-0.5`}>{children}</div>}
      </div>
      {onDismiss && <button onClick={onDismiss} className={`${text} hover:opacity-70 flex-shrink-0`}><X size={14} /></button>}
    </div>
  );
}
