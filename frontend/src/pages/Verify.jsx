import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import Button from '../components/Button';
import Input from '../components/Input';
import { Alert } from '../components/Modal';
import api from '../services/api';
import { formatApiError } from '../utils/apiError';

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
  const [resending, setResending] = useState(false);

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedCode = code.trim();

  const validateForm = () => {
    if (!normalizedEmail) {
      setError('Veuillez saisir votre email.');
      return false;
    }
    if (normalizedCode.length !== 6) {
      setError('Le code doit contenir exactement 6 chiffres.');
      return false;
    }
    if (mode === 'invite' && password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caracteres.');
      return false;
    }
    return true;
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    if (!validateForm()) return;
    setLoading(true);
    try {
      await api.post('/auth/verify', { email: normalizedEmail, code: normalizedCode });
      setSuccess('Compte valide ! Vous pouvez vous connecter.');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError(formatApiError(err, 'Code invalide ou expire.'));
    } finally {
      setLoading(false);
    }
  };

  const handleSetPassword = async (e) => {
    e.preventDefault();
    setError('');
    if (!validateForm()) return;
    setLoading(true);
    try {
      await api.post('/auth/set-password', { email: normalizedEmail, code: normalizedCode, password });
      setSuccess('Compte active ! Vous pouvez vous connecter.');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError(formatApiError(err, 'Erreur lors de l\'activation.'));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setSuccess('');
    if (!normalizedEmail) {
      setError('Saisissez votre email pour renvoyer le code.');
      return;
    }
    setResending(true);
    try {
      const res = await api.post('/auth/resend-code', { email: normalizedEmail });
      setSuccess(res.data.message || 'Nouveau code envoye.');
    } catch (err) {
      setError(formatApiError(err, 'Impossible de renvoyer le code.'));
    } finally {
      setResending(false);
    }
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
            type="text" value={code} maxLength={6} required inputMode="numeric"
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            className="input text-center text-2xl font-bold tracking-[0.4em] !py-4"
          />
        </div>

        {mode === 'invite' && (
          <Input label="Nouveau mot de passe" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required hint="6 caracteres minimum" />
        )}

        <Button type="submit" size="lg" className="w-full" loading={loading}>
          {mode === 'verify' ? 'Valider mon compte' : 'Activer mon compte'}
        </Button>
      </form>

      <div className="mt-4 text-center space-y-2">
        <button
          type="button"
          onClick={handleResend}
          disabled={resending}
          className="text-sm text-cro-teal font-medium hover:underline disabled:opacity-50"
        >
          {resending ? 'Envoi en cours...' : 'Renvoyer le code'}
        </button>
        <p className="text-xs text-cro-muted/80 bg-cro-cream rounded-lg py-2 px-3">
          Pas recu d&apos;email ? Sur le serveur, le code est affiche dans les logs : <code>docker logs cro_stock_api</code>
        </p>
      </div>

      <p className="mt-6 text-center text-sm">
        <Link to="/login" className="text-cro-teal font-medium">Retour a la connexion</Link>
      </p>
    </AuthLayout>
  );
}
