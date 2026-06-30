import { useEffect, useState } from 'react';
import { Plus, Search, MapPin, Pencil, Trash2 } from 'lucide-react';
import Layout from '../components/Layout';
import Button from '../components/Button';
import Input, { Select, Textarea } from '../components/Input';
import Badge from '../components/Badge';
import Modal, { EmptyState, LoadingSpinner, Alert, DraftBanner } from '../components/Modal';
import ImportMenu from '../components/ImportMenu';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { TYPE_LIEU_LABELS } from '../utils/labels';
import { formatApiError } from '../utils/apiError';
import { useFormDraft, usePersistDraft } from '../utils/useFormDraft';

const emptyForm = {
  nom: '', type_lieu: 'autre', adresse: '', ville: '',
  responsable: '', telephone: '', email: '', notes: '',
};

export default function Lieux() {
  const { canEdit, isAdmin } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [typeOptions, setTypeOptions] = useState(Object.keys(TYPE_LIEU_LABELS));
  const { draftRestored, setDraftRestored, restoreDraft, discardDraft, draftKey } = useFormDraft('lieux');

  usePersistDraft(draftKey, form, modalOpen && !editItem);

  const load = () => {
    setLoading(true);
    const params = search ? `?search=${search}` : '';
    api.get(`/lieux${params}`)
      .then((res) => setItems(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    api.get('/lieux/types')
      .then((res) => setTypeOptions(res.data))
      .catch(() => setTypeOptions(Object.keys(TYPE_LIEU_LABELS)));
  }, []);

  useEffect(() => { load(); }, [search]);

  const openCreate = () => {
    setEditItem(null);
    setForm(restoreDraft(emptyForm));
    setError('');
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({
      nom: item.nom, type_lieu: item.type_lieu, adresse: item.adresse || '',
      ville: item.ville || '', responsable: item.responsable || '',
      telephone: item.telephone || '', email: item.email || '', notes: item.notes || '',
    });
    setError('');
    setModalOpen(true);
  };

  const sanitizeForm = () => ({
    nom: form.nom.trim(),
    type_lieu: form.type_lieu,
    adresse: form.adresse.trim() || null,
    ville: form.ville.trim() || null,
    responsable: form.responsable.trim() || null,
    telephone: form.telephone.trim() || null,
    email: form.email.trim() || null,
    notes: form.notes.trim() || null,
  });

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = sanitizeForm();
      if (editItem) {
        await api.patch(`/lieux/${editItem.id}`, payload);
      } else {
        await api.post('/lieux', payload);
        discardDraft();
      }
      setModalOpen(false);
      load();
    } catch (err) {
      setError(formatApiError(err, 'Erreur lors de l\'enregistrement'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer ce lieu ?')) return;
    try {
      await api.delete(`/lieux/${id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.detail || 'Erreur');
    }
  };

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Lieux d'affectation</h1>
            <p className="text-slate-500">Lycees, hopitaux, services et autres structures</p>
          </div>
          {canEdit && (
            <div className="flex flex-wrap gap-2">
              <ImportMenu
                importUrl="/lieux/import"
                templateUrl="/exports/lieux/template"
                templateName="modele_import_lieux.xlsx"
                onSuccess={load}
              />
              <Button onClick={openCreate} size="lg">
                <Plus size={20} /> Ajouter un lieu
              </Button>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mb-6">
          <div className="relative">
            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher un lieu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-slate-200 focus:border-cro-blue focus:outline-none"
            />
          </div>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : items.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
            <EmptyState
              icon={MapPin}
              title="Aucun lieu"
              description="Ajoutez les lycees, hopitaux et autres structures beneficiaires."
              action={canEdit && <Button onClick={openCreate}><Plus size={20} /> Ajouter</Button>}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {items.map((item) => (
              <div key={item.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-lg text-slate-800">{item.nom}</h3>
                    {item.ville && <p className="text-slate-500">{item.ville}</p>}
                  </div>
                  <Badge variant="gold">{TYPE_LIEU_LABELS[item.type_lieu] || item.type_lieu}</Badge>
                </div>

                <div className="space-y-1 text-sm text-slate-600 mb-4">
                  {item.adresse && <p>{item.adresse}</p>}
                  {item.responsable && <p><span className="font-medium">Responsable :</span> {item.responsable}</p>}
                  {item.telephone && <p><span className="font-medium">Tel :</span> {item.telephone}</p>}
                </div>

                {canEdit && (
                  <div className="flex gap-2 pt-3 border-t border-slate-100">
                    <Button variant="secondary" size="sm" className="flex-1" onClick={() => openEdit(item)}>
                      <Pencil size={16} /> Modifier
                    </Button>
                    {isAdmin && (
                      <Button variant="danger" size="sm" onClick={() => handleDelete(item.id)}>
                        <Trash2 size={16} />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Modifier le lieu' : 'Nouveau lieu'} size="lg">
          <DraftBanner show={draftRestored && !editItem} onDismiss={() => setDraftRestored(false)} />
          {error && <Alert type="error" message={error} />}
          <form onSubmit={handleSave} className="space-y-4">
            <Input label="Nom du lieu" value={form.nom} onChange={update('nom')} required placeholder="Ex: Lycee Bilingue de Bafoussam" />
            <Select label="Type de lieu" value={form.type_lieu} onChange={update('type_lieu')}>
              {typeOptions.map((k) => (
                <option key={k} value={k}>{TYPE_LIEU_LABELS[k] || k}</option>
              ))}
            </Select>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Ville" value={form.ville} onChange={update('ville')} />
              <Input label="Responsable" value={form.responsable} onChange={update('responsable')} />
            </div>
            <Input label="Adresse" value={form.adresse} onChange={update('adresse')} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Telephone" value={form.telephone} onChange={update('telephone')} />
              <Input label="Email" type="text" value={form.email} onChange={update('email')} placeholder="Optionnel" />
            </div>
            <Textarea label="Notes" value={form.notes} onChange={update('notes')} />
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => setModalOpen(false)}>Annuler</Button>
              <Button type="submit" className="flex-1" loading={saving}>Enregistrer</Button>
            </div>
          </form>
        </Modal>
      </div>
    </Layout>
  );
}
