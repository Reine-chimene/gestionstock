import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { QrCode, History, Camera, ArrowLeft, PackageMinus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Button from '../components/Button';
import Input, { Select, Textarea } from '../components/Input';
import Badge from '../components/Badge';
import Modal, { LoadingSpinner, Alert } from '../components/Modal';
import { ExportBon } from '../components/ExportMenu';
import { ETAT_LABELS, CATEGORIE_LABELS, TYPE_DESTOCKAGE_LABELS, ACTION_LABELS, formatDate } from '../utils/labels';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function MaterielDetail() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { canEdit } = useAuth();
  const navigate = useNavigate();
  const [materiel, setMateriel] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [historique, setHistorique] = useState([]);
  const [affectations, setAffectations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [qrUrl, setQrUrl] = useState('');
  const [showQr, setShowQr] = useState(false);
  const [destockModal, setDestockModal] = useState(false);
  const [destockForm, setDestockForm] = useState({ type_destockage: 'reforme', quantite: '1', motif: '', document_reference: '', notes: '', valeur_residuelle: '' });
  const [destockError, setDestockError] = useState('');
  const [destockSaving, setDestockSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get(`/materiels/${id}`),
      api.get(`/materiels/${id}/photos`),
      api.get(`/materiels/${id}/historique`),
      api.get(`/affectations?materiel_id=${id}`),
    ]).then(([m, p, h, a]) => {
      setMateriel(m.data);
      setPhotos(p.data);
      setHistorique(h.data);
      setAffectations(a.data);
    }).finally(() => setLoading(false));

    if (searchParams.get('scan')) setShowQr(true);
  }, [id]);

  const loadQr = async () => {
    const res = await api.get(`/materiels/${id}/qr`, { responseType: 'blob' });
    setQrUrl(URL.createObjectURL(res.data));
    setShowQr(true);
  };

  const uploadPhoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    await api.post(`/materiels/${id}/photos`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    const res = await api.get(`/materiels/${id}/photos`);
    setPhotos(res.data);
  };

  if (loading) return <Layout><LoadingSpinner /></Layout>;
  if (!materiel) return <Layout><p>Materiel introuvable</p></Layout>;

  const etat = ETAT_LABELS[materiel.etat] || ETAT_LABELS.disponible;
  const canDestock = canEdit && (materiel.quantite ?? 1) > 0 && !['reforme', 'hors_service'].includes(materiel.etat);
  const destockTarget = ['casse', 'perte', 'vol'].includes(destockForm.type_destockage) ? 'hors_service' : 'reforme';
  const stockDisponible = materiel.quantite ?? 1;
  const quantiteDemandee = parseInt(destockForm.quantite, 10) || 0;
  const destockTotal = quantiteDemandee >= stockDisponible;

  const handleDestock = async (e) => {
    e.preventDefault();
    setDestockSaving(true);
    setDestockError('');
    try {
      await api.post('/destockage', {
        materiel_id: parseInt(id, 10),
        type_destockage: destockForm.type_destockage,
        quantite: parseInt(destockForm.quantite, 10) || 1,
        motif: destockForm.motif,
        document_reference: destockForm.document_reference || null,
        notes: destockForm.notes || null,
        valeur_residuelle: destockForm.valeur_residuelle ? parseFloat(destockForm.valeur_residuelle) : null,
      });
      setDestockModal(false);
      const res = await api.get(`/materiels/${id}`);
      setMateriel(res.data);
    } catch (err) {
      setDestockError(err.response?.data?.detail || 'Erreur');
    } finally {
      setDestockSaving(false);
    }
  };

  return (
    <Layout title={materiel.designation} subtitle={`Matricule ${materiel.matricule}`}>
      <Link to="/materiels" className="inline-flex items-center gap-1 text-cro-muted hover:text-cro-teal text-sm mb-4">
        <ArrowLeft size={16} /> Retour a la liste
      </Link>

      <div className="flex flex-wrap gap-2 mb-6">
        <Button variant="gold" size="sm" onClick={loadQr}><QrCode size={16} /> QR Code</Button>
        {canEdit && (
          <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cro-teal text-white text-sm font-semibold cursor-pointer">
            <Camera size={16} /> Photo
            <input type="file" accept="image/*" className="hidden" onChange={uploadPhoto} />
          </label>
        )}
        {canDestock && (
          <Button variant="danger" size="sm" onClick={() => { setDestockError(''); setDestockModal(true); }}>
            <PackageMinus size={16} /> Destocker
          </Button>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="cro-card p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="font-display font-bold text-cro-teal">Fiche materiel</h2>
              <Badge variant={etat.variant}>{etat.label}</Badge>
            </div>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <p><span className="text-cro-muted">Categorie :</span> {CATEGORIE_LABELS[materiel.categorie]}</p>
              <p><span className="text-cro-muted">Quantite en stock :</span> <strong>{materiel.quantite ?? 1}</strong>
                {materiel.seuil_alerte != null && materiel.quantite <= materiel.seuil_alerte && (
                  <span className="ml-2"><Badge variant="warning">Stock bas</Badge></span>
                )}
              </p>
              {materiel.seuil_alerte != null && (
                <p><span className="text-cro-muted">Seuil d'alerte :</span> {materiel.seuil_alerte}</p>
              )}
              <p><span className="text-cro-muted">N° serie :</span> {materiel.numero_serie || '—'}</p>
              <p><span className="text-cro-muted">Marque :</span> {materiel.marque || '—'} {materiel.modele}</p>
              <p><span className="text-cro-muted">Valeur :</span> {materiel.valeur_acquisition ? `${materiel.valeur_acquisition} FCFA` : '—'}</p>
            </div>
            {materiel.caracteristiques && (
              <p className="mt-4 text-sm bg-cro-cream rounded-lg p-3">{materiel.caracteristiques}</p>
            )}
          </div>

          {photos.length > 0 && (
            <div className="cro-card p-6">
              <h3 className="font-display font-bold text-cro-teal mb-3">Photos</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {photos.map((p) => (
                  <img key={p.id} src={p.url} alt={p.caption || 'Photo'} className="rounded-xl object-cover h-32 w-full border border-cro-sand" />
                ))}
              </div>
            </div>
          )}

          <div className="card-accent card-body">
            <h3 className="card-title mb-4 flex items-center gap-2"><History size={18} /> Historique complet</h3>
            <div>
              {historique.map((h) => (
                <div key={h.id} className="timeline-item">
                  <div className="timeline-dot" />
                  <div className="flex flex-wrap gap-2 mb-1">
                    <Badge variant="teal">{h.entity_type}</Badge>
                    <Badge variant="muted">{ACTION_LABELS[h.action] || h.action}</Badge>
                  </div>
                  <p className="timeline-text">{h.description}</p>
                  <p className="timeline-meta">{formatDate(h.created_at)} — {h.user_name || 'Systeme'}</p>
                </div>
              ))}
              {historique.length === 0 && <p className="text-cro-muted text-sm">Aucun historique</p>}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="cro-card p-5">
            <h3 className="font-display font-bold text-cro-teal mb-3">Affectations</h3>
            {affectations.slice(0, 5).map((a) => (
              <div key={a.id} className="py-2 border-b border-cro-sand last:border-0 text-sm">
                <p className="font-medium">{a.lieu?.nom}</p>
                <p className="text-cro-muted text-xs">{a.beneficiaire} — {a.statut}</p>
                {a.statut === 'active' && <ExportBon affectationId={a.id} />}
              </div>
            ))}
          </div>
        </div>
      </div>

      <Modal isOpen={showQr} onClose={() => setShowQr(false)} title="QR Code materiel">
        {qrUrl ? (
          <div className="text-center">
            <img src={qrUrl} alt="QR Code" className="mx-auto max-w-[250px]" />
            <p className="mt-3 text-cro-muted text-sm">Scannez pour acceder a la fiche {materiel.matricule}</p>
          </div>
        ) : <LoadingSpinner />}
      </Modal>

      <Modal isOpen={destockModal} onClose={() => setDestockModal(false)} title="Destocker ce materiel">
        {destockError && <Alert type="error" message={destockError} onClose={() => setDestockError('')} />}
        <form onSubmit={handleDestock} className="section-gap">
          <p className="text-sm bg-amber-50 border border-amber-100 rounded-xl p-3 text-amber-900 mb-4">
            Stock actuel : <strong>{stockDisponible}</strong>
            {destockTotal
              ? <> — destockage total, passage a l&apos;etat <strong>{ETAT_LABELS[destockTarget]?.label}</strong>.</>
              : <> — destockage partiel, le stock sera reduit.</>}
          </p>
          <Input
            label="Quantite a destocker"
            type="number"
            min="1"
            max={stockDisponible}
            value={destockForm.quantite}
            onChange={(e) => setDestockForm({ ...destockForm, quantite: e.target.value })}
            required
          />
          <Select label="Type" value={destockForm.type_destockage} onChange={(e) => setDestockForm({ ...destockForm, type_destockage: e.target.value })} required>
            {Object.entries(TYPE_DESTOCKAGE_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Select>
          <Textarea label="Motif" value={destockForm.motif} onChange={(e) => setDestockForm({ ...destockForm, motif: e.target.value })} required rows={3} />
          <Input label="Reference document" value={destockForm.document_reference} onChange={(e) => setDestockForm({ ...destockForm, document_reference: e.target.value })} />
          <Input label="Valeur residuelle (FCFA)" type="number" min="0" value={destockForm.valeur_residuelle} onChange={(e) => setDestockForm({ ...destockForm, valeur_residuelle: e.target.value })} />
          <Textarea label="Notes" value={destockForm.notes} onChange={(e) => setDestockForm({ ...destockForm, notes: e.target.value })} rows={2} />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setDestockModal(false)}>Annuler</Button>
            <Button type="submit" variant="danger" loading={destockSaving} className="flex-1">Confirmer</Button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
}
