import { useEffect, useState } from 'react';
import { Plus, Users, Mail, Shield } from 'lucide-react';
import Layout from '../components/Layout';
import Button from '../components/Button';
import Input, { Select } from '../components/Input';
import Badge from '../components/Badge';
import Modal, { EmptyState, LoadingSpinner, Alert } from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { ROLE_LABELS } from '../utils/labels';

const emptyForm = {
  email: '', nom: '', prenom: '', role: 'lecteur', service: '', telephone: '',
};

export default function Membres() {
  const { canEdit } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
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
      const res = await api.post('/auth/invite', form);
      setSuccess(res.data.message);
      setForm(emptyForm);
      load();
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  if (!canEdit) {
    return (
      <Layout>
        <div className="text-center py-20">
          <Shield size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500">Acces reserve aux administrateurs.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Membres du personnel</h1>
            <p className="text-slate-500">Gerez les comptes et invitations</p>
          </div>
          <Button onClick={() => { setModalOpen(true); setError(''); setSuccess(''); }} size="lg">
            <Plus size={20} /> Inviter un membre
          </Button>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : items.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
            <EmptyState
              icon={Users}
              title="Aucun membre"
              description="Invitez des membres du personnel par email."
              action={<Button onClick={() => setModalOpen(true)}><Plus size={20} /> Inviter</Button>}
            />
          </div>
        ) : (
          <div className="table-wrap">
            <div className="overflow-x-auto">
              <table className="table">
                <thead className="table-head">
                  <tr>
                    <th className="table-th">Nom</th>
                    <th className="table-th hidden sm:table-cell">Email</th>
                    <th className="table-th">Role</th>
                    <th className="table-th">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((user) => (
                    <tr key={user.id} className="table-row">
                      <td className="table-td">
                        <p className="font-semibold text-cro-teal">{user.prenom} {user.nom}</p>
                        <p className="text-xs text-cro-muted sm:hidden">{user.email}</p>
                        {user.service && <p className="text-xs text-cro-muted">{user.service}</p>}
                      </td>
                      <td className="table-td hidden sm:table-cell">{user.email}</td>
                      <td className="table-td">
                        <Badge variant="teal">{ROLE_LABELS[user.role]}</Badge>
                      </td>
                      <td className="table-td">
                        {user.is_active && user.is_verified ? (
                          <Badge variant="success">Actif</Badge>
                        ) : (
                          <Badge variant="warning">En attente</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Inviter un membre">
          {error && <Alert type="error" message={error} />}
          {success && <Alert type="success" message={success} />}

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 flex gap-3">
            <Mail size={24} className="text-cro-blue shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800">
              Un code de validation sera envoye par email. Le membre devra l'utiliser pour activer son compte et definir son mot de passe.
            </p>
          </div>

          <form onSubmit={handleInvite} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Prenom" value={form.prenom} onChange={update('prenom')} required />
              <Input label="Nom" value={form.nom} onChange={update('nom')} required />
            </div>
            <Input label="Email" type="email" value={form.email} onChange={update('email')} required />
            <Select label="Role" value={form.role} onChange={update('role')}>
              {Object.entries(ROLE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </Select>
            <Input label="Service" value={form.service} onChange={update('service')} />
            <Input label="Telephone" value={form.telephone} onChange={update('telephone')} />
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => setModalOpen(false)}>Fermer</Button>
              <Button type="submit" className="flex-1" loading={saving}>Envoyer l'invitation</Button>
            </div>
          </form>
        </Modal>
      </div>
    </Layout>
  );
}
