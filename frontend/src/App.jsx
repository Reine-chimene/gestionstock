import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoadingSpinner } from './components/Modal';
import Login from './pages/Login';
import Register from './pages/Register';
import Verify from './pages/Verify';
import Dashboard from './pages/Dashboard';
import Materiels from './pages/Materiels';
import MaterielDetail from './pages/MaterielDetail';
import Lieux from './pages/Lieux';
import Affectations from './pages/Affectations';
import Membres from './pages/Membres';
import Rapports from './pages/Rapports';
import Inventaire from './pages/Inventaire';
import Maintenance from './pages/Maintenance';
import Audit from './pages/Audit';
import Destockage from './pages/Destockage';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-cro-cream"><LoadingSpinner /></div>;
  return user ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-cro-cream"><LoadingSpinner /></div>;
  return user ? <Navigate to="/" replace /> : children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/verify" element={<PublicRoute><Verify /></PublicRoute>} />
          <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/materiels" element={<PrivateRoute><Materiels /></PrivateRoute>} />
          <Route path="/materiels/:id" element={<PrivateRoute><MaterielDetail /></PrivateRoute>} />
          <Route path="/lieux" element={<PrivateRoute><Lieux /></PrivateRoute>} />
          <Route path="/affectations" element={<PrivateRoute><Affectations /></PrivateRoute>} />
          <Route path="/destockage" element={<PrivateRoute><Destockage /></PrivateRoute>} />
          <Route path="/maintenance" element={<PrivateRoute><Maintenance /></PrivateRoute>} />
          <Route path="/inventaire" element={<PrivateRoute><Inventaire /></PrivateRoute>} />
          <Route path="/rapports" element={<PrivateRoute><Rapports /></PrivateRoute>} />
          <Route path="/membres" element={<PrivateRoute><Membres /></PrivateRoute>} />
          <Route path="/audit" element={<PrivateRoute><Audit /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
