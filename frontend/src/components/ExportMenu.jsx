import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import Button from './Button';
import { downloadFile } from '../services/api';

export default function ExportMenu({ baseUrl, name = 'export' }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" size="sm" onClick={() => downloadFile(`${baseUrl}?format=xlsx`, `${name}.xlsx`)}>
        <FileSpreadsheet size={16} /> Excel
      </Button>
      <Button variant="secondary" size="sm" onClick={() => downloadFile(`${baseUrl}?format=pdf`, `${name}.pdf`)}>
        <FileText size={16} /> PDF
      </Button>
    </div>
  );
}

export function ExportBon({ affectationId }) {
  return (
    <Button variant="gold" size="sm" onClick={() => downloadFile(`/exports/affectations/${affectationId}/bon`, `bon_${affectationId}.pdf`)}>
      <Download size={16} /> Bon PDF
    </Button>
  );
}
