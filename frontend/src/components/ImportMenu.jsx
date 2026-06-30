import { useRef, useState } from 'react';
import { Upload, FileSpreadsheet } from 'lucide-react';
import Button from './Button';
import { Alert } from './Modal';
import api, { downloadFile } from '../services/api';
import { validateFileSize } from '../utils/fileUpload';
import { formatApiError } from '../utils/apiError';

export default function ImportMenu({
  importUrl,
  templateUrl,
  templateName = 'modele_import.xlsx',
  onSuccess,
  label = 'Importer Excel',
}) {
  const inputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const sizeErr = validateFileSize(file);
    if (sizeErr) {
      setError(sizeErr);
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.post(importUrl, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSuccess(res.data.message || 'Import reussi');
      onSuccess?.(res.data);
    } catch (err) {
      setError(formatApiError(err, 'Erreur lors de l\'import'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}
      <div className="flex flex-wrap gap-2">
        {templateUrl && (
          <Button variant="secondary" size="sm" onClick={() => downloadFile(templateUrl, templateName)}>
            <FileSpreadsheet size={16} /> Modele
          </Button>
        )}
        <Button variant="secondary" size="sm" loading={loading} onClick={() => inputRef.current?.click()}>
          <Upload size={16} /> {label}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={handleFile}
        />
      </div>
    </div>
  );
}
