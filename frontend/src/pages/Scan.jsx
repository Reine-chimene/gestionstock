import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode, Search, Camera } from 'lucide-react';
import Layout from '../components/Layout';
import Button from '../components/Button';
import Input from '../components/Input';
import { Alert, LoadingSpinner } from '../components/Modal';
import api from '../services/api';
import { formatApiError } from '../utils/apiError';

export default function Scan() {
  const navigate = useNavigate();
  const [matricule, setMatricule] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef(null);
  const regionId = 'qr-reader-region';

  useEffect(() => () => { stopScanner(); }, []);

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
      } catch {
        /* ignore */
      }
      scannerRef.current = null;
    }
    setScanning(false);
  };

  const goToMateriel = async (code) => {
    const value = (code || matricule).trim();
    if (!value) return;
    setLoading(true);
    setError('');
    try {
      let target = value;
      if (value.includes('/materiels/')) {
        const match = value.match(/\/materiels\/(\d+)/);
        if (match) {
          navigate(`/materiels/${match[1]}?scan=1`);
          return;
        }
      }
      if (value.includes('scan=')) {
        const m = value.match(/scan=([^&]+)/);
        if (m) target = decodeURIComponent(m[1]);
      }
      const res = await api.get(`/materiels/scan/${encodeURIComponent(target)}`);
      navigate(`/materiels/${res.data.id}?scan=1`);
    } catch (err) {
      setError(formatApiError(err, 'Materiel introuvable'));
    } finally {
      setLoading(false);
    }
  };

  const startScanner = async () => {
    setError('');
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      await stopScanner();
      setScanning(true);
      const scanner = new Html5Qrcode(regionId);
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decoded) => {
          await stopScanner();
          goToMateriel(decoded);
        },
        () => {},
      );
    } catch (err) {
      setScanning(false);
      setError('Camera indisponible. Saisissez le matricule manuellement.');
    }
  };

  return (
    <Layout title="Scanner QR" subtitle="Identifiez un materiel sur le terrain">
      {error && <Alert type="error" message={error} onClose={() => setError('')} />}

      <div className="cro-card p-5 mb-6 space-y-4">
        <Input
          label="Matricule ou code QR"
          value={matricule}
          onChange={(e) => setMatricule(e.target.value)}
          placeholder="Ex: CRO-2024-001"
          onKeyDown={(e) => e.key === 'Enter' && goToMateriel()}
        />
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => goToMateriel()} loading={loading}>
            <Search size={18} /> Rechercher
          </Button>
          {!scanning ? (
            <Button variant="gold" onClick={startScanner}>
              <Camera size={18} /> Ouvrir la camera
            </Button>
          ) : (
            <Button variant="secondary" onClick={stopScanner}>Arreter le scan</Button>
          )}
        </div>
      </div>

      {scanning && (
        <div className="cro-card p-4 overflow-hidden">
          <div id={regionId} className="w-full max-w-md mx-auto" />
        </div>
      )}

      {!scanning && (
        <div className="text-center py-12 text-cro-muted">
          <QrCode size={48} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">Scannez le QR code colle sur le materiel ou saisissez le matricule.</p>
        </div>
      )}
    </Layout>
  );
}
