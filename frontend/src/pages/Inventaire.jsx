import { useEffect, useState } from 'react';
import { Plus, CheckCircle, AlertTriangle } from 'lucide-react';
import Layout from '../components/Layout';
import Button from '../components/Button';
import Input from '../components/Input';
import Modal, { LoadingSpinner, Alert } from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function InventairePage() {
  const { canEdit } = useAuth();
  const [inventaires, setInventaires] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ annee: new Date().getFullYear(), titre: '', notes: '' });

  const loadList = () => {
    api.get('/inventaires').then((r) => setInventaires(r.data)).finally(() => setLoading(false));
  };
  useEffect(() => { loadList(); }, []);

  const loadDetail = async (id) => {
    setSelected(id);
    const res = await api.get(`/inventaires/${id}`);
    setDetail(res.data);
  };

  const create = async (e) => {
    e.preventDefault();
    await api.post('/inventaires', form);
    setModal(false);
    loadList();
  };

  const updateLigne = async (ligneId, data) => {
    await api.patch(`/inventaires/${selected}/lignes/${ligneId}`, data);
    loadDetail(selected);
  };

  const cloturer = async () => {
    if (!confirm('Cloturer cet inventaire ?')) return;
    await api.post(`/inventaires/${selected}/cloturer`);
    loadList();
    loadDetail(selected);
  };

  return (
    <Layout title="Inventaire annuel" subtitle="Campagnes de comptage et detection des ecarts">
      {canEdit && (
        <div className="mb-6">
          <Button onClick={() => setModal(true)}><Plus size={18} /> Nouvel inventaire</Button>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="space-y-2">
          {loading ? <LoadingSpinner /> : inventaires.map((inv) => (
            <button key={inv.id} onClick={() => loadDetail(inv.id)}
              className={`w-full text-left cro-card p-4 transition-all ${selected === inv.id ? 'ring-2 ring-cro-gold' : ''}`}>
              <p className="font-display font-bold text-cro-teal">{inv.titre}</p>
              <p className="text-sm text-cro-muted">Annee {inv.annee} — {inv.statut}</p>
            </button>
          ))}
        </div>

        <div className="lg:col-span-2">
          {!detail ? (
            <p className="text-cro-muted text-center py-16">Selectionnez un inventaire</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-4 mb-4">
                <div className="cro-stat-card p-4 flex-1 min-w-[100px] text-center">
                  <p className="text-2xl font-bold text-cro-teal">{detail.stats.total}</p>
                  <p className="text-xs text-cro-muted">Total</p>
                </div>
                <div className="cro-stat-card p-4 flex-1 min-w-[100px] text-center">
                  <p className="text-2xl font-bold text-emerald-600">{detail.stats.comptes}</p>
                  <p className="text-xs text-cro-muted">Comptes</p>
                </div>
                <div className="cro-stat-card p-4 flex-1 min-w-[100px] text-center">
                  <p className="text-2xl font-bold text-red-600">{detail.stats.ecarts}</p>
                  <p className="text-xs text-cro-muted">Ecarts</p>
                </div>
              </div>

              {canEdit && detail.inventaire.statut === 'en_cours' && (
                <Button variant="gold" className="mb-4" onClick={cloturer}><CheckCircle size={16} /> Cloturer</Button>
              )}

              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {detail.lignes.map((l) => {
                  const ecart = l.present === false || (l.etat_constate && l.etat_constate !== l.etat_attendu);
                  return (
                    <div key={l.id} className={`cro-card p-4 ${ecart ? 'border-l-red-500' : ''}`}>
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <p className="font-semibold text-sm">{l.designation} <span className="text-cro-gold">({l.matricule})</span></p>
                          <p className="text-xs text-cro-muted">Attendu : {l.etat_attendu}</p>
                        </div>
                        {ecart && <AlertTriangle size={16} className="text-red-500 shrink-0" />}
                      </div>
                      {canEdit && detail.inventaire.statut === 'en_cours' && (
                        <div className="flex gap-2 mt-3">
                          <button onClick={() => updateLigne(l.id, { present: true, etat_constate: l.etat_attendu })}
                            className="flex-1 py-1.5 text-xs rounded-lg bg-emerald-100 text-emerald-800 font-semibold">Present</button>
                          <button onClick={() => updateLigne(l.id, { present: false })}
                            className="flex-1 py-1.5 text-xs rounded-lg bg-red-100 text-red-800 font-semibold">Absent</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      <Modal isOpen={modal} onClose={() => setModal(false)} title="Nouvel inventaire annuel">
        <form onSubmit={create} className="space-y-4">
          <Input label="Annee" type="number" value={form.annee} onChange={(e) => setForm({ ...form, annee: parseInt(e.target.value) })} required />
          <Input label="Titre" value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} required placeholder="Inventaire annuel 2026" />
          <Input label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <Button type="submit" className="w-full">Demarrer l'inventaire</Button>
        </form>
      </Modal>
    </Layout>
  );
}
