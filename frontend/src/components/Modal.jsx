import { X } from 'lucide-react';

const SIZES = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

export default function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  if (!isOpen) return null;
  return (
    <div className="modal-root">
      <div className="modal-bg" onClick={onClose} />
      <div className={`modal-panel ${SIZES[size] || SIZES.md}`}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button onClick={onClose} className="modal-close"><X size={22} /></button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="empty card-shadow">
      {Icon && <div className="empty-icon"><Icon size={28} /></div>}
      <h3 className="empty-title">{title}</h3>
      <p className="empty-desc">{description}</p>
      {action}
    </div>
  );
}

export function LoadingSpinner() {
  return <div className="spinner-wrap"><div className="spinner" /></div>;
}

export function Alert({ type = 'info', message, onClose }) {
  const cls = { info: 'alert-info', success: 'alert-success', error: 'alert-error', warning: 'alert-warning' };
  const text = typeof message === 'string' ? message : String(message ?? '');
  return (
    <div className={cls[type] || cls.info}>
      <p>{text}</p>
      {onClose && <button onClick={onClose} className="modal-close !p-1"><X size={16} /></button>}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="page-header flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div>
        {title && <h1 className="page-title">{title}</h1>}
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}

export function StatCard({ icon: Icon, label, value, iconClass = 'bg-cro-teal-soft text-cro-teal', children }) {
  return (
    <div className="card-stat">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="stat-label">{label}</p>
          <p className="stat-value">{value ?? 0}</p>
          {children}
        </div>
        {Icon && (
          <div className={`stat-icon ${iconClass}`}>
            <Icon size={20} strokeWidth={1.75} />
          </div>
        )}
      </div>
    </div>
  );
}
