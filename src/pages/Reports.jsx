import { useState, useRef } from 'react';
import { AlertTriangle, MapPin, Camera, Send, X, CheckCircle, Loader2 } from 'lucide-react';
import { useRole } from '../context/RoleContext';
import { addDoc, collection, serverTimestamp } from '../lib/dbService';

export default function Reports() {
  const { currentUser, ROLES } = useRole();
  const [reportType, setReportType] = useState('bache');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [citizenName, setCitizenName] = useState('');
  const [citizenPhone, setCitizenPhone] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const fileInputRef = useRef(null);

  const types = [
    { id: 'bache', label: 'Bache' },
    { id: 'fuga', label: 'Fuga de Agua' },
    { id: 'luz', label: 'Alumbrado Público' },
    { id: 'inseguridad', label: 'Inseguridad' },
    { id: 'otro', label: 'Otro' }
  ];

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description || !location || !imagePreview) {
      alert("Por favor, completa los campos obligatorios (Descripción, Ubicación) y adjunta una evidencia fotográfica forzosa.");
      return;
    }

    setIsSubmitting(true);
    
    try {
      const reportData = {
        type: reportType,
        description,
        location,
        citizenName: citizenName || 'Anónimo',
        citizenPhone: citizenPhone || 'Sin teléfono',
        imageUrl: imagePreview, // En producción usaría Firebase Storage
        status: 'PENDING',
        createdBy: currentUser?.uid || 'unknown',
        userFolio: currentUser?.folio || '00000',
        userName: currentUser?.displayName || 'Brigadista',
        userRole: currentUser?.role || 'Guest',
        section: currentUser?.section || '0000',
        distFederal: currentUser?.distFederal || '0',
        distLocal: currentUser?.distLocal || '0',
        createdAt: serverTimestamp(),
        timestamp: new Date().toISOString()
      };

      // 1. Guardar el reporte ciudadano
      const reportRef = await addDoc(collection(null, 'reports'), reportData);

      // 2. Sincronizar con la galería general de evidencias
      await addDoc(collection(null, 'evidence'), {
        category: 'reporte',
        notes: `Reporte Ciudadano: ${description.substring(0, 50)}...`,
        url: imagePreview,
        thumbnail: imagePreview,
        userName: currentUser.displayName,
        uploadedBy: currentUser.uid,
        section: currentUser.section || '0000',
        distFederal: currentUser.distFederal || '0',
        distLocal: currentUser.distLocal || '0',
        citizenName: citizenName || 'Anónimo',
        citizenPhone: citizenPhone || 'Sin teléfono',
        timestamp: new Date().toISOString()
      });

      // 3. Notificar a Coordinadores (Demo: enviamos a Super Admin)
      await addDoc(collection(null, 'notifications'), {
        userId: 'admin_demo', // En producción se buscaría a los coordinadores del distrito
        title: '📢 Nuevo Reporte Ciudadano',
        body: `${currentUser.displayName} reportó: ${reportType.toUpperCase()} en ${location}`,
        type: 'report',
        link: '/support',
        read: false,
        createdAt: serverTimestamp(),
        timestamp: new Date().toISOString(),
        metadata: { reportId: reportRef.id, section: reportData.section }
      });

      setShowSuccess(true);
      // Reset form
      setDescription('');
      setLocation('');
      setCitizenName('');
      setCitizenPhone('');
      removeImage();
      
      setTimeout(() => setShowSuccess(false), 5000);
    } catch (error) {
      console.error("Error al enviar reporte:", error);
      alert("Hubo un error al enviar el reporte. Por favor, intenta de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showSuccess) {
    return (
      <div className="flex-col items-center justify-center animate-fade-in" style={{ height: '70vh', textAlign: 'center', gap: '1.5rem' }}>
        <div style={{ padding: '2rem', backgroundColor: 'var(--status-success)15', borderRadius: '50%', color: 'var(--status-success)' }}>
          <CheckCircle size={80} />
        </div>
        <div>
          <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>¡Reporte Enviado!</h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '400px' }}>
            La queja ciudadana ha sido registrada y vinculada a tu territorio (Sección {currentUser.section}). 
            Ya puedes consultarla en el Contenedor de Soporte.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowSuccess(false)}>Excelente, hacer otro reporte</button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '3rem', maxWidth: '600px', margin: '0 auto' }}>
      <div className="flex items-center gap-3" style={{ marginBottom: '2rem' }}>
        <div style={{ padding: '0.75rem', backgroundColor: 'var(--status-warning)', borderRadius: 'var(--radius-md)' }}>
           <AlertTriangle color="white" size={24} />
        </div>
        <div>
           <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Reportes Ciudadanos</h1>
           <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Inteligencia electoral estatal</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card glass-panel flex-col gap-4">
        
        <div className="input-group">
          <label className="input-label">Tipo de Reporte</label>
          <div className="flex gap-2" style={{ flexWrap: 'wrap', marginTop: '0.5rem' }}>
            {types.map(t => (
              <button 
                key={t.id}
                type="button"
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
          <label className="input-label">Descripción del Problema</label>
          <textarea 
            className="input-field" 
            rows="3" 
            required
            placeholder="Describe brevemente el problema reportado..."
            style={{ resize: 'vertical' }}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="input-group">
          <label className="input-label">Ubicación / Referencia *</label>
          <div style={{ position: 'relative' }}>
            <input 
              type="text" 
              className="input-field" 
              style={{ width: '100%', paddingRight: '40px' }} 
              placeholder="Dirección o punto de referencia" 
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
            <button 
              type="button"
              className="btn" 
              style={{ position: 'absolute', right: '4px', top: '4px', bottom: '4px', padding: '0 0.5rem', backgroundColor: 'var(--bg-surface-elevated)' }}
              title="Obtener ubicación actual"
            >
              <MapPin size={16} />
            </button>
          </div>
        </div>

        <div className="flex gap-4" style={{ width: '100%' }}>
          <div className="input-group" style={{ flex: 1 }}>
            <label className="input-label">Nombre del Ciudadano (Opcional)</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Nombre para seguimiento"
              value={citizenName}
              onChange={(e) => setCitizenName(e.target.value)}
            />
          </div>
          <div className="input-group" style={{ flex: 1 }}>
            <label className="input-label">Teléfono (Opcional)</label>
            <input 
              type="tel" 
              className="input-field" 
              placeholder="10 dígitos"
              value={citizenPhone}
              onChange={(e) => setCitizenPhone(e.target.value)}
            />
          </div>
        </div>

        <div className="input-group">
          <label className="input-label">Evidencia Gráfica</label>
          {imagePreview ? (
            <div style={{ position: 'relative', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
              <img src={imagePreview} alt="Preview" style={{ width: '100%', maxHeight: '300px', objectFit: 'cover' }} />
              <button 
                onClick={removeImage}
                style={{ position: 'absolute', top: '10px', right: '10px', backgroundColor: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', padding: '5px', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>
          ) : (
            <div 
              onClick={() => fileInputRef.current.click()}
              style={{ border: '2px dashed var(--border-color)', borderRadius: 'var(--radius-md)', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer', backgroundColor: 'var(--bg-app)' }}
            >
              <Camera size={32} color="var(--text-secondary)" />
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Adjuntar Foto (Obligatoria)</span>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageChange} 
                accept="image/*" 
                style={{ display: 'none' }}
                required
              />
            </div>
          )}
        </div>

        <button 
          type="submit" 
          className="btn btn-primary" 
          disabled={isSubmitting}
          style={{ marginTop: '1rem', padding: '1rem', fontSize: '1rem', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              Enviando...
            </>
          ) : (
            <>
              <Send size={20} /> Enviar Reporte
            </>
          )}
        </button>

      </form>
    </div>
  );
}
