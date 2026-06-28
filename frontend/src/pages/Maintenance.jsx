import { useEffect, useState } from 'react';
import { Plus, Wrench, Bell } from 'lucide-react';
import Layout from '../components/Layout';
import Button from '../components/Button';
import Input, { Select } from '../components/Input';
import Modal, { LoadingSpinner, Alert } from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function MaintenancePage() {
  const { canEdit } = useAuth();
  const [items, setItems] = useState([]);
  const [materiels, setMateriels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ materiel_id: '', type_maintenance: '', description: '', date_prevue: '', rappel_jours: 7 });
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([api.get('/maintenance'), api.get('/materiels')])
      .then(([m, mat]) => { setItems(m.data); setMateriels(mat.data); })
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/maintenance', { ...form, materiel_id: parseInt(form.materiel_id), date_prevue: new Date(form.date_prevue).toISOString() });
      setModal(false);
      load();
    } catch (err) { setError(err.response?.data?.detail || 'Erreur'); }
  };

  const checkAlertes = async () => {
    const res = await api.post('/maintenance/check-alertes');
    setMsg(`${res.data.alertes_envoyees} alerte(s) envoyee(s)`);
  };

  const terminer = async (id) => {
    await api.patch(`/maintenance/${id}`, { statut: 'terminee', date_fin: new Date().toISOString() });
    load();
  };

  return (
    <Layout title="Maintenance" subtitle="Planification et rappels d'entretien">
      <div className="flex flex-wrap gap-3 mb-6">
        {canEdit && (
          <>
            <Button onClick={() => setModal(true)}><Plus size={18} /> Planifier</Button>
            <Button variant="gold" onClick={checkAlertes}><Bell size={18} /> Verifier alertes</Button>
          </>
        )}
      </div>
      {msg && <Alert type="success" message={msg} onClose={() => setMsg('')} />}

      {loading ? <LoadingSpinner /> : (
        <div className="space-y-3">
          {items.map((m) => (
            <div key={m.id} className="cro-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-cro-teal">{m.materiel_designation} <span className="text-cro-gold">({m.matricule})</span></p>
                <p className="text-sm text-cro-muted">{m.type_maintenance} — {new Date(m.date_prevue).toLocaleDateString('fr-FR')}</p>
                <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${m.statut === 'planifiee' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>{m.statut}</span>
              </div>
              {canEdit && m.statut === 'planifiee' && (
                <Button variant="secondary" size="sm" onClick={() => terminer(m.id)}>Terminer</Button>
              )}
            </div>
          ))}
          {items.length === 0 && <p className="text-center text-cro-muted py-12">Aucune maintenance planifiee</p>}
        </div>
      )}

      <Modal isOpen={modal} onClose={() => setModal(false)} title="Planifier une maintenance">
        {error && <Alert type="error" message={error} />}
        <form onSubmit={handleCreate} className="space-y-4">
          <Select label="Materiel" value={form.materiel_id} onChange={(e) => setForm({ ...form, materiel_id: e.target.value })} required>
            <option value="">Choisir...</option>
            {materiels.map((m) => <option key={m.id} value={m.id}>{m.designation} ({m.matricule})</option>)}
          </Select>
          <Input label="Type de maintenance" value={form.type_maintenance} onChange={(e) => setForm({ ...form, type_maintenance: e.target.value })} required />
          <Input label="Date prevue" type="datetime-local" value={form.date_prevue} onChange={(e) => setForm({ ...form, date_prevue: e.target.value })} required />
          <Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Button type="submit" className="w-full">Planifier</Button>
        </form>
      </Modal>
    </Layout>
  );
}
