import { Link } from 'react-router-dom';
import { Package, Shield, BarChart3 } from 'lucide-react';
import Logo from './Logo';

export default function AuthLayout({ children, title, subtitle }) {
  return (
    <div className="auth-layout">
      {/* Panneau gauche — style Figma split-screen */}
      <div className="auth-panel auth-panel-bg relative text-white">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <Logo size={56} />
            <div>
              <p className="font-bold text-sm">Conseil Regional</p>
              <p className="text-white/50 text-xs tracking-widest uppercase">de l'Ouest</p>
            </div>
          </div>

          <h1 className="font-display text-4xl xl:text-5xl font-bold leading-tight mb-4">
            Gestion de<br />Stock Patrimonial
          </h1>
          <p className="text-white/60 text-lg max-w-md leading-relaxed">
            Suivez le materiel, les affectations et l'inventaire du Conseil Regional en toute simplicite.
          </p>
        </div>

        <div className="relative z-10 space-y-4">
          {[
            { icon: Package, text: 'Inventaire complet avec QR codes' },
            { icon: BarChart3, text: 'Rapports et exports PDF/Excel' },
            { icon: Shield, text: 'Acces securise par roles' },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-3 text-white/70 text-sm">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                <Icon size={16} className="text-cro-gold-light" />
              </div>
              {text}
            </div>
          ))}
        </div>

        <p className="relative z-10 text-white/30 text-xs">© 2026 Conseil Regional de l'Ouest</p>
      </div>

      {/* Formulaire */}
      <div className="auth-form-side">
        <div className="auth-form-box">
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <Logo size={44} />
            <span className="font-bold text-cro-ink text-sm">Gestion de Stock CRO</span>
          </div>

          <div className="auth-card">
            {title && <h2 className="text-2xl font-bold text-cro-ink mb-1">{title}</h2>}
            {subtitle && <p className="text-cro-muted text-sm mb-8">{subtitle}</p>}
            {!subtitle && title && <div className="mb-8" />}
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
