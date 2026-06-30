import { useEffect, useState } from 'react';
import { Plus, ArrowRightLeft, CheckCircle, PenLine } from 'lucide-react';
import Layout from '../components/Layout';
import Button from '../components/Button';
import Input, { Select, Textarea } from '../components/Input';
import Badge from '../components/Badge';
import Modal, { EmptyState, LoadingSpinner, Alert } from '../components/Modal';
import SignaturePad from '../components/SignaturePad';
import { ExportBon } from '../components/ExportMenu';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { STATUT_AFFECTATION_LABELS, ETAT_LABELS, formatDate } from '../utils/labels';

const emptyForm = {
  materiel_id: '', lieu_id: '', beneficiaire: '', raison: '',
  document_reference: '', notes: '',
};

export default function Affectations() {
  const { canEdit } = useAuth();
  const [items, setItems] = useState([]);
  const [materiels, setMateriels] = useState([]);
  const [lieux, setLieux] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatut, setFilterStatut] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [sigModal, setSigModal] = useState(null);
  const [signataire, setSignataire] = useState('');

  const load = () => {
    setLoading(true);
    const params = filterStatut ? `?statut=${filterStatut}` : '';
    Promise.all([
      api.get(`/affectations${params}`),
      api.get('/materiels'),
      api.get('/lieux'),
    ])
      .then(([aff, mat, lieuxRes]) => {
        setItems(aff.data);
        setMateriels(
          mat.data.filter(
            (m) => ['disponible', 'neuf'].includes(m.etat) && (m.quantite ?? 1) > 0,
          ),
        );
        setLieux(lieuxRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filterStatut]);

  const openCreate = () => {
    setForm(emptyForm);
    setError('');
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/affectations', {
        ...form,
        materiel_id: parseInt(form.materiel_id),
        lieu_id: parseInt(form.lieu_id),
      });
      setModalOpen(false);
      load();
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const handleTerminer = async (id) => {
    if (!confirm('Terminer cette affectation ? Le materiel redeviendra disponible.')) return;
    try {
      await api.patch(`/affectations/${id}`, { statut: 'terminee' });
      load();
    } catch (err) {
      alert(err.response?.data?.detail || 'Erreur');
    }
  };

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSignature = async (data) => {
    if (!signataire.trim()) { alert('Indiquez le nom du signataire'); return; }
    await api.post(`/affectations/${sigModal}/signature`, { signature_data: data, signataire_nom: signataire });
    setSigModal(null);
    setSignataire('');
    load();
  };

  return (
    <Layout title="Affectations" subtitle="Suivi du materiel confie aux beneficiaires">
      {canEdit && (
        <div className="mb-6"><Button onClick={openCreate}><Plus size={18} /> Nouvelle affectation</Button></div>
      )}

      <div className="cro-card p-4 mb-6">
        <select value={filterStatut} onChange={(e) => setFilterStatut(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-cro-sand bg-white w-full sm:w-auto focus:border-cro-gold focus:outline-none">
          <option value="">Toutes les affectations</option>
          {Object.entries(STATUT_AFFECTATION_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {loading ? <LoadingSpinner /> : items.length === 0 ? (
        <EmptyState icon={ArrowRightLeft} title="Aucune affectation" description="Affectez du materiel a une structure."
          action={canEdit && <Button onClick={openCreate}><Plus size={18} /> Creer</Button>} />
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const statut = STATUT_AFFECTATION_LABELS[item.statut] || STATUT_AFFECTATION_LABELS.active;
            return (
              <div key={item.id} className="cro-card p-5">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-display font-bold text-cro-teal">{item.materiel?.designation}</h3>
                      <Badge variant={statut.variant}>{statut.label}</Badge>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-1 text-sm text-cro-muted">
                      <p>Matricule : {item.materiel?.matricule}</p>
                      <p>Lieu : {item.lieu?.nom}</p>
                      <p>Beneficiaire : {item.beneficiaire}</p>
                      <p>Date : {formatDate(item.date_debut)}</p>
                    </div>
                    <p className="mt-2 text-sm bg-cro-cream rounded-lg p-3">{item.raison}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <ExportBon affectationId={item.id} />
                    {canEdit && item.statut === 'active' && (
                      <>
                        <Button variant="secondary" size="sm" onClick={() => setSigModal(item.id)}><PenLine size={16} /> Signer</Button>
                        <Button variant="secondary" size="sm" onClick={() => handleTerminer(item.id)}><CheckCircle size={16} /> Terminer</Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Nouvelle affectation" size="lg">
          {error && <Alert type="error" message={error} />}
          <form onSubmit={handleSave} className="space-y-4">
            <Select label="Materiel disponible" value={form.materiel_id} onChange={update('materiel_id')} required>
              <option value="">-- Choisir un materiel --</option>
              {materiels.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.designation} ({m.matricule}, {ETAT_LABELS[m.etat]?.label || m.etat}, stock: {m.quantite ?? 1})
                </option>
              ))}
            </Select>

            {materiels.length === 0 && (
              <Alert type="warning" message="Aucun materiel disponible. Ajoutez du materiel d'abord." />
            )}

            <Select label="Lieu d'affectation" value={form.lieu_id} onChange={update('lieu_id')} required>
              <option value="">-- Choisir un lieu --</option>
              {lieux.map((l) => (
                <option key={l.id} value={l.id}>{l.nom}</option>
              ))}
            </Select>

            <Input
              label="Beneficiaire"
              value={form.beneficiaire}
              onChange={update('beneficiaire')}
              required
              placeholder="Nom du beneficiaire ou responsable"
            />

            <Textarea
              label="Raison de l'affectation"
              value={form.raison}
              onChange={update('raison')}
              required
              placeholder="Ex: Equipement pour la salle informatique du lycee..."
            />

            <Input
              label="Reference document (optionnel)"
              value={form.document_reference}
              onChange={update('document_reference')}
              placeholder="N° bon de sortie, decision, etc."
            />

            <Textarea label="Notes (optionnel)" value={form.notes} onChange={update('notes')} />

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => setModalOpen(false)}>Annuler</Button>
              <Button type="submit" className="flex-1" loading={saving} disabled={materiels.length === 0}>Affecter</Button>
            </div>
          </form>
        </Modal>

      <Modal isOpen={!!sigModal} onClose={() => setSigModal(null)} title="Signature du beneficiaire">
        <Input label="Nom du signataire" value={signataire} onChange={(e) => setSignataire(e.target.value)} required />
        <SignaturePad onSave={handleSignature} onCancel={() => setSigModal(null)} />
      </Modal>
    </Layout>
  );
}
