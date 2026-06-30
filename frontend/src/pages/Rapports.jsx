import { useEffect, useState } from 'react';
import { Building2, Download } from 'lucide-react';
import Layout from '../components/Layout';
import Button from '../components/Button';
import { LoadingSpinner } from '../components/Modal';
import api, { downloadFile } from '../services/api';
import { TYPE_LIEU_LABELS } from '../utils/labels';

export default function Rapports() {
  const [structures, setStructures] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/reports/par-structure'), api.get('/reports/maintenance')])
      .then(([s, m]) => { setStructures(s.data); setMaintenance(m.data); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Layout title="Rapports"><LoadingSpinner /></Layout>;

  return (
    <Layout title="Rapports" subtitle="Analyses et exports par structure">
      <div className="mb-6">
        <Button variant="gold" onClick={() => downloadFile('/exports/rapport-structures', 'rapport_structures.pdf')}>
          <Download size={18} /> Exporter rapport structures (PDF)
        </Button>
      </div>

      <div className="space-y-6">
        {structures.filter((s) => s.nb_affectations > 0).map((s) => (
          <div key={s.lieu_id} className="cro-card p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-10 h-10 rounded-xl bg-cro-teal/10 flex items-center justify-center">
                <Building2 size={20} className="text-cro-teal" />
              </div>
              <div>
                <h3 className="font-display font-bold text-cro-teal">{s.nom}</h3>
                <p className="text-cro-muted text-sm">{TYPE_LIEU_LABELS[s.type_lieu]} — {s.ville || 'N/A'} — {s.nb_affectations} materiel(s)</p>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              {s.materiels?.map((m, i) => (
                <div key={i} className="bg-cro-cream rounded-lg px-4 py-2 text-sm">
                  <span className="font-semibold text-cro-teal">{m.matricule}</span>
                  <span className="text-cro-muted"> — {m.designation}</span>
                  <p className="text-xs text-cro-muted mt-0.5">Beneficiaire : {m.beneficiaire}</p>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="cro-card p-6">
          <h3 className="font-display font-bold text-cro-teal mb-4">Maintenances a venir</h3>
          {maintenance.length === 0 ? (
            <p className="text-cro-muted text-center py-4">Aucune maintenance planifiee</p>
          ) : (
            <div className="space-y-2">
              {maintenance.map((m) => (
                <div key={m.id} className="flex justify-between items-center py-2 border-b border-cro-sand last:border-0 text-sm">
                  <div>
                    <span className="font-semibold">{m.matricule}</span> — {m.materiel}
                    <p className="text-cro-muted text-xs">{m.type_maintenance}</p>
                  </div>
                  <span className="text-cro-gold font-semibold">{new Date(m.date_prevue).toLocaleDateString('fr-FR')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
