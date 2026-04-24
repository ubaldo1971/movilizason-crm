import { useState, useRef, useCallback, useEffect } from 'react';
import { useRole } from '../context/RoleContext';
import { db } from '../firebaseConfig';
import { doc, setDoc, collection, getDocs, query, where } from '../lib/dbService';
import { generateRandom6DigitPin } from '../lib/dbService';
import { scanINE, isOnline } from '../services/ineScanner';
import { 
  Scan, Save, UserPlus, CheckCircle, AlertTriangle, 
  Phone, MapPin, User, Hash, ChevronDown, X, Loader2,
  Camera, FileText, ImagePlus, Trash2, Image as ImageIcon,
  RefreshCw, Check, SwitchCamera, XCircle, Wifi, WifiOff,
  CreditCard, Sparkles, Zap
} from 'lucide-react';
import { geocodeAddress } from '../services/geocodingService';
import './Capture.css';

const SUPPORT_LEVELS = [
  { value: 'alto', label: 'Alto (Promotor activo)', emoji: '🟢', color: '#22c55e' },
  { value: 'medio', label: 'Medio (Simpatiza pero no participa)', emoji: '🟡', color: '#eab308' },
  { value: 'bajo', label: 'Bajo (Indeciso / requiere labor)', emoji: '🟠', color: '#f97316' },
];

const INITIAL_FORM = {
  displayName: '',
  surname: '',
  phone: '',
  address: '',
  colonia: '',
  sectionNumber: '',
  supportLevel: 'alto',
  notes: '',
  photos: [],
};

export default function Capture() {
  const { currentUser, formatName, allUsers } = useRole();
  const [form, setForm] = useState({ ...INITIAL_FORM });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [recentCaptures, setRecentCaptures] = useState([]);
  const formRef = useRef(null);
  const galleryInputRef = useRef(null);

  // Camera modal state
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [facingMode, setFacingMode] = useState('environment');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // INE OCR state
  const [online, setOnline] = useState(isOnline());
  const [ineScanning, setIneScanning] = useState(false);
  const [ineScanModal, setIneScanModal] = useState(false);
  const [inePreview, setInePreview] = useState(null);
  const [ineScanResult, setIneScanResult] = useState(null); // 'success' | 'error' | null
  const [ineScanMessage, setIneScanMessage] = useState('');
  const [ineFieldsApplied, setIneFieldsApplied] = useState(0);
  const ineVideoRef = useRef(null);
  const ineCanvasRef = useRef(null);
  const ineStreamRef = useRef(null);
  const ineFileRef = useRef(null);

  // Track online/offline status
  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // Start camera stream
  const startCamera = useCallback(async (facing = facingMode) => {
    setCameraReady(false);
    setCameraError(null);
    setCapturedImage(null);

    // Stop any existing stream first
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }

    try {
      const constraints = {
        video: {
          facingMode: facing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          setCameraReady(true);
        };
      }
    } catch (err) {
      console.error('Camera error:', err);
      if (err.name === 'NotAllowedError') {
        setCameraError('Permiso de cámara denegado. Habilita el acceso en la configuración del navegador.');
      } else if (err.name === 'NotFoundError') {
        setCameraError('No se encontró ninguna cámara en este dispositivo.');
      } else {
        setCameraError('Error al acceder a la cámara: ' + err.message);
      }
    }
  }, [facingMode]);

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
    setCameraError(null);
    setCapturedImage(null);
  }, []);

  // Open camera modal
  const openCamera = () => {
    if (form.photos.length >= 5) {
      showToast('error', 'Máximo 5 fotografías por registro.');
      return;
    }
    setCameraOpen(true);
  };

  // Close camera modal
  const closeCamera = () => {
    stopCamera();
    setCameraOpen(false);
  };

  // Take snapshot from video
  const takeSnapshot = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedImage(dataUrl);

    // Pause video while previewing
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.enabled = false);
    }
  };

  // Accept captured image
  const acceptPhoto = () => {
    if (!capturedImage) return;
    
    setForm(prev => {
      if (prev.photos.length >= 5) {
        showToast('error', 'Máximo 5 fotografías por registro.');
        return prev;
      }
      return { ...prev, photos: [...prev.photos, capturedImage] };
    });

    showToast('success', '¡Foto capturada exitosamente!');
    closeCamera();
  };

  // Retake photo
  const retakePhoto = () => {
    setCapturedImage(null);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.enabled = true);
    }
  };

  // Switch camera (front/back)
  const switchCamera = () => {
    const newFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newFacing);
    startCamera(newFacing);
  };

  // Start camera when modal opens
  useEffect(() => {
    if (cameraOpen) {
      // Small delay so the modal DOM renders first
      const t = setTimeout(() => startCamera(), 150);
      return () => clearTimeout(t);
    }
  }, [cameraOpen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      stopIneCamera();
    };
  }, [stopCamera]);

  // ============ INE OCR Functions ============

  const startIneCamera = useCallback(async () => {
    if (ineStreamRef.current) {
      ineStreamRef.current.getTracks().forEach(t => t.stop());
      ineStreamRef.current = null;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      ineStreamRef.current = stream;
      if (ineVideoRef.current) {
        ineVideoRef.current.srcObject = stream;
        ineVideoRef.current.onloadedmetadata = () => ineVideoRef.current.play();
      }
    } catch (err) {
      console.error('INE camera error:', err);
      showToast('error', 'No se pudo acceder a la cámara.');
    }
  }, []);

  const stopIneCamera = useCallback(() => {
    if (ineStreamRef.current) {
      ineStreamRef.current.getTracks().forEach(t => t.stop());
      ineStreamRef.current = null;
    }
  }, []);

  const openIneScan = () => {
    if (!online) {
      showToast('error', 'Sin conexión a internet. Usa la captura manual.');
      return;
    }
    setIneScanModal(true);
    setInePreview(null);
    setIneScanResult(null);
    setIneScanMessage('');
    setIneFieldsApplied(0);
    setTimeout(() => startIneCamera(), 150);
  };

  const closeIneScan = () => {
    stopIneCamera();
    setIneScanModal(false);
    setInePreview(null);
    setIneScanResult(null);
    setIneScanMessage('');
    setIneScanning(false);
  };

  const captureInePhoto = () => {
    if (!ineVideoRef.current || !ineCanvasRef.current) return;
    const video = ineVideoRef.current;
    const canvas = ineCanvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setInePreview(dataUrl);
    stopIneCamera();
  };

  const retakeIne = () => {
    setInePreview(null);
    setIneScanResult(null);
    setIneScanMessage('');
    startIneCamera();
  };

  const handleIneGallery = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setInePreview(ev.target.result);
      stopIneCamera();
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const processIneScan = async () => {
    if (!inePreview) return;
    setIneScanning(true);
    setIneScanResult(null);
    setIneScanMessage('Analizando credencial con IA...');

    const result = await scanINE(inePreview);

    if (result.success) {
      const d = result.data;
      let fieldsCount = 0;

      setForm(prev => {
        const updates = {};
        if (d.displayName && !prev.displayName) { updates.displayName = d.displayName; fieldsCount++; }
        if (d.surname && !prev.surname) { updates.surname = d.surname; fieldsCount++; }
        if (d.address && !prev.address) { updates.address = d.address; fieldsCount++; }
        if (d.colonia && !prev.colonia) { updates.colonia = d.colonia; fieldsCount++; }
        if (d.sectionNumber && !prev.sectionNumber) { updates.sectionNumber = d.sectionNumber.replace(/\D/g, '').slice(0, 4); fieldsCount++; }
        setIneFieldsApplied(fieldsCount);
        return { ...prev, ...updates };
      });

      setIneScanResult('success');
      setIneScanMessage(`¡Escaneo exitoso! ${fieldsCount} campos extraídos.`);
    } else {
      setIneScanResult('error');
      setIneScanMessage(result.error);
    }

    setIneScanning(false);
  };

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const validateForm = () => {
    if (!form.displayName.trim()) {
      showToast('error', 'El nombre es obligatorio.');
      return false;
    }
    if (!form.phone.trim() || form.phone.replace(/\D/g, '').length < 10) {
      showToast('error', 'Ingresa un teléfono válido de 10 dígitos.');
      return false;
    }
    const normalizedPhone = form.phone.replace(/\D/g, '');
    const duplicate = allUsers.find(u => u.phone?.replace(/\D/g, '') === normalizedPhone);
    if (duplicate) {
      showToast('error', `Ya existe un registro con ese teléfono: ${formatName(duplicate)}`);
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSaving(true);
    try {
      const normalizedPhone = form.phone.replace(/\D/g, '');
      const pin = generateRandom6DigitPin();
      const docId = `cap_${normalizedPhone}_${Date.now()}`;

      // Geocode address if provided
      let lat = null;
      let lng = null;
      let geocoded = false;

      if (form.address.trim()) {
        try {
          const geoResult = await geocodeAddress(form.address.trim(), form.colonia.trim());
          if (geoResult.success) {
            lat = geoResult.lat;
            lng = geoResult.lng;
            geocoded = true;
            console.log('📍 Direccion geocodificada:', lat, lng);
          } else {
            console.warn('⚠️ No se pudo geocodificar la dirección:', geoResult.error);
          }
        } catch (e) {
          console.error('❌ Error en proceso de geocodificación:', e);
        }
      }

      const userData = {
        displayName: form.displayName.trim(),
        surname: form.surname.trim(),
        phone: normalizedPhone,
        address: form.address.trim(),
        colonia: form.colonia.trim(),
        sectionNumber: form.sectionNumber.trim(),
        lat,
        lng,
        supportLevel: form.supportLevel,
        notes: form.notes.trim(),
        photos: form.photos.map((p, i) => ({ id: `photo_${i}`, dataUrl: p })),
        photoCount: form.photos.length,
        pin,
        role: 'Registered',
        status: 'active',
        points: 0,
        medals: 0,
        photoURL: form.photos.length > 0 
          ? form.photos[0] 
          : `https://ui-avatars.com/api/?name=${encodeURIComponent(form.displayName.trim())}&background=random&color=fff&bold=true`,
        capturedBy: currentUser?.uid || 'unknown',
        capturedByName: formatName(currentUser) || 'Sistema',
        createdAt: new Date().toISOString(),
        source: 'capture_form',
      };

      await setDoc(doc(db, 'users', docId), userData);

      setRecentCaptures(prev => [
        { id: docId, name: `${userData.displayName} ${userData.surname}`.trim(), phone: normalizedPhone, time: new Date(), photoURL: userData.photoURL },
        ...prev.slice(0, 9)
      ]);

      showToast('success', `¡${userData.displayName} registrado exitosamente! ${geocoded ? '📍 Ubicado en el mapa.' : '🏠 Ubicado por sección.'}`);
      setForm({ ...INITIAL_FORM });
      formRef.current?.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (error) {
      console.error('Error saving capture:', error);
      showToast('error', 'Error al guardar el registro. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  // Gallery photo handling
  const handleGallerySelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    files.forEach(file => {
      if (file.size > 5 * 1024 * 1024) {
        showToast('error', 'La imagen es demasiado grande (máx 5MB).');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setForm(prev => {
          if (prev.photos.length >= 5) {
            showToast('error', 'Máximo 5 fotografías por registro.');
            return prev;
          }
          return { ...prev, photos: [...prev.photos, reader.result] };
        });
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const removePhoto = (index) => {
    setForm(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  const selectedSupport = SUPPORT_LEVELS.find(s => s.value === form.supportLevel);

  return (
    <div className="capture-page animate-fade-in" ref={formRef}>
      {/* Toast notification */}
      {toast && (
        <div className={`capture-toast capture-toast--${toast.type} animate-slide-down`}>
          <div className="capture-toast__icon">
            {toast.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
          </div>
          <span>{toast.message}</span>
          <button className="capture-toast__close" onClick={() => setToast(null)}>
            <X size={16} />
          </button>
        </div>
      )}

      <div className="capture-layout">
        {/* Main Form */}
        <div className="capture-main">
          <header className="capture-header">
            <div className="capture-header__icon">
              <UserPlus color="white" size={24} />
            </div>
            <div>
              <h1 className="capture-header__title">Captura Rápida</h1>
              <p className="capture-header__subtitle">Inteligencia electoral estatal</p>
            </div>
          </header>

          <form onSubmit={handleSubmit} className="capture-form">
            {/* INE OCR Button */}
            <button
              type="button"
              className={`capture-ocr-btn ${online ? 'capture-ocr-btn--active' : 'capture-ocr-btn--offline'}`}
              onClick={openIneScan}
              disabled={!online || ineScanning}
            >
              <div className="capture-ocr-btn__left">
                <CreditCard size={20} />
                <div>
                  <span className="capture-ocr-btn__title">Escanear INE</span>
                  <span className="capture-ocr-btn__sub">OCR con Inteligencia Artificial</span>
                </div>
              </div>
              <div className="capture-ocr-btn__right">
                {online ? (
                  <span className="capture-ocr-badge capture-ocr-badge--online">
                    <Wifi size={12} /> En línea
                  </span>
                ) : (
                  <span className="capture-ocr-badge capture-ocr-badge--offline">
                    <WifiOff size={12} /> Sin conexión
                  </span>
                )}
              </div>
            </button>

            <div className="capture-divider">
              <div className="capture-divider__line" />
              <span>O captura manual</span>
              <div className="capture-divider__line" />
            </div>

            {/* Name fields */}
            <div className="capture-row">
              <div className="capture-field">
                <label className="capture-label">
                  <User size={14} />
                  Nombre(s) <span className="capture-required">*</span>
                </label>
                <input
                  type="text"
                  className="capture-input"
                  placeholder="Ej: Juan Carlos"
                  value={form.displayName}
                  onChange={e => handleChange('displayName', e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div className="capture-field">
                <label className="capture-label">
                  <User size={14} />
                  Apellidos
                </label>
                <input
                  type="text"
                  className="capture-input"
                  placeholder="Ej: Pérez López"
                  value={form.surname}
                  onChange={e => handleChange('surname', e.target.value)}
                  autoComplete="off"
                />
              </div>
            </div>

            {/* Phone */}
            <div className="capture-field">
              <label className="capture-label">
                <Phone size={14} />
                Teléfono Móvil <span className="capture-required">*</span>
              </label>
              <input
                type="tel"
                className="capture-input"
                placeholder="10 dígitos — Ej: 6621234567"
                value={form.phone}
                onChange={e => handleChange('phone', e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                maxLength={10}
                autoComplete="off"
              />
              <div className="capture-field__hint">
                {form.phone.length > 0 && (
                  <span style={{ color: form.phone.length === 10 ? 'var(--status-success)' : 'var(--text-muted)' }}>
                    {form.phone.length}/10 dígitos
                  </span>
                )}
              </div>
            </div>

            {/* Address */}
            <div className="capture-field">
              <label className="capture-label">
                <MapPin size={14} />
                Dirección
              </label>
              <input
                type="text"
                className="capture-input"
                placeholder="Calle y número"
                value={form.address}
                onChange={e => handleChange('address', e.target.value)}
                autoComplete="off"
              />
            </div>

            <div className="capture-row">
              <div className="capture-field">
                <label className="capture-label">Colonia</label>
                <input
                  type="text"
                  className="capture-input"
                  placeholder="Colonia o fraccionamiento"
                  value={form.colonia}
                  onChange={e => handleChange('colonia', e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div className="capture-field">
                <label className="capture-label">
                  <Hash size={14} />
                  Sección Electoral
                </label>
                <input
                  type="text"
                  className="capture-input"
                  placeholder="Ej: 0445"
                  value={form.sectionNumber}
                  onChange={e => handleChange('sectionNumber', e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                  maxLength={4}
                  autoComplete="off"
                />
              </div>
            </div>

            {/* Support level */}
            <div className="capture-field">
              <label className="capture-label">Nivel de Apoyo Observado</label>
              <div className="capture-support-options">
                {SUPPORT_LEVELS.map(level => (
                  <button
                    key={level.value}
                    type="button"
                    className={`capture-support-btn ${form.supportLevel === level.value ? 'capture-support-btn--active' : ''}`}
                    style={{ '--support-color': level.color }}
                    onClick={() => handleChange('supportLevel', level.value)}
                  >
                    <span className="capture-support-btn__emoji">{level.emoji}</span>
                    <span>{level.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="capture-field">
              <label className="capture-label">
                <FileText size={14} />
                Notas / Observaciones
              </label>
              <textarea
                className="capture-input capture-textarea"
                placeholder="Comentarios adicionales sobre el simpatizante..."
                value={form.notes}
                onChange={e => handleChange('notes', e.target.value)}
                rows={3}
              />
            </div>

            {/* Photo Capture Section */}
            <div className="capture-field">
              <label className="capture-label">
                <Camera size={14} />
                Evidencia Fotográfica
                <span className="capture-photo-count">{form.photos.length}/5</span>
              </label>

              {/* Hidden gallery file input */}
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleGallerySelect}
                style={{ display: 'none' }}
              />

              {/* Hidden canvas for camera snapshot */}
              <canvas ref={canvasRef} style={{ display: 'none' }} />

              {/* Photo action buttons */}
              <div className="capture-photo-actions">
                <button
                  type="button"
                  className="capture-photo-btn capture-photo-btn--camera"
                  onClick={openCamera}
                  disabled={form.photos.length >= 5}
                >
                  <Camera size={20} />
                  <span>Tomar Foto</span>
                  <span className="capture-photo-btn__hint">Cámara en vivo</span>
                </button>
                <button
                  type="button"
                  className="capture-photo-btn capture-photo-btn--gallery"
                  onClick={() => galleryInputRef.current?.click()}
                  disabled={form.photos.length >= 5}
                >
                  <ImagePlus size={20} />
                  <span>Galería</span>
                  <span className="capture-photo-btn__hint">Seleccionar imagen</span>
                </button>
              </div>

              {/* Photo previews */}
              {form.photos.length > 0 && (
                <div className="capture-photo-grid">
                  {form.photos.map((photo, index) => (
                    <div key={index} className="capture-photo-preview">
                      <img src={photo} alt={`Foto ${index + 1}`} className="capture-photo-img" />
                      <button
                        type="button"
                        className="capture-photo-remove"
                        onClick={() => removePhoto(index)}
                        title="Eliminar foto"
                      >
                        <Trash2 size={14} />
                      </button>
                      <div className="capture-photo-badge">#{index + 1}</div>
                    </div>
                  ))}
                </div>
              )}

              {form.photos.length === 0 && (
                <div className="capture-photo-empty">
                  <ImageIcon size={24} />
                  <span>Sin fotografías adjuntas</span>
                </div>
              )}
            </div>

            {/* Submit */}
            <button 
              type="submit" 
              className="capture-submit"
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save size={20} />
                  Guardar Registro
                </>
              )}
            </button>
          </form>
        </div>

        {/* Sidebar - Recent captures */}
        {recentCaptures.length > 0 && (
          <aside className="capture-sidebar animate-fade-in">
            <h3 className="capture-sidebar__title">
              <CheckCircle size={16} />
              Registros de esta sesión
            </h3>
            <div className="capture-sidebar__count">{recentCaptures.length} capturado{recentCaptures.length !== 1 ? 's' : ''}</div>
            <div className="capture-sidebar__list">
              {recentCaptures.map((cap, i) => (
                <div key={cap.id} className="capture-sidebar__item">
                  <img 
                    src={cap.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(cap.name)}&background=random&color=fff&bold=true&size=32`} 
                    alt="" 
                    className="capture-sidebar__avatar"
                  />
                  <div className="capture-sidebar__info">
                    <div className="capture-sidebar__name">{cap.name}</div>
                    <div className="capture-sidebar__phone">{cap.phone}</div>
                  </div>
                  <div className="capture-sidebar__time">
                    {cap.time.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>
          </aside>
        )}
      </div>

      {/* INE Scan Modal */}
      {ineScanModal && (
        <div className="capture-modal capture-modal--ocr">
          <div className="capture-modal__content animate-scale-in">
            <header className="capture-modal__header">
              <div className="capture-modal__header-info">
                <Sparkles className="animate-pulse text-yellow-400" size={20} />
                <div>
                  <h3>Escaneo IA de INE</h3>
                  <p>Coloca la credencial frente a la cámara</p>
                </div>
              </div>
              <button className="capture-modal__close" onClick={closeIneScan}>
                <X size={20} />
              </button>
            </header>

            <div className="capture-modal__body">
              {!inePreview ? (
                /* Viewfinder State */
                <div className="capture-ocr-viewfinder">
                  <video ref={ineVideoRef} autoPlay playsInline muted className="capture-ocr-video" />
                  <canvas ref={ineCanvasRef} style={{ display: 'none' }} />
                  
                  {/* INE Alignment Guides */}
                  <div className="capture-ocr-guides">
                    <div className="guide-corner tl" />
                    <div className="guide-corner tr" />
                    <div className="guide-corner bl" />
                    <div className="guide-corner br" />
                    <div className="guide-label">Alinear frente de INE aquí</div>
                  </div>

                  <div className="capture-ocr-controls">
                    <label className="capture-ocr-btn-circle secondary" title="Subir de galería">
                      <ImagePlus size={20} />
                      <input type="file" accept="image/*" onChange={handleIneGallery} hidden />
                    </label>
                    <button className="capture-ocr-btn-shutter" onClick={captureInePhoto}>
                      <div className="inner-shutter" />
                    </button>
                    <div className="capture-ocr-btn-circle spacer" />
                  </div>
                </div>
              ) : (
                /* Preview and Result State */
                <div className="capture-ocr-preview-container">
                  <img src={inePreview} alt="INE Preview" className="capture-ocr-photo" />
                  
                  {ineScanning && (
                    <div className="capture-ocr-overlay processing">
                      <div className="scan-line-container">
                        <div className="scan-line" />
                      </div>
                      <div className="processing-status">
                        <Loader2 className="animate-spin" size={32} />
                        <span>Analizando con Gemini...</span>
                      </div>
                    </div>
                  )}

                  {ineScanResult === 'success' && (
                    <div className="capture-ocr-overlay success animate-fade-in">
                      <div className="result-icon">
                        <CheckCircle size={48} />
                      </div>
                      <div className="result-text">
                        <h4>¡Completado!</h4>
                        <p>{ineScanMessage}</p>
                      </div>
                      <button className="capture-ocr-confirm-btn" onClick={closeIneScan}>
                        <Check size={20} /> Continuar
                      </button>
                    </div>
                  )}

                  {ineScanResult === 'error' && (
                    <div className="capture-ocr-overlay error animate-fade-in">
                      <div className="result-icon">
                        <XCircle size={48} />
                      </div>
                      <div className="result-text">
                        <h4>Error al escanear</h4>
                        <p>{ineScanMessage}</p>
                      </div>
                      <div className="result-actions">
                        <button className="capture-ocr-retry-btn" onClick={retakeIne}>
                          <RefreshCw size={18} /> Reintentar
                        </button>
                        <button className="capture-ocr-manual-btn" onClick={closeIneScan}>
                          Captura manual
                        </button>
                      </div>
                    </div>
                  )}

                  {!ineScanning && !ineScanResult && (
                    <div className="capture-ocr-preview-actions">
                      <button className="capture-ocr-retake" onClick={retakeIne}>
                        <RefreshCw size={18} /> Repetir Foto
                      </button>
                      <button className="capture-ocr-process" onClick={processIneScan}>
                        <Zap size={18} /> Iniciar OCR
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============ CAMERA MODAL ============ */}
      {cameraOpen && (
        <div className="camera-modal-overlay" onClick={closeCamera}>
          <div className="camera-modal" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="camera-modal__header">
              <div className="camera-modal__title">
                <Camera size={18} />
                <span>Cámara en Vivo</span>
              </div>
              <div className="camera-modal__header-actions">
                <button className="camera-modal__switch" onClick={switchCamera} title="Cambiar cámara">
                  <SwitchCamera size={18} />
                </button>
                <button className="camera-modal__close" onClick={closeCamera}>
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Viewfinder */}
            <div className="camera-modal__viewfinder">
              {/* Loading state */}
              {!cameraReady && !cameraError && (
                <div className="camera-modal__loading">
                  <Loader2 size={32} className="animate-spin" />
                  <span>Iniciando cámara...</span>
                </div>
              )}

              {/* Error state */}
              {cameraError && (
                <div className="camera-modal__error">
                  <XCircle size={36} />
                  <span>{cameraError}</span>
                  <button className="camera-modal__retry" onClick={() => startCamera()}>
                    <RefreshCw size={16} />
                    Reintentar
                  </button>
                </div>
              )}

              {/* Video feed */}
              <video
                ref={videoRef}
                className="camera-modal__video"
                autoPlay
                playsInline
                muted
                style={{ display: capturedImage ? 'none' : 'block' }}
              />

              {/* Captured preview */}
              {capturedImage && (
                <img src={capturedImage} alt="Vista previa" className="camera-modal__preview-img" />
              )}

              {/* Corner guides */}
              {cameraReady && !capturedImage && (
                <div className="camera-modal__guides">
                  <div className="camera-guide camera-guide--tl" />
                  <div className="camera-guide camera-guide--tr" />
                  <div className="camera-guide camera-guide--bl" />
                  <div className="camera-guide camera-guide--br" />
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="camera-modal__controls">
              {!capturedImage ? (
                <button
                  className="camera-modal__shutter"
                  onClick={takeSnapshot}
                  disabled={!cameraReady}
                  title="Capturar"
                >
                  <div className="camera-modal__shutter-ring">
                    <div className="camera-modal__shutter-btn" />
                  </div>
                </button>
              ) : (
                <div className="camera-modal__review">
                  <button className="camera-modal__retake" onClick={retakePhoto}>
                    <RefreshCw size={18} />
                    Repetir
                  </button>
                  <button className="camera-modal__accept" onClick={acceptPhoto}>
                    <Check size={18} />
                    Usar Foto
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

