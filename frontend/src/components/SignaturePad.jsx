import { useRef, useEffect } from 'react';
import Button from './Button';

export default function SignaturePad({ onSave, onCancel }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#0B3D3D';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
  }, []);

  const pos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const touch = e.touches?.[0];
    const x = (touch || e).clientX - rect.left;
    const y = (touch || e).clientY - rect.top;
    return { x, y };
  };

  const start = (e) => { drawing.current = true; const { x, y } = pos(e); const ctx = canvasRef.current.getContext('2d'); ctx.beginPath(); ctx.moveTo(x, y); e.preventDefault(); };
  const draw = (e) => {
    if (!drawing.current) return;
    const { x, y } = pos(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.lineTo(x, y); ctx.stroke(); e.preventDefault();
  };
  const stop = () => { drawing.current = false; };

  const clear = () => {
    const canvas = canvasRef.current;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
  };

  const save = () => onSave(canvasRef.current.toDataURL('image/png'));

  return (
    <div>
      <p className="text-sm text-cro-muted mb-2">Signez dans la zone ci-dessous :</p>
      <canvas ref={canvasRef} width={400} height={150} className="w-full border-2 border-cro-sand rounded-xl bg-white cursor-crosshair touch-none"
        onMouseDown={start} onMouseMove={draw} onMouseUp={stop} onMouseLeave={stop}
        onTouchStart={start} onTouchMove={draw} onTouchEnd={stop} />
      <div className="flex gap-2 mt-3">
        <Button variant="secondary" size="sm" onClick={clear}>Effacer</Button>
        <Button variant="secondary" size="sm" className="flex-1" onClick={onCancel}>Annuler</Button>
        <Button size="sm" className="flex-1" onClick={save}>Enregistrer</Button>
      </div>
    </div>
  );
}
