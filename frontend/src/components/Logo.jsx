export default function Logo({ size = 48, className = '' }) {
  return (
    <img
      src="/logo-region-ouest.png"
      alt="Region de l'Ouest - West Region"
      width={size}
      height={size}
      className={`rounded-full object-cover shrink-0 ${className}`}
    />
  );
}
