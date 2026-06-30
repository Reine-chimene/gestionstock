import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, MapPin, ArrowRightLeft, Users, LogOut, Menu, X,
  FileBarChart, ClipboardList, Wrench, PackageMinus, ScrollText,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Logo from './Logo';

const NAV_MAIN = [
  { to: '/', icon: LayoutDashboard, label: 'Tableau de bord' },
  { to: '/materiels', icon: Package, label: 'Materiel' },
  { to: '/lieux', icon: MapPin, label: 'Structures' },
  { to: '/affectations', icon: ArrowRightLeft, label: 'Affectations' },
];
const NAV_GESTION = [
  { to: '/maintenance', icon: Wrench, label: 'Maintenance' },
  { to: '/destockage', icon: PackageMinus, label: 'Destockage' },
  { to: '/inventaire', icon: ClipboardList, label: 'Inventaire' },
  { to: '/rapports', icon: FileBarChart, label: 'Rapports' },
  { to: '/audit', icon: ScrollText, label: 'Journal audit', editOnly: true },
  { to: '/membres', icon: Users, label: 'Equipe', editOnly: true },
];

function SidebarContent({ mobile, onClose }) {
  const { user, logout, canEdit } = useAuth();
  const navigate = useNavigate();
  const gestion = NAV_GESTION.filter((i) => !i.editOnly || canEdit);
  const initials = `${user?.prenom?.[0] || ''}${user?.nom?.[0] || ''}`.toUpperCase();

  const renderLinks = (items) => items.map(({ to, icon: Icon, label }) => (
    <NavLink key={to} to={to} end={to === '/'} onClick={mobile ? onClose : undefined}
      className={({ isActive }) => isActive ? 'nav-link-active' : 'nav-link'}>
      <Icon size={18} strokeWidth={1.75} />
      {label}
    </NavLink>
  ));

  return (
    <>
      <div className="sidebar-brand">
        <div className="flex items-center gap-3">
          <Logo size={44} />
          <div className="min-w-0">
            <p className="font-semibold text-white text-sm leading-tight">Stock Patrimonial</p>
            <p className="text-white/40 text-[10px]">Region de l'Ouest</p>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <p className="nav-section">Principal</p>
        {renderLinks(NAV_MAIN)}
        <p className="nav-section">Gestion</p>
        {renderLinks(gestion)}
      </nav>

      <div className="sidebar-foot">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cro-gold to-cro-gold-light flex items-center justify-center text-cro-teal-dark text-xs font-bold">
            {initials || '?'}
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-semibold truncate">{user?.prenom} {user?.nom}</p>
            <p className="text-white/40 text-xs truncate">{user?.role}</p>
          </div>
        </div>
        <button onClick={() => { logout(); navigate('/login'); }} className="nav-link w-full !text-white/50">
          <LogOut size={16} /> Deconnexion
        </button>
      </div>
    </>
  );
}

export default function Layout({ children, title, subtitle, actions }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="page-bg flex min-h-screen">
      <aside className="sidebar hidden lg:flex"><SidebarContent /></aside>

      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="modal-bg" onClick={() => setOpen(false)} />
          <aside className="sidebar relative z-10 h-full">
            <div className="flex justify-end p-3">
              <button onClick={() => setOpen(false)} className="text-white/50 p-2"><X size={22} /></button>
            </div>
            <SidebarContent mobile onClose={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-cro-sand/80 px-4 h-14 flex items-center gap-3">
          <button onClick={() => setOpen(true)} className="btn btn-ghost btn-icon"><Menu size={20} /></button>
          <Logo size={32} />
          <span className="font-semibold text-cro-ink text-sm truncate">Stock CRO</span>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1400px] w-full mx-auto overflow-x-hidden">
          {(title || subtitle || actions) && (
            <div className="page-header flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                {title && <h1 className="page-title">{title}</h1>}
                {subtitle && <p className="page-subtitle">{subtitle}</p>}
              </div>
              {actions && <div className="page-actions">{actions}</div>}
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
