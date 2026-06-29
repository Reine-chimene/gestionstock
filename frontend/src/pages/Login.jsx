import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import AuthLayout from '../components/AuthLayout';
import Button from '../components/Button';
import Input from '../components/Input';
import { Alert } from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import { formatApiError } from '../utils/apiError';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate('/');
    } catch (err) {
      const status = err.response?.status;
      if (status === 403) {
        setError('Compte non valide. Validez votre email avec le code recu avant de vous connecter.');
        navigate('/verify', { state: { email: email.trim().toLowerCase() } });
      } else if (!err.response) {
        setError('Serveur injoignable. Verifiez que Docker tourne sur le VPS.');
      } else {
        setError(formatApiError(err, 'Email ou mot de passe incorrect'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Bon retour !" subtitle="Connectez-vous a votre espace de gestion">
      {error && <Alert type="error" message={error} onClose={() => setError('')} />}

      <form onSubmit={handleSubmit} className="section-gap">
        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@cro.cm" required />
        <div className="relative">
          <Input label="Mot de passe" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-[38px] text-cro-muted hover:text-cro-teal p-1">
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        <Button type="submit" size="lg" className="w-full !rounded-xl" loading={loading}>
          Se connecter
        </Button>
      </form>

      <div className="mt-8 pt-6 border-t border-cro-sand text-center text-sm text-cro-muted">
        <p>Pas de compte ? <Link to="/register" className="text-cro-teal font-semibold hover:underline">Creer un compte</Link></p>
      </div>

      <p className="mt-4 text-center text-xs text-cro-muted/70 bg-cro-cream rounded-lg py-2">
        Demo : admin@cro.cm / admin123
      </p>
    </AuthLayout>
  );
}
