const PRESETS = {
  teal: 'badge-teal',
  gold: 'badge-gold',
  success: 'badge-success',
  warning: 'badge-warning',
  error: 'badge-error',
  muted: 'badge-muted',
};

export default function Badge({ children, variant = 'muted', color }) {
  const cls = color ? `badge ${color}` : PRESETS[variant] || PRESETS.muted;
  return <span className={cls}>{children}</span>;
}
