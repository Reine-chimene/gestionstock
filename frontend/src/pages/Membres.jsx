import { useEffect, useState } from 'react';
import { Plus, Users, Mail, Shield, Pencil } from 'lucide-react';
import Layout from '../components/Layout';
import Button from '../components/Button';
import Input, { Select } from '../components/Input';
import Badge from '../components/Badge';
import Modal, { EmptyState, LoadingSpinner, Alert } from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { ROLE_LABELS } from '../utils/labels';
import { formatApiError } from '../utils/apiError';

const emptyForm = {
  email: '', nom: '', prenom: '', role: 'lecteur', service: '', telephone: '', password: '',
};

export default function Membres() {
  const { canEdit, isAdmin } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

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
      setForm(emptyForm);
      load();
    } catch (err) {
      setError(formatApiError(err, 'Erreur'));
    } finally {
      setSaving(false);
    }
  };

  const handleRoleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.patch(`/auth/users/${editUser.id}`, { role: form.role });
      setEditUser(null);
      load();
    } catch (err) {
      setError(formatApiError(err, 'Erreur'));
    } finally {
      setSaving(false);
    }
  };

  const openEditRole = (user) => {
    setEditUser(user);
    setForm({ ...emptyForm, role: user.role });
    setError('');
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
        <Button onClick={() => { setModalOpen(true); setError(''); setSuccess(''); }}>
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
          action={<Button onClick={() => setModalOpen(true)}><Plus size={20} /> Inviter</Button>}
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
                  {isAdmin && user.role !== 'admin' && (
                    <Button variant="secondary" size="sm" onClick={() => openEditRole(user)}>
                      <Pencil size={14} /> Role
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Inviter un membre">
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

      <Modal isOpen={!!editUser} onClose={() => setEditUser(null)} title={`Modifier le role — ${editUser?.prenom} ${editUser?.nom}`}>
        {error && <Alert type="error" message={error} />}
        <form onSubmit={handleRoleUpdate} className="space-y-4">
          <Select label="Role" value={form.role} onChange={update('role')} required>
            {Object.entries(ROLE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
          <Button type="submit" className="w-full" loading={saving}>Enregistrer</Button>
        </form>
      </Modal>
    </Layout>
  );
}
