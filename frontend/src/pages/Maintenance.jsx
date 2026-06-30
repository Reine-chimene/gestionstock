import { useEffect, useState } from 'react';
import { Plus, Wrench, Bell, Pencil, Trash2, PenLine, Camera } from 'lucide-react';
import Layout from '../components/Layout';
import Button from '../components/Button';
import Input, { Select, Textarea } from '../components/Input';
import Modal, { LoadingSpinner, Alert } from '../components/Modal';
import SignaturePad from '../components/SignaturePad';
import Badge from '../components/Badge';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { TYPE_MAINTENANCE_LABELS, formatDate } from '../utils/labels';
import { formatApiError } from '../utils/apiError';

const emptyForm = { materiel_id: '', type_maintenance: 'preventive', description: '', date_prevue: '', rappel_jours: 7 };

export default function MaintenancePage() {
  const { canEdit } = useAuth();
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState(Object.keys(TYPE_MAINTENANCE_LABELS));
  const [materiels, setMateriels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [sigModal, setSigModal] = useState(null);
  const [signataire, setSignataire] = useState('');
  const [detailModal, setDetailModal] = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get('/maintenance'),
      api.get('/materiels'),
      api.get('/maintenance/categories').catch(() => ({ data: Object.keys(TYPE_MAINTENANCE_LABELS) })),
    ])
      .then(([m, mat, cat]) => {
        setItems(m.data);
        setMateriels(mat.data);
        setCategories(cat.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditItem(null);
    setForm(emptyForm);
    setError('');
    setModal(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({
      materiel_id: String(item.materiel_id),
      type_maintenance: item.type_maintenance,
      description: item.description || '',
      date_prevue: item.date_prevue ? item.date_prevue.slice(0, 16) : '',
      rappel_jours: item.rappel_jours || 7,
    });
    setError('');
    setModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const payload = {
        ...form,
        materiel_id: parseInt(form.materiel_id, 10),
        date_prevue: new Date(form.date_prevue).toISOString(),
        rappel_jours: parseInt(form.rappel_jours, 10) || 7,
      };
      if (editItem) {
        await api.patch(`/maintenance/${editItem.id}`, {
          type_maintenance: payload.type_maintenance,
          description: payload.description,
          date_prevue: payload.date_prevue,
          rappel_jours: payload.rappel_jours,
        });
      } else {
        await api.post('/maintenance', payload);
      }
      setModal(false);
      load();
    } catch (err) {
      setError(formatApiError(err, 'Erreur'));
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cette maintenance ?')) return;
    await api.delete(`/maintenance/${id}`);
    load();
  };

  const checkAlertes = async () => {
    const res = await api.post('/maintenance/check-alertes');
    setMsg(`${res.data.alertes_envoyees} alerte(s) envoyee(s)`);
  };

  const uploadCapture = async (maintenanceId, e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('caption', file.name);
    await api.post(`/maintenance/${maintenanceId}/documents`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    load();
    if (detailModal?.id === maintenanceId) {
      const res = await api.get(`/maintenance/${maintenanceId}`);
      setDetailModal(res.data);
    }
  };

  const handleSignature = async (dataUrl) => {
    await api.post(`/maintenance/${sigModal.id}/signature`, {
      signature_data: dataUrl,
      signataire_nom: signataire,
    });
    setSigModal(null);
    setSignataire('');
    load();
  };

  const statutVariant = (s) => {
    if (s === 'terminee') return 'success';
    if (s === 'en_cours') return 'teal';
    if (s === 'annulee') return 'error';
    return 'warning';
  };

  return (
    <Layout title="Maintenance" subtitle="Planification, fiches signees et captures">
      <div className="flex flex-wrap gap-3 mb-6">
        {canEdit && (
          <>
            <Button onClick={openCreate}><Plus size={18} /> Planifier</Button>
            <Button variant="gold" onClick={checkAlertes}><Bell size={18} /> Alertes</Button>
          </>
        )}
      </div>
      {msg && <Alert type="success" message={msg} onClose={() => setMsg('')} />}

      {loading ? <LoadingSpinner /> : (
        <div className="space-y-3">
          {items.map((m) => (
            <div key={m.id} className="cro-card p-4 sm:p-5">
              <div className="flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-cro-teal truncate">{m.materiel_designation}</p>
                    <p className="text-sm text-cro-gold">{m.matricule}</p>
                    <p className="text-sm text-cro-muted mt-1">
                      {TYPE_MAINTENANCE_LABELS[m.type_maintenance] || m.type_maintenance} — {formatDate(m.date_prevue)}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge variant={statutVariant(m.statut)}>{m.statut}</Badge>
                      {m.has_signature && <Badge variant="success">Signee</Badge>}
                      {m.documents?.length > 0 && <Badge variant="teal">{m.documents.length} capture(s)</Badge>}
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex flex-wrap gap-2 shrink-0">
                      <Button variant="secondary" size="sm" onClick={() => setDetailModal(m)}>Detail</Button>
                      {m.statut !== 'terminee' && (
                        <>
                          <Button variant="secondary" size="sm" onClick={() => openEdit(m)}><Pencil size={14} /></Button>
                          <Button variant="gold" size="sm" onClick={() => { setSigModal(m); setSignataire(''); }}>
                            <PenLine size={14} /> Signer
                          </Button>
                          <label className="btn btn-secondary btn-sm cursor-pointer">
                            <Camera size={14} />
                            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => uploadCapture(m.id, e)} />
                          </label>
                          <Button variant="danger" size="sm" onClick={() => handleDelete(m.id)}><Trash2 size={14} /></Button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          {items.length === 0 && <p className="text-center text-cro-muted py-12">Aucune maintenance planifiee</p>}
        </div>
      )}

      <Modal isOpen={modal} onClose={() => setModal(false)} title={editItem ? 'Modifier' : 'Planifier une maintenance'}>
        {error && <Alert type="error" message={error} />}
        <form onSubmit={handleSave} className="space-y-4">
          {!editItem && (
            <Select label="Materiel" value={form.materiel_id} onChange={(e) => setForm({ ...form, materiel_id: e.target.value })} required>
              <option value="">Choisir...</option>
              {materiels.map((m) => <option key={m.id} value={m.id}>{m.designation} ({m.matricule})</option>)}
            </Select>
          )}
          <Select label="Categorie" value={form.type_maintenance} onChange={(e) => setForm({ ...form, type_maintenance: e.target.value })} required>
            {categories.map((c) => (
              <option key={c} value={c}>{TYPE_MAINTENANCE_LABELS[c] || c}</option>
            ))}
          </Select>
          <Input label="Date prevue" type="datetime-local" value={form.date_prevue} onChange={(e) => setForm({ ...form, date_prevue: e.target.value })} required />
          <Textarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Input label="Rappel (jours avant)" type="number" min="1" value={form.rappel_jours} onChange={(e) => setForm({ ...form, rappel_jours: e.target.value })} />
          <Button type="submit" className="w-full">{editItem ? 'Enregistrer' : 'Planifier'}</Button>
        </form>
      </Modal>

      <Modal isOpen={!!detailModal} onClose={() => setDetailModal(null)} title="Fiche maintenance" size="lg">
        {detailModal && (
          <div className="space-y-4">
            <p><strong>Materiel :</strong> {detailModal.materiel_designation} ({detailModal.matricule})</p>
            <p><strong>Categorie :</strong> {TYPE_MAINTENANCE_LABELS[detailModal.type_maintenance] || detailModal.type_maintenance}</p>
            <p><strong>Description :</strong> {detailModal.description || '—'}</p>
            {detailModal.signataire_nom && (
              <p><strong>Signee par :</strong> {detailModal.signataire_nom} — {formatDate(detailModal.date_signature)}</p>
            )}
            {detailModal.documents?.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {detailModal.documents.map((d) => (
                  <a key={d.id} href={d.url} target="_blank" rel="noreferrer" className="block">
                    <img src={d.url} alt={d.caption} className="rounded-xl border border-cro-sand w-full h-28 object-cover" />
                    <p className="text-xs text-cro-muted mt-1 truncate">{d.caption}</p>
                  </a>
                ))}
              </div>
            )}
            {canEdit && detailModal.statut !== 'terminee' && (
              <label className="btn btn-secondary w-full cursor-pointer justify-center">
                <Camera size={16} /> Ajouter capture (facture, photo...)
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => uploadCapture(detailModal.id, e)} />
              </label>
            )}
          </div>
        )}
      </Modal>

      <Modal isOpen={!!sigModal} onClose={() => setSigModal(null)} title="Signer la fiche maintenance">
        <Input label="Nom du signataire" value={signataire} onChange={(e) => setSignataire(e.target.value)} required />
        <SignaturePad onSave={handleSignature} onCancel={() => setSigModal(null)} />
      </Modal>
    </Layout>
  );
}
