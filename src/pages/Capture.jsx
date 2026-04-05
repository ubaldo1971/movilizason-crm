import { Scan, Save, UserPlus } from 'lucide-react';

export default function Capture() {
  return (
    <div className="animate-fade-in" style={{ paddingBottom: '3rem', maxWidth: '600px', margin: '0 auto' }}>
      <div className="flex items-center gap-3" style={{ marginBottom: '2rem' }}>
        <div style={{ padding: '0.75rem', backgroundColor: 'var(--color-primary)', borderRadius: 'var(--radius-md)' }}>
           <UserPlus color="white" size={24} />
        </div>
        <div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Captura Rápida</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Registro de simpatizantes en campo</p>
        </div>
      </div>

      <div className="card glass-panel flex-col gap-4">
        
        <div style={{ marginBottom: '1rem' }}>
          <button className="btn" style={{ width: '100%', padding: '1rem', borderStyle: 'dashed', backgroundColor: 'transparent' }}>
            <Scan size={20} />
            Escanear INE (OCR Automático)
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }} />
          O captura manual
          <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }} />
        </div>

        <div className="input-group">
          <label className="input-label">Nombre Completo</label>
          <input type="text" className="input-field" placeholder="Nombre completo" />
        </div>

        <div className="input-group">
          <label className="input-label">Teléfono Móvil</label>
          <input type="tel" className="input-field" placeholder="10 dígitos" />
        </div>

        <div className="input-group">
          <label className="input-label">Dirección / Colonia</label>
          <input type="text" className="input-field" placeholder="Calle, Número, Colonia" />
        </div>

        <div className="input-group">
          <label className="input-label">Nivel de Apoyo Observado</label>
          <select className="input-field" style={{ appearance: 'none' }}>
            <option value="alto">🟢 Alto (Promotor activo)</option>
            <option value="medio">🟡 Medio (Simpatiza pero no participa)</option>
            <option value="bajo">🟠 Bajo (Indeciso / requiere labor)</option>
          </select>
        </div>

        <button className="btn btn-primary" style={{ marginTop: '1rem', padding: '1rem', fontSize: '1rem' }}>
          <Save size={20} />
          Guardar Registro Rápidamente
        </button>
      </div>
    </div>
  );
}
