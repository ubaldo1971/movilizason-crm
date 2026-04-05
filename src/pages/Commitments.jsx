import { useState } from 'react';
import { FileCheck, Camera, MapPin, Upload } from 'lucide-react';

export default function Commitments() {
  const [hasSpace, setHasSpace] = useState(null);

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '3rem', maxWidth: '600px', margin: '0 auto' }}>
       <div className="flex items-center gap-3" style={{ marginBottom: '2rem' }}>
        <div style={{ padding: '0.75rem', backgroundColor: 'var(--color-primary)', borderRadius: 'var(--radius-md)' }}>
           <FileCheck color="white" size={24} />
        </div>
        <div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Compromisos</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Gestión de bardas y espacios</p>
        </div>
      </div>

      <div className="card glass-panel flex-col gap-5">
        
        <div className="flex-col gap-3" style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.25rem' }}>¿El ciudadano ofrece su barda para rotulación?</h2>
          <div className="flex gap-4 justify-center" style={{ marginTop: '0.5rem' }}>
            <button 
              className={`btn ${hasSpace === true ? 'btn-primary' : ''}`} 
              style={{ width: '120px', padding: '1rem' }}
              onClick={() => setHasSpace(true)}
            >
              Sí
            </button>
            <button 
              className={`btn ${hasSpace === false ? 'btn-primary' : ''}`} 
              style={{ width: '120px', padding: '1rem', backgroundColor: hasSpace === false ? 'var(--status-error)' : '', borderColor: hasSpace === false ? 'var(--status-error)' : '' }}
              onClick={() => setHasSpace(false)}
            >
              No
            </button>
          </div>
        </div>

        {hasSpace && (
          <div className="animate-fade-in flex-col gap-4" style={{ marginTop: '1rem', paddingTop: '1.5rem', borderTop: '1px dashed var(--border-color)' }}>
            
            <div className="input-group">
              <label className="input-label">Nombre del Propietario</label>
              <input type="text" className="input-field" placeholder="Nombre completo" />
            </div>

            <div className="flex gap-4">
              <div className="input-group" style={{ flex: 1 }}>
                <label className="input-label">Teléfono</label>
                <input type="tel" className="input-field" placeholder="10 dígitos" />
              </div>
              
              <div className="input-group" style={{ flex: 1 }}>
                <label className="input-label">Dimensión Aprox.</label>
                <select className="input-field" style={{ appearance: 'none' }}>
                  <option>Pequeña (&lt; 2m)</option>
                  <option>Mediana (2-5m)</option>
                  <option>Grande (&gt; 5m)</option>
                </select>
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Ubicación</label>
              <div style={{ position: 'relative' }}>
                <input type="text" className="input-field" style={{ width: '100%', paddingRight: '40px' }} placeholder="Dirección exacta" />
                <button className="btn" style={{ position: 'absolute', right: '4px', top: '4px', bottom: '4px', padding: '0 0.5rem', backgroundColor: 'var(--bg-surface-elevated)' }}>
                  <MapPin size={16} />
                </button>
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Foto del Espacio</label>
              <div style={{ border: '2px dashed var(--border-color)', borderRadius: 'var(--radius-md)', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer', backgroundColor: 'var(--bg-app)' }}>
                <Camera size={32} color="var(--text-secondary)" />
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Tocar para tomar foto</span>
              </div>
            </div>

            <div className="flex items-center gap-2" style={{ marginTop: '1rem' }}>
              <input type="checkbox" id="accept" style={{ width: '1.25rem', height: '1.25rem' }} />
              <label htmlFor="accept" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                El ciudadano acepta los términos para la rotulación
              </label>
            </div>

            <button className="btn btn-primary" style={{ marginTop: '1rem', padding: '1rem', fontSize: '1rem' }}>
              <Upload size={20} /> Registrar Compromiso
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
