import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode, Search, Camera } from 'lucide-react';
import Layout from '../components/Layout';
import Button from '../components/Button';
import Input from '../components/Input';
import { Alert, LoadingSpinner } from '../components/Modal';
import api from '../services/api';
import { formatApiError } from '../utils/apiError';

const regionId = 'qr-reader-region';

function parseScanInput(raw) {
  const value = (raw || '').trim();
  if (!value) return { matricule: '', id: null };

  if (value.toUpperCase().startsWith('CRO:')) {
    const parts = value.split(':');
    const matricule = parts[1]?.trim() || '';
    const id = parts[2] && /^\d+$/.test(parts[2]) ? parseInt(parts[2], 10) : null;
    return { matricule, id };
  }

  if (value.includes('/materiels/')) {
    const idMatch = value.match(/\/materiels\/(\d+)/);
    const scanMatch = value.match(/scan=([^&]+)/);
    return {
      matricule: scanMatch ? decodeURIComponent(scanMatch[1]) : '',
      id: idMatch ? parseInt(idMatch[1], 10) : null,
    };
  }

  if (value.includes('scan=')) {
    const m = value.match(/scan=([^&]+)/);
    if (m) return { matricule: decodeURIComponent(m[1]), id: null };
  }

  return { matricule: value, id: null };
}

export default function Scan() {
  const navigate = useNavigate();
  const [matricule, setMatricule] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef(null);
  const startingRef = useRef(false);

  const stopScanner = async () => {
    startingRef.current = false;
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

  useEffect(() => () => { stopScanner(); }, []);

  const goToMateriel = async (code) => {
    const parsed = parseScanInput(code || matricule);
    if (parsed.id) {
      navigate(`/materiels/${parsed.id}?from=scan`);
      return;
    }
    const target = parsed.matricule.trim();
    if (!target) return;

    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/materiels/scan/${encodeURIComponent(target)}`);
      navigate(`/materiels/${res.data.id}?from=scan`);
    } catch (err) {
      setError(formatApiError(err, 'Materiel introuvable'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!scanning || scannerRef.current || startingRef.current) return;

    let cancelled = false;
    startingRef.current = true;

    const start = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (cancelled) return;

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
      } catch {
        if (!cancelled) {
          setScanning(false);
          setError('Camera indisponible. Saisissez le matricule manuellement.');
        }
      } finally {
        startingRef.current = false;
      }
    };

    start();
    return () => { cancelled = true; };
  }, [scanning]);

  const startScanner = async () => {
    setError('');
    await stopScanner();
    setScanning(true);
  };

  return (
    <Layout title="Scanner QR" subtitle="Identifiez un materiel sur le terrain">
      {error && <Alert type="error" message={error} onClose={() => setError('')} />}

      <div className="cro-card p-5 mb-6 space-y-4">
        <Input
          label="Matricule ou code QR"
          value={matricule}
          onChange={(e) => setMatricule(e.target.value)}
          placeholder="Ex: CRO-001 ou CRO:CRO-001:5"
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
          <div id={regionId} className="w-full max-w-md mx-auto min-h-[280px]" />
          <LoadingSpinner />
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
