import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import Button from '../components/Button';
import Input from '../components/Input';
import { Alert } from '../components/Modal';
import api from '../services/api';

export default function Verify() {
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState(location.state?.email || '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('verify');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/verify', { email, code });
      setSuccess('Compte valide !');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) { setError(err.response?.data?.detail || 'Code invalide'); }
    finally { setLoading(false); }
  };

  const handleSetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/set-password', { email, code, password });
      setSuccess('Compte active !');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) { setError(err.response?.data?.detail || 'Erreur'); }
    finally { setLoading(false); }
  };

  return (
    <AuthLayout title="Validation email" subtitle="Entrez le code a 6 chiffres recu par email">
      <div className="tab-group mb-6">
        <button type="button" onClick={() => setMode('verify')} className={mode === 'verify' ? 'tab-active' : 'tab'}>Inscription</button>
        <button type="button" onClick={() => setMode('invite')} className={mode === 'invite' ? 'tab-active' : 'tab'}>Invitation</button>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {success && <Alert type="success" message={success} />}

      <form onSubmit={mode === 'verify' ? handleVerify : handleSetPassword} className="section-gap">
        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />

        <div className="field">
          <label className="label">Code a 6 chiffres</label>
          <input
            type="text" value={code} maxLength={6} required
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            className="input text-center text-2xl font-bold tracking-[0.4em] !py-4"
          />
        </div>

        {mode === 'invite' && (
          <Input label="Nouveau mot de passe" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        )}

        <Button type="submit" size="lg" className="w-full" loading={loading}>
          {mode === 'verify' ? 'Valider mon compte' : 'Activer mon compte'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm">
        <Link to="/login" className="text-cro-teal font-medium">Retour a la connexion</Link>
      </p>
    </AuthLayout>
  );
}
