import { useState } from 'react';
import { AlertTriangle, MapPin, Camera, Send } from 'lucide-react';

export default function Reports() {
  const [reportType, setReportType] = useState('bache');

  const types = [
    { id: 'bache', label: 'Bache' },
    { id: 'fuga', label: 'Fuga de Agua' },
    { id: 'luz', label: 'Alumbrado Público' },
    { id: 'inseguridad', label: 'Inseguridad' },
    { id: 'otro', label: 'Otro' }
  ];

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '3rem', maxWidth: '600px', margin: '0 auto' }}>
      <div className="flex items-center gap-3" style={{ marginBottom: '2rem' }}>
        <div style={{ padding: '0.75rem', backgroundColor: 'var(--status-warning)', borderRadius: 'var(--radius-md)' }}>
           <AlertTriangle color="white" size={24} />
        </div>
        <div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Reporte Ciudadano</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Captura de quejas y necesidades</p>
        </div>
      </div>

      <div className="card glass-panel flex-col gap-4">
        
        <div className="input-group">
          <label className="input-label">Tipo de Reporte</label>
          <div className="flex gap-2" style={{ flexWrap: 'wrap', marginTop: '0.5rem' }}>
            {types.map(t => (
              <button 
                key={t.id}
                onClick={() => setReportType(t.id)}
                className="btn"
                style={{ 
                  borderRadius: 'var(--radius-full)', 
                  backgroundColor: reportType === t.id ? 'var(--color-primary)' : 'var(--bg-surface)',
                  color: reportType === t.id ? 'white' : 'var(--text-primary)',
                  borderColor: reportType === t.id ? 'var(--color-primary)' : 'var(--border-color)',
                  padding: '8px 16px'
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="input-group">
          <label className="input-label">Descripción</label>
          <textarea 
            className="input-field" 
            rows="3" 
            placeholder="Describe brevemente el problema reportado..."
            style={{ resize: 'vertical' }}
          />
        </div>

        <div className="input-group">
          <label className="input-label">Ubicación</label>
          <div style={{ position: 'relative' }}>
            <input type="text" className="input-field" style={{ width: '100%', paddingRight: '40px' }} placeholder="Dirección o punto de referencia" />
            <button className="btn" style={{ position: 'absolute', right: '4px', top: '4px', bottom: '4px', padding: '0 0.5rem', backgroundColor: 'var(--bg-surface-elevated)' }}>
              <MapPin size={16} />
            </button>
          </div>
        </div>

        <div className="input-group">
          <label className="input-label">Evidencia Gráfica</label>
          <div style={{ border: '2px dashed var(--border-color)', borderRadius: 'var(--radius-md)', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer', backgroundColor: 'var(--bg-app)' }}>
            <Camera size={32} color="var(--text-secondary)" />
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Adjuntar Foto (Obligatoria)</span>
          </div>
        </div>

        <button className="btn btn-primary" style={{ marginTop: '1rem', padding: '1rem', fontSize: '1rem' }}>
          <Send size={20} /> Enviar Reporte
        </button>

      </div>
    </div>
  );
}
