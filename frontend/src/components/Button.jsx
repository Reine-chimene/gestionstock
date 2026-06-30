export default function Button({ children, variant = 'primary', size = 'md', className = '', loading, disabled, ...props }) {
  const v = { primary: 'btn-primary', gold: 'btn-gold', secondary: 'btn-secondary', danger: 'btn-danger', ghost: 'btn-ghost' };
  const s = { sm: 'btn-sm', md: '', lg: 'btn-lg' };
  return (
    <button className={`btn ${v[variant] || v.primary} ${s[size] || ''} ${className}`} disabled={disabled || loading} {...props}>
      {loading && <span className="spinner !w-4 !h-4 !border-2" />}
      {children}
    </button>
  );
}
