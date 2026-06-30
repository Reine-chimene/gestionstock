import { useEffect, useState } from 'react';
import { Plus, ArrowRightLeft, CheckCircle, PenLine, Camera, Paperclip, Download } from 'lucide-react';
import Layout from '../components/Layout';
import Button from '../components/Button';
import Input, { Select, Textarea } from '../components/Input';
import Badge from '../components/Badge';
import Modal, { EmptyState, LoadingSpinner, Alert, DraftBanner } from '../components/Modal';
import SignaturePad from '../components/SignaturePad';
import ExportMenu, { ExportBon } from '../components/ExportMenu';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { STATUT_AFFECTATION_LABELS, ETAT_LABELS, formatDate } from '../utils/labels';
import { formatApiError } from '../utils/apiError';
import { validateFileSize, UPLOAD_HINT, downloadStatic } from '../utils/fileUpload';
import { useFormDraft, usePersistDraft } from '../utils/useFormDraft';

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
  const [detailItem, setDetailItem] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const { draftRestored, setDraftRestored, restoreDraft, discardDraft, draftKey } = useFormDraft('affectations');

  usePersistDraft(draftKey, form, modalOpen);

  const loadMaterielsAffectables = () =>
    api.get('/materiels/affectables')
      .then((res) => setMateriels(res.data))
      .catch(() => setMateriels([]));

  const load = () => {
    setLoading(true);
    const params = filterStatut ? `?statut=${filterStatut}` : '';
    Promise.allSettled([
      api.get(`/affectations${params}`),
      api.get('/materiels/affectables'),
      api.get('/lieux'),
    ])
      .then(([aff, mat, lieuxRes]) => {
        if (aff.status === 'fulfilled') setItems(aff.value.data);
        else setItems([]);
        if (mat.status === 'fulfilled') setMateriels(mat.value.data);
        if (lieuxRes.status === 'fulfilled') setLieux(lieuxRes.value.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filterStatut]);

  const openCreate = async () => {
    setForm(restoreDraft(emptyForm));
    setError('');
    await loadMaterielsAffectables();
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/affectations', {
        ...form,
        materiel_id: parseInt(form.materiel_id, 10),
        lieu_id: parseInt(form.lieu_id, 10),
      });
      discardDraft();
      setModalOpen(false);
      load();
    } catch (err) {
      setError(formatApiError(err, 'Erreur lors de l\'affectation'));
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
      alert(formatApiError(err, 'Erreur'));
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

  const uploadDocument = async (affectationId, e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const sizeErr = validateFileSize(file);
    if (sizeErr) {
      setUploadError(sizeErr);
      return;
    }
    setUploadError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('caption', file.name);
      await api.post(`/affectations/${affectationId}/documents`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      load();
      if (detailItem?.id === affectationId) {
        const res = await api.get(`/affectations/${affectationId}`);
        setDetailItem(res.data);
      }
    } catch (err) {
      setUploadError(formatApiError(err, 'Erreur upload'));
    }
  };

  return (
    <Layout title="Affectations" subtitle="Suivi du materiel confie aux beneficiaires">
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <ExportMenu baseUrl="/exports/affectations" name="affectations" />
        {canEdit && (
          <Button onClick={openCreate}><Plus size={18} /> Nouvelle affectation</Button>
        )}
      </div>

      {uploadError && <Alert type="error" message={uploadError} onClose={() => setUploadError('')} />}

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
                    <Button variant="secondary" size="sm" onClick={() => setDetailItem(item)}><Paperclip size={14} /> Pieces</Button>
                    <ExportBon affectationId={item.id} />
                    {canEdit && item.statut === 'active' && (
                      <>
                        <label className="btn btn-secondary btn-sm cursor-pointer">
                          <Camera size={14} />
                          <input type="file" accept="image/*,application/pdf" capture="environment" className="hidden" onChange={(e) => uploadDocument(item.id, e)} />
                        </label>
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
          <DraftBanner show={draftRestored} onDismiss={() => setDraftRestored(false)} />
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
              <Alert type="warning" message="Aucun materiel disponible (etat Neuf ou Disponible, stock > 0). Verifiez la fiche materiel ou terminez une affectation active." />
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

      <Modal isOpen={!!detailItem} onClose={() => setDetailItem(null)} title="Pieces jointes" size="lg">
        {detailItem && (
          <div className="space-y-4">
            <p className="text-sm text-cro-muted">Affectation #{detailItem.id} — {detailItem.materiel?.designation}</p>
            {detailItem.documents?.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {detailItem.documents.map((d) => (
                  <div key={d.id} className="cro-card p-3 text-sm flex flex-col gap-2">
                    <span className="truncate">{d.caption || 'Document'}</span>
                    <div className="flex gap-2">
                      <a href={d.url} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm flex-1 text-center">Voir</a>
                      <Button variant="gold" size="sm" onClick={() => downloadStatic(d.url, d.caption || `doc_${d.id}`)}>
                        <Download size={14} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-cro-muted text-sm">Aucune piece jointe (decision, bon signe, facture...)</p>
            )}
            {canEdit && (
              <label className="btn btn-secondary w-full cursor-pointer justify-center">
                <Camera size={16} /> Ajouter un document
                <input type="file" accept="image/*,application/pdf" capture="environment" className="hidden" onChange={(e) => uploadDocument(detailItem.id, e)} />
              </label>
            )}
            <p className="text-xs text-cro-muted text-center">{UPLOAD_HINT}</p>
          </div>
        )}
      </Modal>

      <Modal isOpen={!!sigModal} onClose={() => setSigModal(null)} title="Signature du beneficiaire">
        <Input label="Nom du signataire" value={signataire} onChange={(e) => setSignataire(e.target.value)} required />
        <SignaturePad onSave={handleSignature} onCancel={() => setSigModal(null)} />
      </Modal>
    </Layout>
  );
}
