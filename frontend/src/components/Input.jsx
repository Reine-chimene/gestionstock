export default function Input({ label, error, hint, className = '', ...props }) {
  return (
    <div className={`field ${className}`}>
      {label && (
        <label className="label">
          {label}
          {props.required && <span className="label-req">*</span>}
        </label>
      )}
      <input className={`input ${error ? 'input-error' : ''}`} {...props} />
      {hint && !error && <p className="hint">{hint}</p>}
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

export function Select({ label, error, children, className = '', ...props }) {
  return (
    <div className={`field ${className}`}>
      {label && (
        <label className="label">
          {label}
          {props.required && <span className="label-req">*</span>}
        </label>
      )}
      <select className={`select ${error ? 'input-error' : ''}`} {...props}>{children}</select>
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

export function Textarea({ label, error, className = '', ...props }) {
  return (
    <div className={`field ${className}`}>
      {label && (
        <label className="label">
          {label}
          {props.required && <span className="label-req">*</span>}
        </label>
      )}
      <textarea className={`textarea ${error ? 'input-error' : ''}`} {...props} />
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder = 'Rechercher...' }) {
  return (
    <div className="search-wrap">
      <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
      </svg>
      <input type="text" className="search-input" value={value} onChange={onChange} placeholder={placeholder} />
    </div>
  );
}
