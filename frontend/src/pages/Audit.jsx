import { useEffect, useState } from 'react';
import { ScrollText } from 'lucide-react';
import Layout from '../components/Layout';
import Badge from '../components/Badge';
import { LoadingSpinner, EmptyState } from '../components/Modal';
import api from '../services/api';
import { ACTION_LABELS, formatDate } from '../utils/labels';

export default function Audit() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    setLoading(true);
    const params = filter ? `?entity_type=${filter}` : '';
    api.get(`/historique${params}`)
      .then((res) => setItems(res.data))
      .finally(() => setLoading(false));
  }, [filter]);

  return (
    <Layout title="Journal d'audit" subtitle="Historique des actions sur la plateforme">
      <div className="toolbar mb-6">
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="filter-select w-full sm:w-auto">
          <option value="">Toutes les entites</option>
          <option value="materiel">Materiel</option>
          <option value="affectation">Affectation</option>
          <option value="maintenance">Maintenance</option>
          <option value="destockage">Destockage</option>
          <option value="inventaire">Inventaire</option>
          <option value="lieu">Lieu / Structure</option>
        </select>
      </div>

      {loading ? <LoadingSpinner /> : items.length === 0 ? (
        <EmptyState icon={ScrollText} title="Aucune entree" description="Les actions seront enregistrees ici." />
      ) : (
        <div className="cro-card divide-y divide-cro-sand">
          {items.map((e) => (
            <div key={e.id} className="p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="teal">{e.entity_type}</Badge>
                  <Badge variant="muted">{ACTION_LABELS[e.action] || e.action}</Badge>
                </div>
                <span className="text-xs text-cro-muted">{formatDate(e.created_at)}</span>
              </div>
              <p className="text-sm text-cro-ink">{e.description}</p>
              <p className="text-xs text-cro-muted mt-1">Par {e.user_name} — ref. #{e.entity_id}</p>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
