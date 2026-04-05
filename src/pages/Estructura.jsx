import React, { useState, useEffect } from 'react';
import { useRole } from '../context/RoleContext';
import { db } from '../firebaseConfig';
import { doc, getDoc, setDoc } from '../lib/dbService';
import { ChevronDown, ChevronUp, Edit2, Save, X, Users, AlertTriangle } from 'lucide-react';

const INITIAL_STRUCTURE = [
  { id: 'fed-1', name: 'Distrito Federal 1 (San Luis Río Colorado)', coordinator: 'Juan Pérez', substitute: 'María López', locales: [
    { id: 'loc-1', name: 'Distrito Local 1', coordinator: 'Carlos Ruiz', substitute: 'Ana Gómez' },
    { id: 'loc-2', name: 'Distrito Local 2', coordinator: 'Luis Soto', substitute: 'Marta Díaz' },
    { id: 'loc-3', name: 'Distrito Local 3', coordinator: 'Jorge Vega', substitute: 'Rosa Silva' }
  ]},
  { id: 'fed-2', name: 'Distrito Federal 2 (Nogales)', coordinator: 'Pedro Sánchez', substitute: 'Lucía Marín', locales: [
    { id: 'loc-4', name: 'Distrito Local 4', coordinator: 'Mario Gil', substitute: 'Elena Paz' },
    { id: 'loc-5', name: 'Distrito Local 5', coordinator: 'Omar Rivas', substitute: 'Sara Luna' },
    { id: 'loc-6', name: 'Distrito Local 6', coordinator: 'Iván Castro', substitute: 'Nora Solís' }
  ]},
  { id: 'fed-3', name: 'Distrito Federal 3 (Hermosillo Norte)', coordinator: 'Armando Robles', substitute: 'Teresa Núñez', locales: [
    { id: 'loc-7', name: 'Distrito Local 7', coordinator: 'Raúl Parra', substitute: 'Inés Flores' },
    { id: 'loc-8', name: 'Distrito Local 8', coordinator: 'Hugo Ríos', substitute: 'Olga Vega' },
    { id: 'loc-9', name: 'Distrito Local 9', coordinator: 'Paco Muro', substitute: 'Luz Vera' }
  ]},
  { id: 'fed-4', name: 'Distrito Federal 4 (Guaymas)', coordinator: 'Roberto Cruz', substitute: 'Carmen Torres', locales: [
    { id: 'loc-10', name: 'Distrito Local 10', coordinator: 'Saúl Mora', substitute: 'Irma Ríos' },
    { id: 'loc-11', name: 'Distrito Local 11', coordinator: 'Joel Cano', substitute: 'Elsa Nava' },
    { id: 'loc-12', name: 'Distrito Local 12', coordinator: 'Aldo Puga', substitute: 'Rita Pina' }
  ]},
  { id: 'fed-5', name: 'Distrito Federal 5 (Hermosillo Sur)', coordinator: 'Manuel León', substitute: 'Sonia Ávila', locales: [
    { id: 'loc-13', name: 'Distrito Local 13', coordinator: 'Víctor Mena', substitute: 'Dora Tapia' },
    { id: 'loc-14', name: 'Distrito Local 14', coordinator: 'César Lugo', substitute: 'Alma Rey' },
    { id: 'loc-15', name: 'Distrito Local 15', coordinator: 'Félix Roa', substitute: 'Gina Valle' }
  ]},
  { id: 'fed-6', name: 'Distrito Federal 6 (Cajeme)', coordinator: 'Diego Salas', substitute: 'Emma Cruz', locales: [
    { id: 'loc-16', name: 'Distrito Local 16', coordinator: 'Rene Serna', substitute: 'Flor Alba' },
    { id: 'loc-17', name: 'Distrito Local 17', coordinator: 'Gael Lima', substitute: 'Iris Pino' },
    { id: 'loc-18', name: 'Distrito Local 18', coordinator: 'Tito Peña', substitute: 'Katy Ríos' }
  ]},
  { id: 'fed-7', name: 'Distrito Federal 7 (Navojoa)', coordinator: 'José Arce', substitute: 'Laura Pinto', locales: [
    { id: 'loc-19', name: 'Distrito Local 19', coordinator: 'Alan Tovar', substitute: 'Mía Casas' },
    { id: 'loc-20', name: 'Distrito Local 20', coordinator: 'Enzo Rico', substitute: 'Paz Salas' },
    { id: 'loc-21', name: 'Distrito Local 21', coordinator: 'Ciro Cano', substitute: 'Noemí Gil' }
  ]}
];

export default function Estructura() {
  const { role, ROLES, VALID_PINS } = useRole();
  const [structure, setStructure] = useState(() => {
    const cached = localStorage.getItem('estructura_cache');
    return cached ? JSON.parse(cached) : INITIAL_STRUCTURE;
  });
  const [editing, setEditing] = useState(false);
  const [tempStructure, setTempStructure] = useState([]);
  const [expandedFeds, setExpandedFeds] = useState({});
  const [isSyncing, setIsSyncing] = useState(true);
  
  // PIN Validation Modal
  const [showPinModal, setShowPinModal] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [saving, setSaving] = useState(false);

  const canEdit = role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN_ESTATAL;

  useEffect(() => {
    let active = true;
    const fetchStructure = async () => {
      try {
        const docRef = doc(db, 'config', 'estructura');
        const docSnap = await getDoc(docRef);
        if (active) {
          if (docSnap.exists() && Array.isArray(docSnap.data().data)) {
            const serverData = docSnap.data().data;
            setStructure(serverData);
            localStorage.setItem('estructura_cache', JSON.stringify(serverData));
          }
        }
      } catch (err) {
        console.error("Error loading structure:", err);
      } finally {
        if (active) setIsSyncing(false);
      }
    };
    fetchStructure();
    return () => { active = false; };
  }, []);

  const toggleExpand = (id) => {
    setExpandedFeds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleStartEdit = () => {
    setTempStructure(JSON.parse(JSON.stringify(structure)));
    setEditing(true);
  };

  const handleCancelEdit = () => {
    setEditing(false);
  };

  const handleChange = (fedId, locId, field, value) => {
    setTempStructure(prev => {
      const newStruct = [...prev];
      const fedIndex = newStruct.findIndex(f => f.id === fedId);
      if (fedIndex > -1) {
        if (!locId) {
          // Federal level change
          newStruct[fedIndex] = { ...newStruct[fedIndex], [field]: value };
        } else {
          // Local level change
          const locIndex = newStruct[fedIndex].locales.findIndex(l => l.id === locId);
          if (locIndex > -1) {
            newStruct[fedIndex].locales[locIndex] = { ...newStruct[fedIndex].locales[locIndex], [field]: value };
          }
        }
      }
      return newStruct;
    });
  };

  const requestSave = () => {
    setPin('');
    setPinError('');
    setShowPinModal(true);
  };

  const executeSave = async () => {
    if (!VALID_PINS.includes(pin)) {
      setPinError('PIN Inválido o usuario no autorizado.');
      return;
    }
    setPinError('');
    setSaving(true);
    try {
      const docRef = doc(db, 'config', 'estructura');
      await setDoc(docRef, { data: tempStructure });
      setStructure(tempStructure);
      localStorage.setItem('estructura_cache', JSON.stringify(tempStructure));
      setEditing(false);
      setShowPinModal(false);
    } catch (err) {
      console.error(err);
      setPinError('Error de conexión al guardar.');
    } finally {
      setSaving(false);
    }
  };

  const currentDisplay = editing ? tempStructure : structure;

  return (
    <div className="flex-col gap-6 animate-fade-in" style={{ paddingBottom: '3rem' }}>
      <header className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 style={{ fontSize: '1.5rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={24} color="var(--color-primary-light)" />
            Directorio: Estructura Estatal
            {isSyncing && <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginLeft: '1rem' }} className="animate-pulse">Sincronizando...</span>}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Listado de Coordinaciones de los 7 Distritos Federales y 21 Distritos Locales.
          </p>
        </div>
        {canEdit && !editing && (
          <button className="btn" onClick={handleStartEdit} style={{ border: '1px solid var(--border-color)' }}>
            <Edit2 size={16} /> Editar Directorio
          </button>
        )}
        {canEdit && editing && (
          <div className="flex gap-3">
            <button className="btn" onClick={handleCancelEdit} style={{ color: 'var(--status-error)' }}>
              <X size={16} /> Cancelar
            </button>
            <button className="btn btn-primary" onClick={requestSave}>
              <Save size={16} /> Guardar Cambios
            </button>
          </div>
        )}
      </header>

      <div className="flex-col gap-4">
        {currentDisplay && currentDisplay.map((fed) => {
          const isExpanded = expandedFeds[fed.id];

          return (
            <div key={fed.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div 
                className="flex items-center justify-between" 
                style={{ padding: '1rem 1.5rem', backgroundColor: 'var(--bg-surface-elevated)', borderBottom: isExpanded ? '1px solid var(--border-color)' : 'none', cursor: 'pointer' }}
                onClick={() => !editing && toggleExpand(fed.id)}
              >
                <div className="flex-col gap-1 w-full flex-1">
                  <div className="flex items-center gap-2">
                    <h3 style={{ fontSize: '1.125rem', margin: 0, color: 'var(--text-primary)' }}>{fed.name}</h3>
                  </div>
                  
                  <div className="flex gap-4 flex-wrap" style={{ marginTop: '0.5rem' }}>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>Coordinador(a) Federal</span>
                      {editing ? (
                        <input className="input" type="text" value={fed.coordinator || ''} onChange={(e) => handleChange(fed.id, null, 'coordinator', e.target.value)} onClick={e => e.stopPropagation()} />
                      ) : (
                        <strong style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{fed.coordinator || '-- Vacante --'}</strong>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>Suplente</span>
                      {editing ? (
                        <input className="input" type="text" value={fed.substitute || ''} onChange={(e) => handleChange(fed.id, null, 'substitute', e.target.value)} onClick={e => e.stopPropagation()} />
                      ) : (
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{fed.substitute || '-- Vacante --'}</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-center" style={{ padding: '0.5rem', cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); toggleExpand(fed.id); }}>
                    {isExpanded ? <ChevronUp size={20} color="var(--text-secondary)" /> : <ChevronDown size={20} color="var(--text-secondary)" />}
                </div>
              </div>

              {isExpanded && fed.locales && (
                <div className="flex-col" style={{ padding: '1rem 1.5rem', gap: '1rem', backgroundColor: 'var(--bg-surface)' }}>
                  <h4 style={{ fontSize: '0.875rem', color: 'var(--color-primary-light)', margin: '0 0 0.5rem 0', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                    Distritos Locales Pertenecientes ({fed.locales.length})
                  </h4>
                  
                  {fed.locales.map((loc) => (
                    <div key={loc.id} className="flex gap-4 flex-wrap" style={{ padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ flex: 1, minWidth: '150px', display: 'flex', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{loc.name}</span>
                      </div>
                      <div style={{ flex: 1, minWidth: '150px' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>Coordinador(a) Local</span>
                        {editing ? (
                          <input className="input" type="text" value={loc.coordinator || ''} onChange={(e) => handleChange(fed.id, loc.id, 'coordinator', e.target.value)} style={{ padding: '0.4rem', fontSize: '0.85rem' }} />
                        ) : (
                          <span style={{ fontSize: '0.85rem', color: 'white' }}>{loc.coordinator || '-- Vacante --'}</span>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: '150px' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>Suplente</span>
                        {editing ? (
                          <input className="input" type="text" value={loc.substitute || ''} onChange={(e) => handleChange(fed.id, loc.id, 'substitute', e.target.value)} style={{ padding: '0.4rem', fontSize: '0.85rem' }} />
                        ) : (
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{loc.substitute || '-- Vacante --'}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showPinModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, backdropFilter: 'blur(4px)' }}>
          <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '350px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', border: '1px solid var(--color-primary)' }}>
            <div className="flex items-center gap-3">
              <AlertTriangle color="var(--color-primary-light)" size={24} />
              <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Validar Edición</h2>
            </div>
            
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
              Ingresa tu PIN de administrador para guardar oficialmente los cambios en el directorio.
            </p>

            <div className="flex-col gap-2">
              <input 
                type="password" 
                maxLength="4"
                className="input" 
                style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem' }}
                placeholder="••••" 
                value={pin} 
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                autoFocus
              />
              {pinError && <p style={{ color: 'var(--status-error)', fontSize: '0.75rem', margin: 0 }}>{pinError}</p>}
            </div>

            <div className="flex justify-end gap-3" style={{ marginTop: '0.5rem' }}>
              <button className="btn" onClick={() => setShowPinModal(false)} disabled={saving} style={{ color: 'var(--text-secondary)' }}>Cancelar</button>
              <button className="btn btn-primary" onClick={executeSave} disabled={pin.length < 4 || saving}>
                {saving ? 'Guardando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
