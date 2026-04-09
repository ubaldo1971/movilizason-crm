import React, { useState, useEffect } from 'react';
import { useRole } from '../context/RoleContext';
import { db } from '../firebaseConfig';
import { doc, getDoc, setDoc, updateDoc } from '../lib/dbService';
import { 
  ChevronDown, ChevronUp, Edit2, Save, X, Users, 
  AlertTriangle, Plus, Trash2, MapPin, Settings, 
  Info, Phone, MessageSquare, Volume2, Video
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useComms } from '../context/CommunicationContext';
import { FEDERAL_DISTRICTS, LOCAL_DISTRICTS } from '../data/territoryData';
import { collection, onSnapshot, arrayUnion } from '../lib/dbService';

const formatName = (user) => {
    if (!user) return 'Usuario';
    return `${user.displayName || ''} ${user.surname || ''}`.trim() || user.email || 'Usuario';
};

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
  const { role, ROLES, VALID_PINS, allUsers, formatName, currentUser } = useRole();
  const { joinVoiceChannel } = useComms();
  const navigate = useNavigate();
  const [structure, setStructure] = useState(() => {
    const cached = localStorage.getItem('estructura_cache');
    return cached ? JSON.parse(cached) : INITIAL_STRUCTURE;
  });
  const [editing, setEditing] = useState(false);
  const [tempStructure, setTempStructure] = useState([]);
  const [expandedFeds, setExpandedFeds] = useState({});
  const [isSyncing, setIsSyncing] = useState(true);
  const [pin, setPin] = useState('');
  const [showPinModal, setShowPinModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pinError, setPinError] = useState('');
  const [showRegistry, setShowRegistry] = useState(false);
  const [allBrigades, setAllBrigades] = useState([]);
  const [assigningUser, setAssigningUser] = useState(null); // User object being assigned
  
  // Search state for dropdowns
  const [searchTerm, setSearchTerm] = useState({}); // { 'fedId-locId-roleType-idx': 'query' }
  const [showDropdown, setShowDropdown] = useState(null); // 'fedId-locId-roleType-idx'

  const unassignedUsers = allUsers.filter(u => {
    const isAssigned = (u.assignments && Object.keys(u.assignments).length > 0) || u.brigadeId;
    const hasPrivilegedRole = Object.values(ROLES).includes(u.role);
    return !isAssigned && !hasPrivilegedRole;
  });

  const canEdit = role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN_ESTATAL;

  useEffect(() => {
    const loadStructure = async () => {
        try {
            const docRef = doc(db, 'settings', 'territorial_structure');
            const snap = await getDoc(docRef);
            if (snap.exists()) {
                setStructure(snap.data().data);
                localStorage.setItem('estructura_cache', JSON.stringify(snap.data().data));
            }
        } catch (e) { console.error(e); }
        finally { setIsSyncing(false); }
    };
    loadStructure();

    // Fetch Brigades for quick assignment
    const unsubBrigades = onSnapshot(collection(db, 'brigades'), (snapshot) => {
        setAllBrigades(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsubBrigades();
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

  const handleAddDistrict = () => {
    const id = `fed-${tempStructure.length + 1}`;
    setTempStructure([...tempStructure, { id, name: `Nuevo Distrito Federal ${tempStructure.length + 1}`, coordinator: '', substitute: '', locales: [] }]);
  };

  const handleRemoveDistrict = (id, locId = null) => {
    let newStruct = JSON.parse(JSON.stringify(tempStructure));
    if (locId) {
        const fed = newStruct.find(f => f.id === id);
        fed.locales = fed.locales.filter(l => l.id !== locId);
    } else {
        newStruct = newStruct.filter(f => f.id !== id);
    }
    setTempStructure(newStruct);
  };

  const handleAddLocal = (fedId) => {
    const newStruct = JSON.parse(JSON.stringify(tempStructure));
    const fed = newStruct.find(f => f.id === fedId);
    const locId = `loc-${Math.random().toString(36).substr(2, 5)}`;
    fed.locales.push({ id: locId, name: 'Nuevo Distrito Local', coordinator: '', substitute: '' });
    setTempStructure(newStruct);
  };

  const handleRename = (id, locId, newName) => {
    const newStruct = JSON.parse(JSON.stringify(tempStructure));
    const fed = newStruct.find(f => f.id === id);
    if (locId) {
        const loc = fed.locales.find(l => l.id === locId);
        loc.name = newName;
    } else {
        fed.name = newName;
    }
    setTempStructure(newStruct);
  };

  const handleAddSectionToLocal = (fedId, locId, sectionNum) => {
    const newStruct = JSON.parse(JSON.stringify(tempStructure));
    const fed = newStruct.find(f => f.id === fedId);
    const loc = fed.locales.find(l => l.id === locId);
    if (!loc.sections) loc.sections = [];
    if (!loc.sections.includes(sectionNum)) loc.sections.push(sectionNum);
    setTempStructure(newStruct);
  };

  const handleRemoveSectionFromLocal = (fedId, locId, sectionNum) => {
    const newStruct = JSON.parse(JSON.stringify(tempStructure));
    const fed = newStruct.find(f => f.id === fedId);
    const loc = fed.locales.find(l => l.id === locId);
    loc.sections = loc.sections.filter(s => s !== sectionNum);
    setTempStructure(newStruct);
  };

  const handleRemovePerson = (fedId, locId, roleType, idx, sectionId = null) => {
    const newStruct = JSON.parse(JSON.stringify(tempStructure));
    const f = newStruct.find(item => item.id === fedId);
    let p = f;
    if (locId) p = f.locales.find(l => l.id === locId);
    
    if (sectionId) {
        p.seccionales[sectionId].splice(idx, 1);
    } else {
        p[roleType].splice(idx, 1);
    }
    setTempStructure(newStruct);
  };

  const requestSave = () => {
    setShowPinModal(true);
  };

  const executeSave = async () => {
    if (pin !== VALID_PINS.ADMIN_ESTATAL && pin !== VALID_PINS.SUPER_ADMIN) {
        setPinError('PIN Incorrecto');
        return;
    }

    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'territorial_structure'), { 
        data: tempStructure,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser.displayName
      });

      // Update user roles and assignments based on the new structure
      const userUpdates = {};
      tempStructure.forEach(fed => {
        // Federal Coord
        (fed.coordinators || []).forEach(name => {
            if (name) userUpdates[name.trim().toLowerCase()] = { role: ROLES.COORD_FED, assignments: { fedId: fed.id } };
        });
        // Federal Substitute
        (fed.substitutes || []).forEach(name => {
            if (name) userUpdates[name.trim().toLowerCase()] = { role: ROLES.COORD_FED, assignments: { fedId: fed.id, isSubstitute: true } };
        });

        fed.locales.forEach(loc => {
            // Local Coord
            (loc.coordinators || []).forEach(name => {
                if (name) userUpdates[name.trim().toLowerCase()] = { role: ROLES.COORD_LOC, assignments: { fedId: fed.id, locId: loc.id } };
            });
            // Local Substitute
            (loc.substitutes || []).forEach(name => {
                if (name) userUpdates[name.trim().toLowerCase()] = { role: ROLES.COORD_LOC, assignments: { fedId: fed.id, locId: loc.id, isSubstitute: true } };
            });

            // Seccionals
            Object.entries(loc.seccionales || {}).forEach(([sId, names]) => {
                names.forEach(name => {
                    if (name) {
                        userUpdates[name.trim().toLowerCase()] = { role: ROLES.COORD_SEC, assignments: { fedId: fed.id, locId: loc.id, sectionId: sId } };
                    }
                });
            });
        });
      });

      // Aplicar actualizaciones en Firestore
      for (const [key, data] of Object.entries(userUpdates)) {
        const foundUser = allUsers.find(u => `${u.displayName} ${u.surname || ''}`.trim().toLowerCase() === key);
        if (foundUser) {
            await updateDoc(doc(db, 'users', foundUser.uid || foundUser.id), {
                role: data.role,
                assignments: data.assignments,
                inStructure: true,
                updatedAt: new Date().toISOString()
            });
        }
      }

      setStructure(tempStructure);
      localStorage.setItem('estructura_cache', JSON.stringify(tempStructure));
      setEditing(false);
      setShowPinModal(false);
      setPin('');
      alert('¡Estructura y perfiles sincronizados con éxito!');
    } catch (error) {
      console.error("Error saving structure:", error);
      alert('Error crítico al sincronizar la estructura.');
    } finally {
      setSaving(false);
    }
  };
  
  const handleConfirmQuickAssign = async (target) => {
    // target: { type: 'FEDERAL'|'LOCAL'|'BRIGADE', targetId: string, roleType: 'coordinators'|'substitutes'|'member', fedId?: string }
    const user = assigningUser;
    if (!user) return;

    setSaving(true);
    try {
        const userName = formatName(user);
        const newStruct = JSON.parse(JSON.stringify(structure));

        if (target.type === 'FEDERAL') {
            const fed = newStruct.find(f => f.id === target.targetId);
            if (!fed[target.roleType]) fed[target.roleType] = [];
            fed[target.roleType].push(userName);

            await setDoc(doc(db, 'settings', 'territorial_structure'), { data: newStruct }, { merge: true });
            await updateDoc(doc(db, 'users', user.uid || user.id), {
                role: ROLES.COORD_DISTRITAL_FED,
                assignments: { fedId: target.targetId, isSubstitute: target.roleType === 'substitutes' },
                inStructure: true,
                updatedAt: new Date().toISOString()
            });
            setStructure(newStruct);
        } 
        else if (target.type === 'LOCAL') {
            const fed = newStruct.find(f => f.id === target.fedId);
            const loc = fed.locales.find(l => l.id === target.targetId);
            if (!loc[target.roleType]) loc[target.roleType] = [];
            loc[target.roleType].push(userName);

            await setDoc(doc(db, 'settings', 'territorial_structure'), { data: newStruct }, { merge: true });
            await updateDoc(doc(db, 'users', user.uid || user.id), {
                role: ROLES.COORD_DISTRITAL_LOC,
                assignments: { fedId: target.fedId, locId: target.targetId, isSubstitute: target.roleType === 'substitutes' },
                inStructure: true,
                updatedAt: new Date().toISOString()
            });
            setStructure(newStruct);
        }
        else if (target.type === 'BRIGADE') {
            const brigadeRef = doc(db, 'brigades', target.targetId);
            const brigade = allBrigades.find(b => b.id === target.targetId);
            
            await updateDoc(brigadeRef, {
                members: arrayUnion({
                    id: user.uid || user.id,
                    name: userName,
                    role: 'Brigadista',
                    joinedAt: new Date().toISOString().split('T')[0]
                })
            });

            await updateDoc(doc(db, 'users', user.uid || user.id), {
                role: ROLES.BRIGADISTA,
                brigadeId: target.targetId,
                brigadeName: (brigade?.emoji || '') + ' ' + (brigade?.name || ''),
                inStructure: false,
                updatedAt: new Date().toISOString()
            });
        }

        setAssigningUser(null);
        alert('Asignación completada con éxito.');
    } catch (error) {
        console.error("Quick assign error:", error);
        alert('Error al procesar la asignación.');
    } finally {
        setSaving(false);
    }
  };

  const handleStartInternalCall = (userId) => {
    // Navigate to communication page and automatically join the general comando channel
    // In a real production app, this would trigger a DM call
    joinVoiceChannel('comando', currentUser.uid);
    navigate('/communication');
  };

  const handleStartPrivateChat = (userId) => {
    navigate(`/messages?uid=${userId}`);
  };

  const handleSeedData = async () => {
    if (confirm('¿Deseas crear los 5 registros demo en la base de datos?')) {
        const { seedDemoUsers } = await import('../lib/dbService');
        await seedDemoUsers();
        alert('Registros demo creados con éxito.');
    }
  };

  const renderPersonList = (fedId, locId, roleType, title, sectionId = null) => {
    const isSuperAdmin = role === ROLES.SUPER_ADMIN;
    let list = [];
    
    const fed = (editing ? tempStructure : structure).find(f => f.id === fedId);
    if (fed) {
        let parent = fed;
        if (locId) parent = fed.locales.find(l => l.id === locId);
        
        if (parent) {
            if (sectionId) {
                list = (parent.seccionales && parent.seccionales[sectionId]) || [];
            } else {
                list = parent[roleType] || [];
            }
        }
    }

    return (
      <div className="person-role-group" style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
        <div className="role-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{title}</span>
          {editing && isSuperAdmin && (
            <button 
              className="btn-icon"
              onClick={(e) => {
                e.stopPropagation();
                const newStruct = JSON.parse(JSON.stringify(tempStructure));
                const f = newStruct.find(item => item.id === fedId);
                let p = f;
                if (locId) p = f.locales.find(l => l.id === locId);
                
                if (sectionId) {
                    if (!p.seccionales) p.seccionales = {};
                    if (!p.seccionales[sectionId]) p.seccionales[sectionId] = [];
                    p.seccionales[sectionId].push('');
                } else {
                    if (!p[roleType]) p[roleType] = [];
                    p[roleType].push('');
                }
                setTempStructure(newStruct);
              }}
              style={{ padding: '2px', backgroundColor: 'var(--color-primary)', borderRadius: '4px', color: 'white' }}
            >
              <Plus size={14} />
            </button>
          )}
        </div>
        <div className="flex-col gap-2">
          {list.length > 0 ? (
            list.map((name, idx) => {
              const matchedUser = name ? allUsers.find(u => formatName(u)?.toLowerCase() === name.toLowerCase()) : null;
              
              return (
              <div key={idx} className="flex-col gap-1" style={{ 
                backgroundColor: 'rgba(255,255,255,0.03)', 
                padding: '10px', 
                borderRadius: '12px', 
                border: '1px solid var(--border-color)',
                position: 'relative'
              }}>
                <div className="flex items-center gap-3">
                  {/* Photo/Avatar */}
                  <div style={{ position: 'relative' }}>
                    <img 
                      src={matchedUser?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'V')}&background=random&color=fff`} 
                      alt=""
                      style={{ width: '36px', height: '36px', borderRadius: '10px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)' }}
                    />
                    {matchedUser && (
                      <div style={{ 
                        position: 'absolute', bottom: -2, right: -2, 
                        width: '10px', height: '10px', borderRadius: '50%', 
                        backgroundColor: 'var(--status-success)', border: '2px solid #1a1b1e' 
                      }}></div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'white' }}>{name || 'Vacante'}</div>
                        {matchedUser && (
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{matchedUser.phone}</div>
                        )}
                    </div>
                    {editing ? (
                      <div className="flex-col">
                        <input
                          type="text"
                          className="no-border-input"
                          value={name}
                          onFocus={() => setShowDropdown(`${fedId}-${locId}-${roleType}-${idx}-${sectionId}`)}
                          onChange={(e) => {
                            const val = e.target.value;
                            const newStruct = JSON.parse(JSON.stringify(tempStructure));
                            const f = newStruct.find(item => item.id === fedId);
                            let p = f;
                            if (locId) p = f.locales.find(l => l.id === locId);
                            
                            if (sectionId) p.seccionales[sectionId][idx] = val;
                            else p[roleType][idx] = val;
                            
                            setTempStructure(newStruct);
                            setSearchTerm(prev => ({ ...prev, [`${fedId}-${locId}-${roleType}-${idx}-${sectionId}`]: val }));
                          }}
                          placeholder="Nombre o seleccione..."
                          style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '0.9rem', width: '100%', outline: 'none', fontWeight: 600 }}
                        />
                        
                        {showDropdown === `${fedId}-${locId}-${roleType}-${idx}-${sectionId}` && (
                          <div className="card shadow-xl" style={{ 
                            position: 'absolute', zIndex: 100, top: '100%', left: 0, right: 0, 
                            maxHeight: '200px', overflowY: 'auto', backgroundColor: '#25262b', padding: '5px' 
                          }}>
                            {unassignedUsers
                              .filter(u => formatName(u).toLowerCase().includes((searchTerm[`${fedId}-${locId}-${roleType}-${idx}-${sectionId}`] || '').toLowerCase()))
                              .map(u => (
                                <div 
                                  key={u.uid} 
                                  className="dropdown-item p-2 hover-bg flex items-center gap-2"
                                  style={{ cursor: 'pointer', borderRadius: '6px', fontSize: '0.85rem' }}
                                  onClick={() => {
                                    const newStruct = JSON.parse(JSON.stringify(tempStructure));
                                    const f = newStruct.find(item => item.id === fedId);
                                    let p = f;
                                    if (locId) p = f.locales.find(l => l.id === locId);
                                    
                                    const fullName = formatName(u);
                                    if (sectionId) p.seccionales[sectionId][idx] = fullName;
                                    else p[roleType][idx] = fullName;
                                    
                                    setTempStructure(newStruct);
                                    setShowDropdown(null);
                                  }}
                                >
                                  <img src={u.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(formatName(u))}`} style={{ width: '24px', height: '24px', borderRadius: '50%' }} alt=""/>
                                  {formatName(u)}
                                </div>
                              ))
                            }
                            <div className="p-2 border-t border-white-10 text-xs text-secondary" onClick={() => setShowDropdown(null)}>Cerrar</div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex-col">
                        <span style={{ 
                          fontSize: '0.9rem', 
                          fontWeight: 600,
                          color: name ? 'white' : 'var(--text-secondary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: 'block'
                        }}>
                          {name || 'Vacante'}
                        </span>
                        {matchedUser?.phone && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Phone size={10} /> {matchedUser.phone}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {editing && isSuperAdmin && (
                    <button 
                      onClick={() => handleRemovePerson(fedId, locId, roleType, idx, sectionId)}
                      style={{ color: 'var(--status-error)', opacity: 0.7, padding: '4px', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      <X size={16} />
                    </button>
                  )}

                  {!editing && matchedUser && (
                    <div className="flex gap-1">
                      <button 
                        onClick={() => handleStartInternalCall(matchedUser.uid)}
                        className="btn-icon"
                        style={{ padding: '6px', color: 'var(--color-primary-light)', backgroundColor: 'rgba(168, 85, 247, 0.1)', borderRadius: '8px' }}
                      >
                        <Volume2 size={14} />
                      </button>
                      <button 
                        onClick={() => handleStartPrivateChat(matchedUser.uid)}
                        className="btn-icon"
                        style={{ padding: '6px', color: 'var(--status-info)', backgroundColor: 'rgba(14, 165, 233, 0.1)', borderRadius: '8px' }}
                      >
                        <MessageSquare size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              );
            })
          ) : (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Sin asignar</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex-col gap-6 animate-fade-in" style={{ paddingBottom: '3rem' }}>
      <header className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 style={{ fontSize: '1.5rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MapPin size={24} color="var(--color-primary-light)" />
            Estructura Territorial
            {isSyncing && <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginLeft: '1rem' }} className="animate-pulse">Cargando...</span>}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Coordinación táctica de Distritos y Secciones via Comando Central.
          </p>
        </div>
        <div className="flex gap-2">
          {role === ROLES.SUPER_ADMIN && (
            <button className="btn" onClick={handleSeedData} style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
              Crear Demo Users
            </button>
          )}
          <button className="btn" onClick={() => setShowRegistry(!showRegistry)} style={{ border: '1px solid var(--border-color)', position: 'relative' }}>
            <Users size={16} /> Registro General
            {unassignedUsers.length > 0 && (
                <span style={{ position: 'absolute', top: -5, right: -5, backgroundColor: 'var(--color-primary)', color: 'white', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                    {unassignedUsers.length}
                </span>
            )}
          </button>
          {canEdit && !editing && (
            <button className="btn" onClick={handleStartEdit} style={{ border: '1px solid var(--border-color)' }}>
              <Edit2 size={16} /> Editar
            </button>
          )}
          {editing && (
            <>
              {role === ROLES.SUPER_ADMIN && (
                <button className="btn" onClick={handleAddDistrict} style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                  <Plus size={16} /> Distrito
                </button>
              )}
              <button className="btn btn-primary" onClick={requestSave}>
                <Save size={16} /> Sincronizar
              </button>
              <button className="btn" onClick={handleCancelEdit} style={{ color: 'var(--status-error)' }}>
                <X size={16} /> Salir
              </button>
            </>
          )}
        </div>
      </header>

      <div className="flex gap-6 relative" style={{ minHeight: '80vh' }}>
        <div className="flex-1">
        {structure && structure.map((fed) => {
          const isExpanded = expandedFeds[fed.id];
          const districtNum = fed.id.split('-')[1] || '?';

          return (
            <div 
              key={fed.id} 
              className="card animate-scale-in" 
              style={{ 
                padding: 0, 
                overflow: 'hidden', 
                borderLeft: '4px solid var(--color-primary)',
                gridColumn: isExpanded ? '1 / -1' : 'auto',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                height: 'fit-content'
              }}
            >
              <div 
                className="flex items-center justify-between" 
                style={{ 
                  padding: '0.85rem 1.25rem', 
                  backgroundColor: 'var(--bg-surface-elevated)', 
                  cursor: 'pointer',
                  borderBottom: isExpanded ? '1px solid var(--border-color)' : 'none'
                }}
                onClick={() => toggleExpand(fed.id)}
              >
                <div className="flex items-center gap-4 flex-1">
                  <div style={{ 
                    width: '32px', 
                    height: '32px', 
                    borderRadius: '8px', 
                    backgroundColor: 'rgba(168, 85, 247, 0.1)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    border: '1px solid rgba(168, 85, 247, 0.2)',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    color: '#a855f7'
                  }}>
                    {districtNum}
                  </div>
                  
                  <div className="flex-col flex-1">
                    <div className="flex items-center gap-2">
                       <h3 style={{ fontSize: '1rem', margin: 0, color: 'var(--color-primary-light)' }}>{fed.name}</h3>
                    </div>
                    
                    {!isExpanded && (
                       <div className="flex gap-4 mt-2">
                        <div className="flex items-center gap-2" style={{ opacity: 0.8 }}>
                          <Users size={12} color="#a855f7" />
                          <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{fed.coordinators?.[0] || 'Sin asignar'}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  {isExpanded && (
                    <div className="flex gap-6 animate-fade-in" style={{ marginRight: '1rem' }}>
                      {renderPersonList(fed.id, null, 'coordinators', 'C. Federal')}
                      {renderPersonList(fed.id, null, 'substitutes', 'Suplente')}
                    </div>
                  )}
                  <ChevronDown size={18} style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: '0.3s', opacity: 0.5 }} />
                </div>
              </div>

              {isExpanded && (
                <div style={{ padding: '1.25rem', backgroundColor: 'rgba(0,0,0,0.1)', borderTop: '1px solid var(--border-color)' }}>
                  <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0.75rem' }}>
                    {fed.locales && fed.locales.map((loc) => (
                      <div key={loc.id} className="card" style={{ padding: '0.75rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-surface)' }}>
                        <div className="flex justify-between items-center mb-2">
                          <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{loc.name}</span>
                        </div>
                        <div className="flex-col gap-4">
                           <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
                             {renderPersonList(fed.id, loc.id, 'coordinators', 'C. Local')}
                             {renderPersonList(fed.id, loc.id, 'substitutes', 'Suplente')}
                           </div>

                           <div style={{ marginTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.75rem' }}>
                             <div className="flex flex-wrap gap-2">
                                {loc.sections && loc.sections.map(s => (
                                    <div key={s} style={{ backgroundColor: 'var(--bg-surface-elevated)', padding: '6px', borderRadius: '8px', border: '1px solid var(--border-color)', minWidth: '120px' }}>
                                        <div className="flex justify-between items-center mb-2">
                                            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-primary-light)' }}>S. {s}</span>
                                        </div>
                                        {renderPersonList(fed.id, loc.id, null, 'Seccional', s)}
                                    </div>
                                ))}
                             </div>
                           </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        </div>

        {showRegistry && (
          <aside className="card animate-fade-in" style={{ width: '300px', alignSelf: 'start', position: 'sticky', top: '1rem', maxHeight: 'calc(100vh - 100px)', overflowY: 'auto' }}>
            <div className="flex justify-between items-center mb-4">
                <h3 style={{ fontSize: '1rem', margin: 0 }}>Registro General</h3>
                <button onClick={() => setShowRegistry(false)}><X size={14} /></button>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                Personas registradas sin cargo vigente.
            </p>
            <div className="flex-col gap-3">
                {unassignedUsers.map(u => (
                    <div key={u.uid} className="flex-col p-3 rounded-xl border border-white-5 hover-bg transition-all">
                        <div className="flex items-center gap-3">
                            <img src={u.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(formatName(u))}`} style={{ width: '32px', height: '32px', borderRadius: '8px' }} alt=""/>
                            <div className="flex-1 min-w-0">
                                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'white' }}>{formatName(u)}</div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{u.phone}</div>
                            </div>
                            <button 
                                className="btn-icon" 
                                style={{ color: 'var(--color-primary-light)', padding: '5px' }}
                                onClick={() => setAssigningUser(u)}
                                title="Asignar Cargo"
                            >
                                <Plus size={16} />
                            </button>
                        </div>
                    </div>
                ))}
                {unassignedUsers.length === 0 && (
                    <div className="text-center p-4 text-xs text-secondary italic">No hay nuevos registros</div>
                )}
            </div>
          </aside>
        )}
      </div>

      {assigningUser && (
        <QuickAssignModal 
            user={assigningUser}
            structure={structure}
            brigades={allBrigades}
            onClose={() => setAssigningUser(null)}
            onConfirm={handleConfirmQuickAssign}
            loading={saving}
        />
      )}
    </div>
  );
}

function QuickAssignModal({ user, structure, brigades, onClose, onConfirm, loading }) {
    const [tab, setTab] = useState('FEDERAL'); // FEDERAL, LOCAL, BRIGADE
    const [selectedFed, setSelectedFed] = useState('');
    const [selectedLoc, setSelectedLoc] = useState('');
    const [selectedBrigade, setSelectedBrigade] = useState('');
    const [roleType, setRoleType] = useState('coordinators');

    const handleConfirm = () => {
        let target = { type: tab, roleType };
        if (tab === 'FEDERAL') target.targetId = selectedFed;
        if (tab === 'LOCAL') {
            target.targetId = selectedLoc;
            // Find which Fed this Loc belongs to
            const fed = structure.find(f => f.locales.some(l => l.id === selectedLoc));
            target.fedId = fed?.id;
        }
        if (tab === 'BRIGADE') target.targetId = selectedBrigade;

        if (!target.targetId) {
            alert('Por favor seleccione un destino.');
            return;
        }
        onConfirm(target);
    };

    return (
        <div className="modal-backdrop" style={{ zIndex: 2000 }}>
            <div className="card animate-scale-in" style={{ maxWidth: '500px', width: '90%', padding: '0', overflow: 'hidden' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-surface-elevated)' }}>
                    <div className="flex items-center gap-3">
                        <div style={{ backgroundColor: 'var(--color-primary)', width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Edit2 size={20} color="white" />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '1.1rem', margin: 0 }}>Asignar Cargo</h2>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>{formatName(user)}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="btn-icon"><X size={20} /></button>
                </div>

                <div style={{ padding: '1.5rem' }}>
                    <div className="flex gap-2 mb-6" style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '12px' }}>
                        {['FEDERAL', 'LOCAL', 'BRIGADE'].map(t => (
                            <button 
                                key={t}
                                onClick={() => setTab(t)}
                                style={{ 
                                    flex: 1, padding: '10px', borderRadius: '8px', border: 'none', 
                                    fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                                    backgroundColor: tab === t ? 'var(--color-primary)' : 'transparent',
                                    color: tab === t ? 'white' : 'var(--text-secondary)',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {t === 'FEDERAL' ? 'Distrito Fed' : t === 'LOCAL' ? 'Distrito Loc' : 'Brigada'}
                            </button>
                        ))}
                    </div>

                    <div className="flex-col gap-4">
                        {tab === 'FEDERAL' && (
                            <div className="flex-col gap-2">
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Seleccionar Distrito Federal</label>
                                <select 
                                    className="input" 
                                    value={selectedFed} 
                                    onChange={e => setSelectedFed(e.target.value)}
                                    style={{ width: '100%', padding: '12px' }}
                                >
                                    <option value="">-- Seleccionar --</option>
                                    {FEDERAL_DISTRICTS.map(d => (
                                        <option key={d.id} value={d.id}>{d.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {tab === 'LOCAL' && (
                            <div className="flex-col gap-2">
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Seleccionar Distrito Local</label>
                                <select 
                                    className="input" 
                                    value={selectedLoc} 
                                    onChange={e => setSelectedLoc(e.target.value)}
                                    style={{ width: '100%', padding: '12px' }}
                                >
                                    <option value="">-- Seleccionar --</option>
                                    {LOCAL_DISTRICTS.map(d => (
                                        <option key={d.id} value={d.id}>{d.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {tab === 'BRIGADE' && (
                            <div className="flex-col gap-2">
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Seleccionar Brigada</label>
                                <select 
                                    className="input" 
                                    value={selectedBrigade} 
                                    onChange={e => setSelectedBrigade(e.target.value)}
                                    style={{ width: '100%', padding: '12px' }}
                                >
                                    <option value="">-- Seleccionar --</option>
                                    {brigades.map(b => (
                                        <option key={b.id} value={b.id}>{b.emoji} {b.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {tab !== 'BRIGADE' && (
                            <div className="flex-col gap-2 mt-2">
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Rol en el Distrito</label>
                                <div className="flex gap-2">
                                    <button 
                                        className={`btn ${roleType === 'coordinators' ? 'btn-primary' : ''}`}
                                        style={{ flex: 1, fontSize: '0.8rem' }}
                                        onClick={() => setRoleType('coordinators')}
                                    >
                                        Coordinador
                                    </button>
                                    <button 
                                        className={`btn ${roleType === 'substitutes' ? 'btn-primary' : ''}`}
                                        style={{ flex: 1, fontSize: '0.8rem' }}
                                        onClick={() => setRoleType('substitutes')}
                                    >
                                        Suplente
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ padding: '1.5rem', backgroundColor: 'var(--bg-surface-elevated)', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '12px' }}>
                    <button className="btn" style={{ flex: 1 }} onClick={onClose} disabled={loading}>Cancelar</button>
                    <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleConfirm} disabled={loading}>
                        {loading ? 'Procesando...' : (
                            <span className="flex items-center justify-center gap-2">
                                <Save size={16} /> Confirmar Asignación
                            </span>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
