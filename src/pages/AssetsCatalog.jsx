import React, { useState } from 'react';
import { 
  Layers, Plus, Search, MapPin, Image as ImageIcon, 
  Calendar, Users, Info, MoreVertical, Flag, Home, Paintbrush
} from 'lucide-react';
import './AssetsCatalog.css';

const ASSET_TYPES = [
  {
    id: 'bardas',
    name: 'Bardas & Fachadas',
    icon: Paintbrush,
    color: '#800020',
    description: 'Inventario de muros, bardas y fachadas con publicidad política. Control de permisos y estado físico.',
    count: 124,
    status: 'Activo'
  },
  {
    id: 'enlaces',
    name: 'Casas de Enlace',
    icon: Home,
    color: '#3b82f6',
    description: 'Puntos de contacto ciudadano y centros de coordinación local en cada colonia.',
    count: 18,
    status: 'En Verificación'
  },
  {
    id: 'eventos',
    name: 'Lugares de Eventos',
    icon: Flag,
    color: '#10b981',
    description: 'Plazas, parques y auditorios clave para la realización de mitines y asambleas.',
    count: 42,
    status: 'Planificación'
  },
  {
    id: 'equipos',
    name: 'Equipamiento',
    icon: Layers,
    color: '#f59e0b',
    description: 'Activos móviles y herramientas de apoyo (sonido, toldos, sillas, transporte).',
    count: 256,
    status: 'Mantenimiento'
  }
];

export default function AssetsCatalog() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredAssets = ASSET_TYPES.filter(asset => 
    asset.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="assets-catalog animate-fade-in">
      <header className="catalog-header">
        <div className="catalog-title">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-primary/20 text-primary-light text-xs font-bold px-2 py-1 rounded">INFRAESTRUCTURA</span>
          </div>
          <h1>Catálogo de Activos</h1>
          <p>Gestión estratégica de recursos territoriales y logística de campo.</p>
        </div>
        <div className="catalog-actions">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
            <input 
              type="text" 
              placeholder="Buscar tipo de activo..."
              className="pl-10 pr-4 py-2 bg-surface border border-border rounded-md text-sm focus:border-primary outline-none transition-all w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="btn-add-asset">
            <Plus size={20} />
            <span>Nuevo Tipo</span>
          </button>
        </div>
      </header>

      <section className="grid-assets">
        {filteredAssets.map((asset) => (
          <div key={asset.id} className="asset-type-card">
            <div className="asset-card-top flex justify-between items-start mb-4">
              <div 
                className="asset-icon-bg" 
                style={{ backgroundColor: `${asset.color}20`, color: asset.color }}
              >
                <asset.icon size={24} />
              </div>
              <button className="text-muted hover:text-white transition-colors">
                <MoreVertical size={20} />
              </button>
            </div>

            <div className="asset-type-info">
              <h3>{asset.name}</h3>
              <p>{asset.description}</p>
            </div>

            <div className="asset-meta">
              <div className="asset-count">
                <MapPin size={16} />
                <span>{asset.count} Registrados</span>
              </div>
              <button className="btn-view-details">
                Gestionar
              </button>
            </div>
          </div>
        ))}

        {/* Empty State / Add New Placeholder */}
        <div className="asset-type-card border-dashed flex flex-col items-center justify-center opacity-60 hover:opacity-100 cursor-pointer text-center py-8">
          <div className="w-12 h-12 rounded-full bg-border flex items-center justify-center mb-4">
            <Plus size={24} className="text-muted" />
          </div>
          <h4 className="font-semibold text-white">Añadir Categoría</h4>
          <p className="text-xs text-muted mt-2">Define un nuevo tipo de recurso<br />para el mapeo territorial.</p>
        </div>
      </section>

      {/* Stats Summary Footer */}
      <footer className="mt-12 p-6 bg-surface-elevated border border-border rounded-xl flex items-center justify-around">
        <div className="flex flex-col items-center">
          <span className="text-2xl font-bold text-white">440</span>
          <span className="text-xs text-muted uppercase tracking-wider">Total Activos</span>
        </div>
        <div className="w-px h-8 bg-border"></div>
        <div className="flex flex-col items-center">
          <span className="text-2xl font-bold text-primary-light">92%</span>
          <span className="text-xs text-muted uppercase tracking-wider">Eficiencia Logística</span>
        </div>
        <div className="w-px h-8 bg-border"></div>
        <div className="flex flex-col items-center">
          <span className="text-2xl font-bold text-success">12</span>
          <span className="text-xs text-muted uppercase tracking-wider">Altas Hoy</span>
        </div>
      </footer>
    </div>
  );
}
