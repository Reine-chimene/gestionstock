import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, PackageMinus, ExternalLink } from 'lucide-react';
import Layout from '../components/Layout';
import Button from '../components/Button';
import Input, { Select, Textarea } from '../components/Input';
import Badge from '../components/Badge';
import Modal, { EmptyState, LoadingSpinner, Alert } from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { TYPE_DESTOCKAGE_LABELS, ETAT_LABELS, formatDate } from '../utils/labels';

const emptyForm = {
  materiel_id: '',
  type_destockage: 'reforme',
  quantite: '1',
  motif: '',
  document_reference: '',
  notes: '',
  valeur_residuelle: '',
};

const DESTOCKE_ETATS = ['reforme', 'hors_service'];

const isDestockable = (m) => (m.quantite ?? 1) > 0 && !DESTOCKE_ETATS.includes(m.etat);

export default function Destockage() {
  const { canEdit } = useAuth();
  const [items, setItems] = useState([]);
  const [materiels, setMateriels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    const params = filterType ? `?type_destockage=${filterType}` : '';
    Promise.all([api.get(`/destockage${params}`), api.get('/materiels')])
      .then(([dest, mat]) => {
        setItems(dest.data);
        setMateriels(mat.data.filter(isDestockable));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filterType]);

  const openCreate = () => {
    setForm(emptyForm);
    setError('');
    setModalOpen(true);
  };

  const handleMaterielChange = (e) => {
    const materielId = e.target.value;
    setForm((prev) => ({
      ...prev,
      materiel_id: materielId,
      quantite: '1',
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/destockage', {
        materiel_id: parseInt(form.materiel_id, 10),
        type_destockage: form.type_destockage,
        quantite: parseInt(form.quantite, 10) || 1,
        motif: form.motif,
        document_reference: form.document_reference || null,
        notes: form.notes || null,
        valeur_residuelle: form.valeur_residuelle ? parseFloat(form.valeur_residuelle) : null,
      });
      setModalOpen(false);
      load();
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur lors du destockage');
    } finally {
      setSaving(false);
    }
  };

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const selectedMateriel = materiels.find((m) => String(m.id) === String(form.materiel_id));
  const stockDisponible = selectedMateriel?.quantite ?? 0;
  const quantiteDemandee = parseInt(form.quantite, 10) || 0;
  const destockTotal = selectedMateriel && quantiteDemandee >= stockDisponible;
  const targetEtat = ['casse', 'perte', 'vol'].includes(form.type_destockage) ? 'hors_service' : 'reforme';
  const targetLabel = ETAT_LABELS[targetEtat]?.label || targetEtat;

  return (
    <Layout title="Destockage" subtitle="Sortie definitive du materiel du patrimoine actif">
      {canEdit && (
        <div className="mb-6">
          <Button onClick={openCreate}><Plus size={18} /> Nouveau destockage</Button>
        </div>
      )}

      <div className="cro-card p-4 mb-6 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-cro-sand bg-white w-full sm:w-auto focus:border-cro-gold focus:outline-none">
          <option value="">Toutes les operations</option>
          {Object.entries(TYPE_DESTOCKAGE_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <p className="text-sm text-cro-muted">{items.length} operation(s) enregistree(s)</p>
      </div>

      {loading ? <LoadingSpinner /> : items.length === 0 ? (
        <EmptyState
          icon={PackageMinus}
          title="Aucun destockage"
          description="Enregistrez la sortie du materiel reforme, vendu, casse ou perdu."
          action={canEdit && <Button onClick={openCreate}><Plus size={18} /> Destocker</Button>}
        />
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const typeInfo = TYPE_DESTOCKAGE_LABELS[item.type_destockage] || TYPE_DESTOCKAGE_LABELS.autre;
            const etatInfo = ETAT_LABELS[item.nouveau_etat] || ETAT_LABELS.reforme;
            return (
              <div key={item.id} className="cro-card p-5">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <Badge variant={typeInfo.variant}>{typeInfo.label}</Badge>
                      <Badge variant={etatInfo.variant}>{etatInfo.label}</Badge>
                      <span className="text-xs text-cro-muted">{formatDate(item.date_operation)}</span>
                    </div>
                    <h3 className="font-semibold text-cro-ink">
                      {item.materiel?.designation || `Materiel #${item.materiel_id}`}
                    </h3>
                    <p className="text-sm text-cro-muted mt-1">
                      Matricule {item.materiel?.matricule || '—'} — quantite : {item.quantite} — etait {ETAT_LABELS[item.ancien_etat]?.label || item.ancien_etat}
                    </p>
                    <p className="text-sm mt-3 bg-cro-cream rounded-lg p-3">{item.motif}</p>
                    {item.document_reference && (
                      <p className="text-xs text-cro-muted mt-2">Ref. : {item.document_reference}</p>
                    )}
                    {item.valeur_residuelle != null && (
                      <p className="text-xs text-cro-muted mt-1">Valeur residuelle : {item.valeur_residuelle} FCFA</p>
                    )}
                  </div>
                  {item.materiel && (
                    <Link to={`/materiels/${item.materiel_id}`} className="btn btn-ghost btn-sm shrink-0">
                      <ExternalLink size={16} /> Fiche materiel
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Destocker un materiel">
        {error && <Alert type="error" message={error} onClose={() => setError('')} />}
        <form onSubmit={handleSave} className="section-gap">
          <Select label="Materiel" value={form.materiel_id} onChange={handleMaterielChange} required>
            <option value="">Selectionner un materiel</option>
            {materiels.map((m) => (
              <option key={m.id} value={m.id}>
                {m.matricule} — {m.designation} (stock: {m.quantite ?? 1}, {ETAT_LABELS[m.etat]?.label || m.etat})
              </option>
            ))}
          </Select>

          {selectedMateriel && (
            <Input
              label={`Quantite a destocker (stock disponible : ${stockDisponible})`}
              type="number"
              min="1"
              max={stockDisponible}
              value={form.quantite}
              onChange={update('quantite')}
              required
            />
          )}

          <Select label="Type de destockage" value={form.type_destockage} onChange={update('type_destockage')} required>
            {Object.entries(TYPE_DESTOCKAGE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </Select>

          {selectedMateriel && (
            <p className="text-sm bg-amber-50 border border-amber-100 rounded-xl p-3 text-amber-900">
              {destockTotal ? (
                <>
                  Destockage total : le materiel passera a l&apos;etat <strong>{targetLabel}</strong>.
                  Les affectations et maintenances actives seront cloturees.
                </>
              ) : (
                <>
                  Destockage partiel de <strong>{quantiteDemandee || '?'}</strong> unite(s).
                  Il restera <strong>{Math.max(stockDisponible - quantiteDemandee, 0)}</strong> en stock — l&apos;etat ne change pas.
                </>
              )}
            </p>
          )}

          <Textarea label="Motif" value={form.motif} onChange={update('motif')} placeholder="Raison detaillee du destockage..." required rows={3} />
          <Input label="Reference document" value={form.document_reference} onChange={update('document_reference')} placeholder="PV, bon de sortie, facture..." />
          <Input label="Valeur residuelle (FCFA)" type="number" min="0" value={form.valeur_residuelle} onChange={update('valeur_residuelle')} placeholder="Optionnel" />
          <Textarea label="Notes" value={form.notes} onChange={update('notes')} rows={2} />

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Annuler</Button>
            <Button type="submit" loading={saving} className="flex-1">Confirmer le destockage</Button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
}
