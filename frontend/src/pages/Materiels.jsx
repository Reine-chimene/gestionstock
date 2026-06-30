import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Search, Package, Pencil, Trash2, ExternalLink } from 'lucide-react';
import Layout from '../components/Layout';
import Button from '../components/Button';
import Input, { Select, Textarea, SearchInput } from '../components/Input';
import Badge from '../components/Badge';
import Modal, { EmptyState, LoadingSpinner, Alert, DraftBanner } from '../components/Modal';
import ExportMenu from '../components/ExportMenu';
import ImportMenu from '../components/ImportMenu';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { ETAT_LABELS, CATEGORIE_LABELS, formatDate } from '../utils/labels';
import { useFormDraft, usePersistDraft } from '../utils/useFormDraft';

const emptyForm = {
  designation: '', categorie: 'autre', marque: '', modele: '',
  numero_serie: '', matricule: '', etat: 'neuf', quantite: '1', seuil_alerte: '',
  valeur_acquisition: '', caracteristiques: '', notes: '',
};

export default function Materiels() {
  const { canEdit, isAdmin } = useAuth();
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterEtat, setFilterEtat] = useState(searchParams.get('etat') || '');
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState(Object.keys(CATEGORIE_LABELS));
  const { draftRestored, setDraftRestored, restoreDraft, discardDraft, draftKey } = useFormDraft('materiels');

  usePersistDraft(draftKey, form, modalOpen && !editItem);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (filterEtat) params.set('etat', filterEtat);
    api.get(`/materiels?${params}`)
      .then((res) => setItems(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    api.get('/materiels/categories')
      .then((res) => setCategories(res.data))
      .catch(() => setCategories(Object.keys(CATEGORIE_LABELS)));
  }, []);

  useEffect(() => { load(); }, [search, filterEtat]);

  const openCreate = () => {
    setEditItem(null);
    setForm(restoreDraft(emptyForm));
    setError('');
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({
      designation: item.designation,
      categorie: item.categorie,
      marque: item.marque || '',
      modele: item.modele || '',
      numero_serie: item.numero_serie || '',
      matricule: item.matricule,
      etat: item.etat,
      quantite: String(item.quantite ?? 1),
      seuil_alerte: item.seuil_alerte != null ? String(item.seuil_alerte) : '',
      valeur_acquisition: item.valeur_acquisition || '',
      caracteristiques: item.caracteristiques || '',
      notes: item.notes || '',
    });
    setError('');
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        quantite: parseInt(form.quantite, 10) || 1,
        seuil_alerte: form.seuil_alerte !== '' ? parseInt(form.seuil_alerte, 10) : null,
        valeur_acquisition: form.valeur_acquisition ? parseFloat(form.valeur_acquisition) : null,
      };
      if (editItem) {
        await api.patch(`/materiels/${editItem.id}`, payload);
      } else {
        await api.post('/materiels', payload);
        discardDraft();
      }
      setModalOpen(false);
      load();
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer ce materiel ?')) return;
    try {
      await api.delete(`/materiels/${id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.detail || 'Erreur');
    }
  };

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  return (
    <Layout title="Materiel" subtitle="Inventaire du patrimoine du CRO">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex flex-wrap gap-2">
          <ExportMenu baseUrl="/exports/materiels" name="inventaire_materiel" />
          {canEdit && (
            <ImportMenu
              importUrl="/materiels/import"
              templateUrl="/exports/materiels/template"
              templateName="modele_import_materiels.xlsx"
              onSuccess={load}
            />
          )}
        </div>
        {canEdit && (
          <Button onClick={openCreate} className="sm:ml-auto"><Plus size={18} /> Ajouter</Button>
        )}
      </div>

      <div className="toolbar mb-6">
        <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nom, matricule, n° serie..." />
        <select value={filterEtat} onChange={(e) => setFilterEtat(e.target.value)} className="filter-select">
          <option value="">Tous les etats</option>
          {Object.entries(ETAT_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {loading ? <LoadingSpinner /> : items.length === 0 ? (
        <EmptyState icon={Package} title="Aucun materiel" description="Ajoutez du materiel a l'inventaire."
          action={canEdit && <Button onClick={openCreate}><Plus size={18} /> Ajouter</Button>} />
      ) : (
        <div className="grid-cards">
          {items.map((item) => {
            const etat = ETAT_LABELS[item.etat] || ETAT_LABELS.disponible;
            return (
              <div key={item.id} className="card-interactive card-body">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <Link to={`/materiels/${item.id}`} className="font-display font-bold text-cro-teal hover:text-cro-gold transition-colors">{item.designation}</Link>
                    <p className="text-cro-gold font-semibold text-sm">{item.matricule}</p>
                  </div>
                  <Badge variant={etat.variant}>{etat.label}</Badge>
                </div>
                <div className="text-sm text-cro-muted space-y-1 mb-4">
                  <p>{CATEGORIE_LABELS[item.categorie]}</p>
                  <p>Quantite : <strong>{item.quantite ?? 1}</strong></p>
                  {item.numero_serie && <p>N° {item.numero_serie}</p>}
                </div>
                <div className="flex gap-2 pt-3 border-t border-cro-sand">
                  <Link to={`/materiels/${item.id}`} className="flex-1"><Button variant="secondary" size="sm" className="w-full"><ExternalLink size={14} /> Fiche</Button></Link>
                  {canEdit && <Button variant="secondary" size="sm" onClick={() => openEdit(item)}><Pencil size={14} /></Button>}
                  {isAdmin && <Button variant="danger" size="sm" onClick={() => handleDelete(item.id)}><Trash2 size={14} /></Button>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Modifier' : 'Nouveau materiel'} size="lg">
          <DraftBanner show={draftRestored && !editItem} onDismiss={() => setDraftRestored(false)} />
          {error && <Alert type="error" message={error} />}
          <form onSubmit={handleSave} className="space-y-4">
            <Input label="Designation" value={form.designation} onChange={update('designation')} required />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select label="Categorie" value={form.categorie} onChange={update('categorie')}>
                {categories.map((k) => (
                  <option key={k} value={k}>{CATEGORIE_LABELS[k] || k}</option>
                ))}
              </Select>
              <Select label="Etat" value={form.etat} onChange={update('etat')}>
                {Object.entries(ETAT_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Matricule" value={form.matricule} onChange={update('matricule')} required disabled={!!editItem} />
              <Input label="Quantite en stock" type="number" min="1" value={form.quantite} onChange={update('quantite')} required />
              <Input label="Seuil d'alerte stock (optionnel)" type="number" min="0" value={form.seuil_alerte} onChange={update('seuil_alerte')} hint="Alerte email/SMS quand le stock atteint ce niveau" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Numero de serie" value={form.numero_serie} onChange={update('numero_serie')} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Marque" value={form.marque} onChange={update('marque')} />
              <Input label="Modele" value={form.modele} onChange={update('modele')} />
            </div>
            <Input label="Valeur d'acquisition (FCFA)" type="number" value={form.valeur_acquisition} onChange={update('valeur_acquisition')} />
            <Textarea label="Caracteristiques" value={form.caracteristiques} onChange={update('caracteristiques')} placeholder="Processeur, RAM, dimensions, etc." />
            <Textarea label="Notes" value={form.notes} onChange={update('notes')} />
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => setModalOpen(false)}>Annuler</Button>
              <Button type="submit" className="flex-1" loading={saving}>Enregistrer</Button>
            </div>
          </form>
        </Modal>
    </Layout>
  );
}
