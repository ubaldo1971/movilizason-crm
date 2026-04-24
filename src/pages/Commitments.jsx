import { useState, useRef } from 'react';
import { 
  FileCheck, Camera, MapPin, Upload, Home, Users, 
  Check, Shield, User, Scan, Info, Landmark, Smartphone,
  Image as ImageIcon, MoreHorizontal, UserCheck, Settings, Trash, Plus, Edit2, X
} from 'lucide-react';
import { useRole } from '../context/RoleContext';

const ICON_MAP = {
  ImageIcon: <ImageIcon size={32} />,
  Home: <Home size={32} />,
  Users: <Users size={32} />,
  Landmark: <Landmark size={32} />,
  Smartphone: <Smartphone size={32} />,
  MoreHorizontal: <MoreHorizontal size={32} />,
  UserCheck: <UserCheck size={32} />,
  Shield: <Shield size={32} />
};


export default function Commitments() {
  const { 
    commitmentTypes, 
    addCommitmentType, 
    updateCommitmentType, 
    deleteCommitmentType,
    saveCommitment,
    currentUser,
    ROLES
  } = useRole();

  const [activeSection, setActiveSection] = useState('main'); // section ID
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [editingType, setEditingType] = useState(null);
  
  const [formState, setFormState] = useState({
    name: '',
    phone: '',
    address: '',
    dimensions: 'Mediana (2-5m)',
    affiliation: 'Simpatizante',
    wantsAffiliate: false,
    hasSticker: false,
    capacity: '10-20 personas',
    availability: ['Fines de semana'],
    notes: ''
  });

  const [photos, setPhotos] = useState({
    ineFront: null,
    ineBack: null,
    selfie: null,
    space: null
  });

  const [ocrLoading, setOcrLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Admin Form State
  const [adminForm, setAdminForm] = useState({
    title: '',
    desc: '',
    icon: 'MoreHorizontal',
    color: 'var(--color-primary)'
  });


  const simulateOCR = () => {
    setOcrLoading(true);
    setTimeout(() => {
      setFormState(prev => ({
        ...prev,
        name: 'MARIA ELENA LOPEZ RAMIREZ',
        address: 'CALLE SERDAN #142, COL. CENTRO, HERMOSILLO, SONORA. CP 83000'
      }));
      setOcrLoading(false);
    }, 2500);
  };

  const handlePhotoUpload = (field) => {
    // Simulated photo capture
    setPhotos(prev => ({ ...prev, [field]: 'captured_blob_url' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const commitmentData = {
      typeId: activeSection,
      typeTitle: currentType?.title,
      citizenData: {
        name: formState.name,
        phone: formState.phone,
        address: formState.address,
      },
      specifics: {
        ...formState,
      },
      evidence: photos
    };

    const success = await saveCommitment(commitmentData);
    
    if (success) {
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setActiveSection('main');
        setFormState({
          name: '',
          phone: '',
          address: '',
          dimensions: 'Mediana (2-5m)',
          affiliation: 'Simpatizante',
          wantsAffiliate: false,
          hasSticker: false,
          capacity: '10-20 personas',
          availability: ['Fines de semana'],
          notes: ''
        });
        setPhotos({ ineFront: null, ineBack: null, selfie: null, space: null });
      }, 3000);
    }
  };

  const handleSaveAdminType = async (e) => {
    e.preventDefault();
    if (editingType) {
      await updateCommitmentType(editingType.id, adminForm);
    } else {
      await addCommitmentType(adminForm);
    }
    setShowAdminModal(false);
    setEditingType(null);
    setAdminForm({ title: '', desc: '', icon: 'MoreHorizontal', color: 'var(--color-primary)' });
  };

  const currentType = commitmentTypes.find(t => t.id === activeSection);
  const isSuperAdmin = currentUser?.role === ROLES.SUPER_ADMIN;


  if (isSuccess) {
    return (
      <div className="flex-col items-center justify-center animate-fade-in" style={{ height: '70vh', textAlign: 'center' }}>
        <div style={{ padding: '2rem', background: 'var(--color-primary-dim)', borderRadius: '50%', marginBottom: '1.5rem' }}>
          <Check size={64} color="var(--color-primary)" />
        </div>
        <h2 style={{ fontSize: '1.5rem', color: 'var(--text-primary)' }}>¡Compromiso Registrado!</h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Los datos se han sincronizado con la estructura estatal.</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '5rem', maxWidth: '800px', margin: '0 auto' }}>
      {/* Header */}
      <div className="flex items-center justify-between" style={{ marginBottom: '2rem' }}>
        <div className="flex items-center gap-3">
          <div style={{ padding: '0.75rem', backgroundColor: 'var(--color-primary)', borderRadius: 'var(--radius-md)', color: 'white' }}>
            <FileCheck size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Compromisos Ciudadanos</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Inteligencia electoral estatal</p>
          </div>
        </div>

        {isSuperAdmin && activeSection === 'main' && (
          <button 
            className="btn ghost" 
            style={{ gap: '0.5rem' }}
            onClick={() => setShowAdminModal(true)}
          >
            <Settings size={18} /> Configurar
          </button>
        )}
      </div>


      {activeSection === 'main' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
          {commitmentTypes.map(type => (
            <CommitmentCard 
              key={type.id}
              icon={ICON_MAP[type.icon] || <MoreHorizontal size={32} />}
              title={type.title}
              desc={type.desc}
              color={type.color}
              onClick={() => setActiveSection(type.id)}
            />
          ))}
          {commitmentTypes.length === 0 && (
            <div className="col-span-full py-12 text-center" style={{ color: 'var(--text-secondary)' }}>
              <Info size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
              <p>No hay tipos de compromiso configurados.</p>
            </div>
          )}
        </div>
      ) : (

        <div className="card glass-panel animate-slide-up" style={{ padding: '1.5rem' }}>
          <button 
            className="btn ghost" 
            style={{ marginBottom: '1.5rem', padding: '0.5rem' }}
            onClick={() => setActiveSection('main')}
          >
            ← Volver al menú
          </button>

          <form onSubmit={handleSubmit} className="flex-col gap-6">
            <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {currentType && ICON_MAP[currentType.icon]}
              {currentType ? currentType.title : 'Cargando...'}
            </h2>


            {/* INE OCR SECTION */}
            <div className="flex-col gap-3" style={{ background: 'var(--bg-app)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
              <div className="flex justify-between items-center">
                <h3 style={{ fontSize: '1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Shield size={18} color="var(--color-primary)" /> Identificación Oficial (INE)
                </h3>
                <button 
                  type="button" 
                  className={`btn ${ocrLoading ? 'disabled' : 'primary'}`}
                  style={{ fontSize: '0.75rem', height: '32px' }}
                  onClick={simulateOCR}
                  disabled={ocrLoading || !photos.ineFront}
                >
                  {ocrLoading ? <span className="spinner" /> : <><Scan size={14} /> Leer Datos (OCR)</>}
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3" style={{ marginTop: '0.5rem' }}>
                <PhotoBox 
                  label="Frente" 
                  hasPhoto={!!photos.ineFront} 
                  onClick={() => handlePhotoUpload('ineFront')} 
                />
                <PhotoBox 
                  label="Reverso" 
                  hasPhoto={!!photos.ineBack} 
                  onClick={() => handlePhotoUpload('ineBack')} 
                />
                <PhotoBox 
                  label="Selfie + INE" 
                  hasPhoto={!!photos.selfie} 
                  onClick={() => handlePhotoUpload('selfie')} 
                />
              </div>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Info size={12} /> Toma las fotos primero para activar el escaneo automático.
              </p>
            </div>

            {/* FORM FIELDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="input-group">
                <label className="input-label">Nombre del Ciudadano (OCR ✅)</label>
                <input 
                  type="text" 
                  className="input-field" 
                  required
                  value={formState.name}
                  onChange={e => setFormState({...formState, name: e.target.value})}
                  placeholder="Se llenará automáticamente" 
                />
              </div>
              <div className="input-group">
                <label className="input-label">Teléfono de Contacto</label>
                <input 
                  type="tel" 
                  className="input-field" 
                  required
                  value={formState.phone}
                  onChange={e => setFormState({...formState, phone: e.target.value})}
                  placeholder="10 dígitos" 
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Dirección (Manual o OCR ✅)</label>
              <textarea 
                className="input-field" 
                rows="2"
                value={formState.address}
                onChange={e => setFormState({...formState, address: e.target.value})}
                placeholder="Calle, número, colonia, CP"
              ></textarea>
            </div>

            {/* CONDITIONALLY RENDERED EXTRA FIELDS */}
            {activeSection === 'barda' && (
              <div className="flex-col gap-4 animate-fade-in group-panel">
                 <div className="input-group">
                  <label className="input-label">Dimensión Aprox. de la Barda</label>
                  <select 
                    className="input-field"
                    value={formState.dimensions}
                    onChange={e => setFormState({...formState, dimensions: e.target.value})}
                  >
                    <option>Pequeña (&lt; 2m)</option>
                    <option>Mediana (2-5m)</option>
                    <option>Grande (&gt; 5m)</option>
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Foto de Referencia de la Barda</label>
                  <PhotoBox 
                    label="Tocar para tomar foto de la barda" 
                    hasPhoto={!!photos.space} 
                    onClick={() => handlePhotoUpload('space')} 
                    fullWidth
                  />
                </div>
              </div>
            )}

            {activeSection === 'comite' && (
              <div className="flex-col gap-4 animate-fade-in group-panel">
                <div className="grid grid-cols-2 gap-4">
                  <div className="input-group">
                    <label className="input-label">Capacidad de Reunión</label>
                    <select 
                      className="input-field"
                      value={formState.capacity}
                      onChange={e => setFormState({...formState, capacity: e.target.value})}
                    >
                      <option>5-10 personas</option>
                      <option>10-20 personas</option>
                      <option>20-50 personas</option>
                      <option>+50 (Patio/Cochera)</option>
                    </select>
                  </div>
                  <div className="input-group">
                    <label className="input-label">Disponibilidad</label>
                    <select 
                      className="input-field"
                      onChange={e => {
                        const val = e.target.value;
                        if (!formState.availability.includes(val)) {
                          setFormState({...formState, availability: [...formState.availability, val]});
                        }
                      }}
                    >
                      <option value="">Agregar horario...</option>
                      <option value="Mañanas">Mañanas</option>
                      <option value="Tardes">Tardes</option>
                      <option value="Noches">Noches</option>
                      <option value="Fines de semana">Fines de semana</option>
                    </select>
                  </div>
                </div>
                {formState.availability.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formState.availability.map(a => (
                      <span key={a} className="badge" style={{ background: 'var(--color-primary-dim)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {a} <X size={12} style={{ cursor: 'pointer' }} onClick={() => setFormState({...formState, availability: formState.availability.filter(x => x !== a)})} />
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeSection === 'afiliacion' && (
              <div className="flex-col gap-4 animate-fade-in group-panel">
                <div className="input-group">
                  <label className="input-label">Vínculo con el Movimiento</label>
                  <div className="flex gap-2">
                    {['Simpatizante', 'Militante', 'Militante Activo'].map(status => (
                      <button
                        key={status}
                        type="button"
                        className={`btn ${formState.affiliation === status ? 'primary' : 'ghost'}`}
                        style={{ flex: 1, fontSize: '0.8rem' }}
                        onClick={() => setFormState({...formState, affiliation: status})}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-app rounded-xl">
                  <div className="flex items-center gap-2">
                    <UserCheck size={18} color="var(--color-primary)" />
                    <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>¿Desea afiliarse formalmente?</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={formState.wantsAffiliate} 
                    onChange={e => setFormState({...formState, wantsAffiliate: e.target.checked})}
                    className="toggle-switch"
                  />
                </div>
              </div>
            )}

            {/* DISTINCTION SECTION */}
            <div className="flex-col gap-4" style={{ marginTop: '0.5rem' }}>
              <div className="flex items-center justify-between" style={{ padding: '1rem', background: 'var(--bg-surface-elevated)', borderRadius: '12px', border: '1px solid var(--color-primary-dim)' }}>
                <div className="flex items-center gap-2">
                  <div style={{ background: 'var(--color-primary)', padding: '6px', borderRadius: '6px', fontSize: '10px', color: 'white' }}>CALCA</div>
                  <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>¿Se entregó distintivo/calca?</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={formState.hasSticker} 
                  onChange={e => setFormState({...formState, hasSticker: e.target.checked})}
                  style={{ width: '20px', height: '20px' }} 
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ height: '56px', fontSize: '1.1rem', marginTop: '1rem' }}>
              <Upload size={20} /> Finalizar y Sincronizar
            </button>
          </form>
        </div>
      )}

      {/* ADMIN MODAL */}
      {showAdminModal && (
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 1000 }}>
          <div className="card glass-panel modal-content animate-slide-up" style={{ maxWidth: '600px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Settings size={24} /> Configuración de Compromisos
              </h2>
              <button className="btn ghost" onClick={() => { setShowAdminModal(false); setEditingType(null); }}>
                <X size={24} />
              </button>
            </div>

            <div className="flex-col gap-4">
              {/* List existing */}
              <div className="flex-col gap-2">
                <label className="input-label">Catálogo Actual</label>
                {commitmentTypes.map(type => (
                  <div key={type.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--color-primary-dim)', border: '1px solid var(--border-color)' }}>
                    <div className="flex items-center gap-3">
                      <div style={{ color: type.color }}>{ICON_MAP[type.icon]}</div>
                      <div>
                        <div style={{ fontWeight: 600 }}>{type.title}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{type.desc}</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        className="btn ghost" 
                        style={{ padding: '0.4rem' }}
                        onClick={() => {
                          setEditingType(type);
                          setAdminForm({ title: type.title, desc: type.desc, icon: type.icon, color: type.color });
                        }}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        className="btn ghost" 
                        style={{ padding: '0.4rem', color: 'var(--color-error)' }}
                        onClick={() => { if(confirm('¿Seguro?')) deleteCommitmentType(type.id); }}
                      >
                        <Trash size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <hr style={{ opacity: 0.1 }} />

              {/* Add/Edit Form */}
              <form onSubmit={handleSaveAdminType} className="flex-col gap-4">
                <h3 style={{ fontSize: '1rem', margin: 0 }}>{editingType ? 'Editar Tipo' : 'Agregar Nuevo Tipo'}</h3>
                
                <div className="input-group">
                  <label className="input-label">Título</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    required 
                    value={adminForm.title}
                    onChange={e => setAdminForm({...adminForm, title: e.target.value})}
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Descripción Social</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    required 
                    value={adminForm.desc}
                    onChange={e => setAdminForm({...adminForm, desc: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="input-group">
                    <label className="input-label">Icono</label>
                    <select 
                      className="input-field"
                      value={adminForm.icon}
                      onChange={e => setAdminForm({...adminForm, icon: e.target.value})}
                    >
                      {Object.keys(ICON_MAP).map(key => <option key={key} value={key}>{key}</option>)}
                    </select>
                  </div>
                  <div className="input-group">
                    <label className="input-label">Color (Hex/CSS)</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      value={adminForm.color}
                      onChange={e => setAdminForm({...adminForm, color: e.target.value})}
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                    <Plus size={18} /> {editingType ? 'Actualizar' : 'Guardar y Publicar'}
                  </button>
                  {editingType && (
                    <button type="button" className="btn ghost" style={{ flex: 0.5 }} onClick={() => { setEditingType(null); setAdminForm({ title: '', desc: '', icon: 'MoreHorizontal', color: 'var(--color-primary)' }); }}>
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


function CommitmentCard({ icon, title, desc, onClick, color = 'var(--color-primary)' }) {
  return (
    <div 
      className="card glass-panel flex-row gap-4 items-center interaction-card" 
      style={{ padding: '1.25rem', cursor: 'pointer' }}
      onClick={onClick}
    >
      <div style={{ padding: '1rem', borderRadius: '14px', background: `${color}15`, color: color }}>
        {icon}
      </div>
      <div>
        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{title}</h3>
        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{desc}</p>
      </div>
    </div>
  );
}

function PhotoBox({ label, hasPhoto, onClick, fullWidth = false }) {
  return (
    <div 
      onClick={onClick}
      className={`flex-col items-center justify-center gap-2 ${hasPhoto ? 'active-photo' : ''}`}
      style={{ 
        border: `2px dashed ${hasPhoto ? 'var(--color-primary)' : 'var(--border-color)'}`, 
        borderRadius: '12px', 
        padding: '1rem', 
        height: '100px',
        width: fullWidth ? '100%' : 'auto',
        backgroundColor: hasPhoto ? 'var(--color-primary-dim)' : 'transparent',
        cursor: 'pointer',
        transition: 'all 0.2s ease'
      }}
    >
      {hasPhoto ? (
        <Check size={24} color="var(--color-primary)" />
      ) : (
        <Camera size={24} color="var(--text-secondary)" />
      )}
      <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
        {hasPhoto ? 'Capturada' : label}
      </span>
    </div>
  );
}
