import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, CheckCircle, ArrowRightLeft, Wrench, MapPin, ClipboardList, AlertTriangle, TrendingUp, PackageMinus, Bell } from 'lucide-react';
import Layout from '../components/Layout';
import Button from '../components/Button';
import ExportMenu from '../components/ExportMenu';
import { LoadingSpinner, StatCard } from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { CATEGORIE_LABELS } from '../utils/labels';

export default function Dashboard() {
  const { canEdit } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [alertMsg, setAlertMsg] = useState('');

  const load = () => {
    setLoading(true);
    api.get('/dashboard/stats').then((r) => setStats(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const runAlerts = async () => {
    const res = await api.post('/alerts/run');
    setAlertMsg(`${res.data.maintenance_alertes} maintenance(s), ${res.data.stock_alertes} stock(s) bas`);
    load();
  };

  if (loading) {
    return <Layout title="Tableau de bord"><LoadingSpinner /></Layout>;
  }

  return (
    <Layout
      title="Tableau de bord"
      subtitle={`${stats.total_materiels} equipements suivis — Conseil Regional de l'Ouest`}
      actions={
        <div className="flex flex-wrap gap-2">
          <ExportMenu baseUrl="/exports/materiels" name="inventaire" />
          {canEdit && (
            <Button variant="gold" size="sm" onClick={runAlerts}><Bell size={16} /> Envoyer alertes</Button>
          )}
        </div>
      }
    >
      {alertMsg && (
        <div className="alert-success mb-4">{alertMsg}</div>
      )}
      {/* Bandeau accueil */}
      <div className="card-accent card-body mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-cro-teal to-cro-teal-light !border-0 text-white">
        <div>
          <p className="text-white/70 text-sm font-medium">Patrimoine du CRO</p>
          <p className="text-2xl font-bold mt-1">{stats.affectations_actives} affectations actives</p>
        </div>
        <div className="flex items-center gap-2 text-white/80 text-sm bg-white/10 rounded-xl px-4 py-2">
          <TrendingUp size={18} />
          Inventaire a jour
        </div>
      </div>

      <div className="grid-stats mb-8">
        <Link to="/materiels"><StatCard icon={Package} label="Total materiel" value={stats.total_materiels} iconClass="bg-blue-50 text-blue-600" /></Link>
        <StatCard icon={CheckCircle} label="Disponibles" value={stats.disponibles} iconClass="bg-emerald-50 text-emerald-600" />
        <Link to="/affectations"><StatCard icon={ArrowRightLeft} label="Affectes" value={stats.affectes} iconClass="bg-violet-50 text-violet-600" /></Link>
        <Link to="/maintenance"><StatCard icon={Wrench} label="Maintenance" value={stats.en_maintenance} iconClass="bg-amber-50 text-amber-600" /></Link>
        <Link to="/lieux"><StatCard icon={MapPin} label="Structures" value={stats.total_lieux} iconClass="bg-rose-50 text-rose-600" /></Link>
        <Link to="/inventaire"><StatCard icon={ClipboardList} label="Inventaire" value={stats.inventaire_en_cours} iconClass="bg-cyan-50 text-cyan-600" /></Link>
        <Link to="/maintenance"><StatCard icon={AlertTriangle} label="Rappels" value={stats.maintenances_proches} iconClass="bg-orange-50 text-orange-600" /></Link>
        <Link to="/materiels"><StatCard icon={AlertTriangle} label="Stock bas" value={stats.stock_bas || 0} iconClass="bg-amber-50 text-amber-700" /></Link>
        <Link to="/destockage"><StatCard icon={PackageMinus} label="Destockages" value={stats.destockages_total} iconClass="bg-stone-100 text-stone-600" /></Link>
        <StatCard icon={PackageMinus} label="Reformes" value={stats.reformes} iconClass="bg-gray-100 text-gray-600" />
        <StatCard icon={AlertTriangle} label="Hors service" value={stats.hors_service} iconClass="bg-red-50 text-red-500" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card-shadow card-body">
          <h2 className="card-title mb-1">Par categorie</h2>
          <p className="card-subtitle mb-5">Repartition du materiel</p>
          <div className="space-y-3">
            {stats.par_categorie?.length ? stats.par_categorie.map(({ categorie, count }) => {
              const pct = stats.total_materiels ? Math.round((count / stats.total_materiels) * 100) : 0;
              const label = CATEGORIE_LABELS[categorie.replace('CategorieMateriel.', '')] || categorie;
              return (
                <div key={categorie}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-cro-muted">{label}</span>
                    <span className="font-semibold text-cro-ink">{count}</span>
                  </div>
                  <div className="h-2 bg-cro-sand rounded-full overflow-hidden">
                    <div className="h-full bg-cro-teal rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            }) : <p className="text-cro-muted text-sm text-center py-8">Aucune donnee</p>}
          </div>
        </div>

        <div className="card-shadow card-body">
          <h2 className="card-title mb-1">Par structure</h2>
          <p className="card-subtitle mb-5">Affectations par lieu</p>
          <div className="space-y-2">
            {stats.par_lieu?.length ? stats.par_lieu.map(({ lieu, count }) => (
              <div key={lieu} className="flex items-center justify-between py-3 border-b border-cro-sand/60 last:border-0">
                <span className="text-sm text-cro-ink font-medium">{lieu}</span>
                <span className="badge-teal">{count} materiel{count > 1 ? 's' : ''}</span>
              </div>
            )) : <p className="text-cro-muted text-sm text-center py-8">Aucune affectation</p>}
          </div>
        </div>
      </div>
    </Layout>
  );
}
