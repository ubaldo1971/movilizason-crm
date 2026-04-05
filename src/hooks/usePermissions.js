import { useState, useEffect, useCallback } from 'react';
import { doc, onSnapshot, setDoc } from '../lib/dbService';
import { db } from '../firebaseConfig';

/*  ═══════════════════════════════════════════════════════════
    PERMISSION ACTIONS — Categorized by module
    ═══════════════════════════════════════════════════════════ */
export const PERMISSION_CATEGORIES = {
  brigadas: {
    label: '⚔️ Brigadas',
    actions: {
      'brigades.create':       { label: 'Crear brigadas', description: 'Puede crear nuevas brigadas' },
      'brigades.edit':         { label: 'Editar brigadas', description: 'Puede editar nombre, zona y datos de brigadas' },
      'brigades.delete':       { label: 'Eliminar brigadas', description: 'Puede eliminar brigadas existentes' },
      'brigades.add_members':  { label: 'Agregar miembros', description: 'Puede agregar miembros a una brigada' },
      'brigades.remove_members': { label: 'Remover miembros', description: 'Puede remover miembros de una brigada' },
      'brigades.set_leader':   { label: 'Nombrar líder', description: 'Puede asignar o cambiar el líder de brigada' },
      'brigades.change_status': { label: 'Cambiar estado', description: 'Puede cambiar estado (Activa/Formándose/Inactiva)' },
    }
  },
  estructura: {
    label: '🏛️ Estructura',
    actions: {
      'estructura.view':         { label: 'Ver estructura', description: 'Puede ver el organigrama jerárquico' },
      'estructura.edit':         { label: 'Editar cargos', description: 'Puede editar coordinadores y suplentes' },
      'estructura.assign_coord': { label: 'Asignar coordinadores', description: 'Puede nombrar coordinadores distritales' },
      'estructura.assign_brigadista': { label: 'Asignar brigadistas', description: 'Puede nombrar brigadistas y operadores' },
    }
  },
  tareas: {
    label: '📋 Tareas',
    actions: {
      'tasks.create':   { label: 'Crear tareas', description: 'Puede crear y asignar nuevas tareas' },
      'tasks.complete': { label: 'Completar tareas', description: 'Puede marcar tareas como completadas' },
      'tasks.delete':   { label: 'Eliminar tareas', description: 'Puede eliminar tareas existentes' },
      'tasks.reassign': { label: 'Reasignar tareas', description: 'Puede reasignar tareas a otros usuarios' },
    }
  },
  mensajes: {
    label: '💬 Mensajes',
    actions: {
      'messages.send':         { label: 'Enviar mensajes', description: 'Puede enviar mensajes en chats y brigadas' },
      'messages.create_group': { label: 'Crear grupos', description: 'Puede crear nuevos canales y brigadas de chat' },
      'messages.send_massive': { label: 'Mensajes masivos', description: 'Puede enviar mensajes a múltiples brigadas' },
    }
  },
  territorio: {
    label: '🗺️ Territorio',
    actions: {
      'territory.view':       { label: 'Ver mapa', description: 'Puede visualizar el mapa territorial' },
      'territory.edit_marks': { label: 'Editar marcadores', description: 'Puede agregar/editar marcadores en el mapa' },
    }
  },
  reportes: {
    label: '📊 Reportes',
    actions: {
      'reports.view':     { label: 'Ver reportes', description: 'Puede ver reportes de desempeño' },
      'reports.export':   { label: 'Exportar reportes', description: 'Puede exportar datos a Excel/PDF' },
      'reports.view_all': { label: 'Ver todos los reportes', description: 'Puede ver reportes de toda la estructura' },
    }
  }
};

// Roles that can be configured (Super Admin always has ALL permissions)
export const CONFIGURABLE_ROLES = [
  'Admin Estatal',
  'Coordinador Distrital Federal',
  'Coordinador Distrital Local',
  'Coordinador Seccional',
  'Brigadista / Operador',
];

// Default permission matrix — what each role gets by default
const DEFAULT_PERMISSIONS = {
  'Admin Estatal': {
    'brigades.create': true, 'brigades.edit': true, 'brigades.delete': true,
    'brigades.add_members': true, 'brigades.remove_members': true,
    'brigades.set_leader': true, 'brigades.change_status': true,
    'estructura.view': true, 'estructura.edit': true,
    'estructura.assign_coord': true, 'estructura.assign_brigadista': true,
    'tasks.create': true, 'tasks.complete': true, 'tasks.delete': true, 'tasks.reassign': true,
    'messages.send': true, 'messages.create_group': true, 'messages.send_massive': true,
    'territory.view': true, 'territory.edit_marks': true,
    'reports.view': true, 'reports.export': true, 'reports.view_all': true,
  },
  'Coordinador Distrital Federal': {
    'brigades.create': true, 'brigades.edit': true, 'brigades.delete': false,
    'brigades.add_members': true, 'brigades.remove_members': true,
    'brigades.set_leader': true, 'brigades.change_status': false,
    'estructura.view': true, 'estructura.edit': false,
    'estructura.assign_coord': false, 'estructura.assign_brigadista': true,
    'tasks.create': true, 'tasks.complete': true, 'tasks.delete': false, 'tasks.reassign': true,
    'messages.send': true, 'messages.create_group': true, 'messages.send_massive': false,
    'territory.view': true, 'territory.edit_marks': true,
    'reports.view': true, 'reports.export': true, 'reports.view_all': false,
  },
  'Coordinador Distrital Local': {
    'brigades.create': true, 'brigades.edit': true, 'brigades.delete': false,
    'brigades.add_members': true, 'brigades.remove_members': false,
    'brigades.set_leader': true, 'brigades.change_status': false,
    'estructura.view': true, 'estructura.edit': false,
    'estructura.assign_coord': false, 'estructura.assign_brigadista': true,
    'tasks.create': true, 'tasks.complete': true, 'tasks.delete': false, 'tasks.reassign': false,
    'messages.send': true, 'messages.create_group': true, 'messages.send_massive': false,
    'territory.view': true, 'territory.edit_marks': true,
    'reports.view': true, 'reports.export': false, 'reports.view_all': false,
  },
  'Coordinador Seccional': {
    'brigades.create': false, 'brigades.edit': false, 'brigades.delete': false,
    'brigades.add_members': true, 'brigades.remove_members': false,
    'brigades.set_leader': false, 'brigades.change_status': false,
    'estructura.view': true, 'estructura.edit': false,
    'estructura.assign_coord': false, 'estructura.assign_brigadista': true,
    'tasks.create': true, 'tasks.complete': true, 'tasks.delete': false, 'tasks.reassign': false,
    'messages.send': true, 'messages.create_group': false, 'messages.send_massive': false,
    'territory.view': true, 'territory.edit_marks': false,
    'reports.view': true, 'reports.export': false, 'reports.view_all': false,
  },
  'Brigadista / Operador': {
    'brigades.create': false, 'brigades.edit': false, 'brigades.delete': false,
    'brigades.add_members': false, 'brigades.remove_members': false,
    'brigades.set_leader': false, 'brigades.change_status': false,
    'estructura.view': true, 'estructura.edit': false,
    'estructura.assign_coord': false, 'estructura.assign_brigadista': false,
    'tasks.create': false, 'tasks.complete': true, 'tasks.delete': false, 'tasks.reassign': false,
    'messages.send': true, 'messages.create_group': false, 'messages.send_massive': false,
    'territory.view': true, 'territory.edit_marks': false,
    'reports.view': false, 'reports.export': false, 'reports.view_all': false,
  },
};

// Get ALL action keys
export function getAllActionKeys() {
  const keys = [];
  Object.values(PERMISSION_CATEGORIES).forEach(cat => {
    Object.keys(cat.actions).forEach(key => keys.push(key));
  });
  return keys;
}

/*  ═══════════════════════════════════════════════════════════
    usePermissions HOOK
    ═══════════════════════════════════════════════════════════ */
export function usePermissions() {
  const [permissionMatrix, setPermissionMatrix] = useState(DEFAULT_PERMISSIONS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Listen to Firestore for live updates
  useEffect(() => {
    const docRef = doc(db, 'app_config', 'permissions');
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        // Merge with defaults to ensure new permissions are included
        const merged = {};
        for (const role of CONFIGURABLE_ROLES) {
          merged[role] = { ...DEFAULT_PERMISSIONS[role], ...(data[role] || {}) };
        }
        setPermissionMatrix(merged);
      }
      setLoading(false);
    }, () => {
      // Error or no doc — use defaults
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Toggle a single permission
  const togglePermission = useCallback((role, action) => {
    setPermissionMatrix(prev => ({
      ...prev,
      [role]: { ...prev[role], [action]: !prev[role][action] }
    }));
  }, []);

  // Save to Firestore
  const savePermissions = useCallback(async () => {
    setSaving(true);
    try {
      const docRef = doc(db, 'app_config', 'permissions');
      await setDoc(docRef, permissionMatrix);
    } catch (e) {
      console.error('Error saving permissions:', e);
    }
    setSaving(false);
  }, [permissionMatrix]);

  // Check if a specific role has a specific permission
  const hasPermission = useCallback((role, action) => {
    if (role === 'Super Admin') return true; // Super Admin always has all
    return permissionMatrix[role]?.[action] ?? false;
  }, [permissionMatrix]);

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    setPermissionMatrix({ ...DEFAULT_PERMISSIONS });
  }, []);

  return {
    permissionMatrix,
    loading,
    saving,
    togglePermission,
    savePermissions,
    hasPermission,
    resetToDefaults,
  };
}
