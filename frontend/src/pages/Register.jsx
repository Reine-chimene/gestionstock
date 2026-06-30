import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import Button from '../components/Button';
import Input from '../components/Input';
import { Alert } from '../components/Modal';
import api from '../services/api';
import { formatApiError } from '../utils/apiError';

export default function Register() {
  const [form, setForm] = useState({ email: '', nom: '', prenom: '', password: '', confirmPassword: '', service: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const u = (f) => (e) => setForm({ ...form, [f]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) { setError('Les mots de passe ne correspondent pas.'); return; }
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/register', {
        email: form.email.trim().toLowerCase(),
        nom: form.nom.trim(),
        prenom: form.prenom.trim(),
        password: form.password,
        service: form.service.trim() || null,
      });
      setSuccess('Compte cree ! Vous pouvez vous connecter.');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError(formatApiError(err, 'Erreur lors de l\'inscription'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Creer un compte" subtitle="Rejoignez la plateforme de gestion CRO">
      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {success && <Alert type="success" message={success} />}

      <div className="bg-cro-teal-soft border border-cro-teal/20 rounded-xl p-4 mb-4 text-sm text-cro-teal">
        L'inscription publique cree un compte <strong>lecteur</strong> (consultation). Seul un administrateur peut attribuer les roles gestionnaire ou administrateur.
      </div>

      <form onSubmit={handleSubmit} className="section-gap">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Prenom" value={form.prenom} onChange={u('prenom')} required />
          <Input label="Nom" value={form.nom} onChange={u('nom')} required />
        </div>
        <Input label="Email" type="email" value={form.email} onChange={u('email')} required />
        <Input label="Service" value={form.service} onChange={u('service')} placeholder="Optionnel" />
        <Input label="Mot de passe" type="password" value={form.password} onChange={u('password')} required hint="6 caracteres minimum" />
        <Input label="Confirmer" type="password" value={form.confirmPassword} onChange={u('confirmPassword')} required />
        <Button type="submit" size="lg" className="w-full" loading={loading}>S'inscrire</Button>
      </form>

      <p className="mt-6 text-center text-sm text-cro-muted">
        Deja inscrit ? <Link to="/login" className="text-cro-teal font-semibold">Se connecter</Link>
      </p>
    </AuthLayout>
  );
}
