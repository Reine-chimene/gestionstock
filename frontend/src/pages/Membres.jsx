import { useEffect, useState } from 'react';
import { Plus, Users, Mail, Shield, Pencil, KeyRound } from 'lucide-react';
import Layout from '../components/Layout';
import Button from '../components/Button';
import Input, { Select } from '../components/Input';
import Badge from '../components/Badge';
import Modal, { EmptyState, LoadingSpinner, Alert, DraftBanner } from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { ROLE_LABELS } from '../utils/labels';
import { formatApiError } from '../utils/apiError';
import { useFormDraft } from '../utils/useFormDraft';
import { saveDraft } from '../utils/formDraft';

const emptyForm = {
  email: '', nom: '', prenom: '', role: 'lecteur', service: '', telephone: '', password: '',
};

export default function Membres() {
  const { canEdit, isAdmin, user: currentUser } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const { draftRestored, setDraftRestored, restoreDraft, discardDraft, draftKey } = useFormDraft('membres', 'invite');

  useEffect(() => {
    if (modalOpen) {
      const { password, ...safe } = form;
      saveDraft(draftKey, safe);
    }
  }, [form, modalOpen, draftKey]);

  const load = () => {
    setLoading(true);
    api.get('/auth/users')
      .then((res) => setItems(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleInvite = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload = { ...form };
      if (!payload.password) delete payload.password;
      const res = await api.post('/auth/invite', payload);
      setSuccess(res.data.message);
      discardDraft();
      setForm(emptyForm);
      load();
    } catch (err) {
      setError(formatApiError(err, 'Erreur'));
    } finally {
      setSaving(false);
    }
  };

  const handleUserUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const tasks = [];
      if (form.password && form.password.length >= 6) {
        tasks.push(api.post(`/auth/users/${editUser.id}/reset-password`, { password: form.password }));
      } else if (form.password && form.password.length > 0) {
        setError('Le mot de passe doit contenir au minimum 6 caracteres.');
        setSaving(false);
        return;
      }
      if (isAdmin && form.role !== editUser.role) {
        tasks.push(api.patch(`/auth/users/${editUser.id}`, { role: form.role }));
      }
      if (tasks.length === 0) {
        setError('Saisissez un nouveau mot de passe ou modifiez le role.');
        setSaving(false);
        return;
      }
      await Promise.all(tasks);
      setSuccess('Modifications enregistrees.');
      setEditUser(null);
      setForm(emptyForm);
      load();
    } catch (err) {
      setError(formatApiError(err, 'Erreur'));
    } finally {
      setSaving(false);
    }
  };

  const openInvite = () => {
    setForm(restoreDraft(emptyForm));
    setError('');
    setSuccess('');
    setModalOpen(true);
  };

  const openEditUser = (user) => {
    setEditUser(user);
    setForm({ ...emptyForm, role: user.role, password: '' });
    setError('');
    setSuccess('');
  };

  const canManageUser = (user) => {
    if (user.id === currentUser?.id) return false;
    if (isAdmin) return true;
    return user.role !== 'admin';
  };

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const roleOptions = Object.entries(ROLE_LABELS).filter(([k]) => isAdmin || k !== 'admin');

  if (!canEdit) {
    return (
      <Layout>
        <div className="text-center py-20">
          <Shield size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500">Acces reserve aux administrateurs et gestionnaires.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Equipe" subtitle="Comptes et droits d'acces">
      <div className="flex flex-wrap gap-3 mb-6">
        <Button onClick={openInvite}>
          <Plus size={18} /> Inviter un membre
        </Button>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Aucun membre"
          description="Invitez des membres du personnel par email."
          action={<Button onClick={openInvite}><Plus size={20} /> Inviter</Button>}
        />
      ) : (
        <div className="space-y-3">
          {items.map((user) => (
            <div key={user.id} className="cro-card p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-cro-teal">{user.prenom} {user.nom}</p>
                  <p className="text-sm text-cro-muted truncate">{user.email}</p>
                  {user.service && <p className="text-xs text-cro-muted">{user.service}</p>}
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <Badge variant="teal">{ROLE_LABELS[user.role]}</Badge>
                  {user.is_active && user.is_verified ? (
                    <Badge variant="success">Actif</Badge>
                  ) : (
                    <Badge variant="warning">En attente</Badge>
                  )}
                  {canManageUser(user) && (
                    <Button variant="secondary" size="sm" onClick={() => openEditUser(user)}>
                      {isAdmin ? <Pencil size={14} /> : <KeyRound size={14} />}
                      {isAdmin ? ' Modifier' : ' Mot de passe'}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Inviter un membre">
        <DraftBanner show={draftRestored} onDismiss={() => setDraftRestored(false)} />
        {error && <Alert type="error" message={error} />}
        {success && <Alert type="success" message={success} />}

        <div className="bg-cro-teal-soft border border-cro-teal/20 rounded-xl p-4 mb-4 flex gap-3">
          <Mail size={22} className="text-cro-teal shrink-0 mt-0.5" />
          <p className="text-sm text-cro-teal">
            Seul un administrateur peut attribuer le role administrateur. L'inscription publique cree des comptes lecteur uniquement.
          </p>
        </div>

        <form onSubmit={handleInvite} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Prenom" value={form.prenom} onChange={update('prenom')} required />
            <Input label="Nom" value={form.nom} onChange={update('nom')} required />
          </div>
          <Input label="Email" type="email" value={form.email} onChange={update('email')} required />
          <Select label="Role" value={form.role} onChange={update('role')}>
            {roleOptions.map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
          <Input label="Mot de passe initial (optionnel)" type="password" value={form.password} onChange={update('password')} hint="Par defaut : temporal123!" />
          <Input label="Service" value={form.service} onChange={update('service')} />
          <Input label="Telephone" value={form.telephone} onChange={update('telephone')} />
          <Button type="submit" className="w-full" loading={saving}>Creer le compte</Button>
        </form>
      </Modal>

      <Modal isOpen={!!editUser} onClose={() => { setEditUser(null); setError(''); setSuccess(''); }} title={`Modifier — ${editUser?.prenom} ${editUser?.nom}`}>
        {error && <Alert type="error" message={error} />}
        {success && <Alert type="success" message={success} />}
        <form onSubmit={handleUserUpdate} className="space-y-4">
          {isAdmin && editUser?.role !== 'admin' && (
            <Select label="Role" value={form.role} onChange={update('role')} required>
              {Object.entries(ROLE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </Select>
          )}
          <Input
            label="Nouveau mot de passe"
            type="password"
            value={form.password}
            onChange={update('password')}
            placeholder="Laisser vide pour ne pas changer"
            hint="Minimum 6 caracteres — le membre pourra se connecter immediatement"
          />
          <Button type="submit" className="w-full" loading={saving}>Enregistrer</Button>
        </form>
      </Modal>
    </Layout>
  );
}
