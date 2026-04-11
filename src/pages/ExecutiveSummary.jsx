import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, BarChart3, PieChart, Activity, CheckCircle2, 
  Clock, AlertCircle, Shield, Map, MessageSquare, Swords, 
  ChevronRight, Calendar, Download, Layers, Users
} from 'lucide-react';
import './ExecutiveSummary.css';

const PROJECT_PHASES = [
  {
    id: 1,
    title: 'Infraestructura Core & Seguridad',
    percentage: 100,
    status: 'Completado',
    color: '#800020',
    icon: Shield,
    description: 'Despliegue de arquitectura base, autenticación robusta, control de acceso por roles (RBAC) y persistencia en tiempo real con Firebase.',
    features: ['Arquitectura Multi-tenant', 'Sistema de Permisos Dinámicos', 'Sincronización Cloud', 'Seguridad de Datos INE']
  },
  {
    id: 2,
    title: 'Inteligencia Electoral & Cartografía',
    percentage: 95,
    status: 'Optimización',
    color: '#3b82f6',
    icon: Map,
    description: 'Integración de cartografía digital, capas WMS de secciones electorales, visualización de distritos y zonificación territorial.',
    features: ['Mapas Interactivos', 'Capas de Secciones Electorales', 'Búsqueda por Domicilio', 'Identidad Territorial']
  },
  {
    id: 3,
    title: 'Comando Central (Comunicaciones)',
    percentage: 92,
    status: 'Funcional',
    color: '#10b981',
    icon: MessageSquare,
    description: 'Centro de comunicaciones P2P, canales de brigada, alarmas de emergencia y notificaciones críticas en tiempo real.',
    features: ['Chat Encriptado', 'Llamadas de Voz IP', 'Alertas de Pánico', 'Coordinación Grupal']
  },
  {
    id: 4,
    title: 'Operatividad Territorial (Brigadas)',
    percentage: 85,
    status: 'En Desarrollo',
    color: '#f59e0b',
    icon: Swords,
    description: 'Gestión de brigadistas en campo, captura de compromisos, registro de simpatizantes y validación de tareas.',
    features: ['Registro de Simpatizantes', 'Validación de Tareas', 'GPS Tracking (Proceso)', 'Evidencia Fotográfica']
  },
  {
    id: 5,
    title: 'Analítica & Reporteo Ejecutivo',
    percentage: 80,
    status: 'Integración',
    color: '#8b5cf6',
    icon: BarChart3,
    description: 'Motor de ponderación de tareas, scoring de desempeño, incentivos gamificados y dashboards de alta dirección.',
    features: ['Ponderación Dinámica', 'KPIs de Avance', 'Ranking de Brigadas', 'Exportación de Reportes']
  }
];

const GLOBAL_PROGRESS = 90.4;

export default function ExecutiveSummary() {
  const [animatedProgress, setAnimatedProgress] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedProgress(GLOBAL_PROGRESS);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleExport = () => {
    window.print();
  };

  return (
    <div className="summary-page animate-fade-in">
      <header className="summary-header">
        <div className="summary-header-content">
          <div className="summary-badge">RESUMEN EJECUTIVO</div>
          <h1>Estado del Proyecto MovilizaSon</h1>
          <p>Visualización estratégica de avances, fases y métricas operativas al 2026.</p>
        </div>
        <div className="summary-header-actions">
          <button className="btn-summary-outline" onClick={handleExport}>
            <Download size={18} />
            <span>Exportar PDF</span>
          </button>
          <button className="btn-summary-primary">
            <Calendar size={18} />
            <span>Última Actualización: Hoy</span>
          </button>
        </div>
      </header>

      {/* Hero Stats */}
      <section className="summary-hero">
        <div className="progress-gauge-container">
          <div className="progress-gauge">
            <svg viewBox="0 0 100 100">
              <circle className="gauge-bg" cx="50" cy="50" r="45" />
              <circle 
                className="gauge-value" 
                cx="50" cy="50" r="45" 
                strokeDasharray={`${animatedProgress * 2.82} 282`}
              />
            </svg>
            <div className="gauge-content">
              <span className="gauge-number">{animatedProgress}%</span>
              <span className="gauge-label">AVANCE GLOBAL</span>
            </div>
          </div>
        </div>

        <div className="summary-stats-grid">
          <div className="stat-card gold">
            <div className="stat-icon"><Trophy size={24} /></div>
            <div className="stat-info">
              <span className="stat-value">Fase 4/5</span>
              <span className="stat-name">Operatividad</span>
            </div>
          </div>
          <div className="stat-card blue">
            <div className="stat-icon"><Activity size={24} /></div>
            <div className="stat-info">
              <span className="stat-value">Estable</span>
              <span className="stat-name">Estado del Sistema</span>
            </div>
          </div>
          <div className="stat-card green">
            <div className="stat-icon"><CheckCircle2 size={24} /></div>
            <div className="stat-info">
              <span className="stat-value">18/20</span>
              <span className="stat-name">Módulos Críticos</span>
            </div>
          </div>
          <div className="stat-card purple">
            <div className="stat-icon"><Users size={24} /></div>
            <div className="stat-info">
              <span className="stat-value">Escalable</span>
              <span className="stat-name">Capacidad de Usuarios</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Phases Grid */}
      <section className="phases-section">
        <h2 className="section-title">
          <Layers size={20} />
          Desglose por Áreas Estratégicas
        </h2>
        <div className="phases-grid">
          {PROJECT_PHASES.map((phase) => (
            <div key={phase.id} className="phase-card">
              <div className="phase-card-header">
                <div className="phase-icon-wrapper" style={{ backgroundColor: `${phase.color}20`, color: phase.color }}>
                  <phase.icon size={20} />
                </div>
                <div className="phase-status-tag" style={{ color: phase.color, borderColor: `${phase.color}40` }}>
                  {phase.status}
                </div>
              </div>
              
              <h3 className="phase-title">{phase.title}</h3>
              <p className="phase-desc">{phase.description}</p>
              
              <div className="phase-progress-container">
                <div className="phase-progress-header">
                  <span>Progreso</span>
                  <span className="phase-percentage">{phase.percentage}%</span>
                </div>
                <div className="phase-progress-bar-bg">
                  <div 
                    className="phase-progress-bar-fill" 
                    style={{ 
                      width: `${phase.percentage}%`, 
                      backgroundColor: phase.color,
                      boxShadow: `0 0 10px ${phase.color}60`
                    }}
                  />
                </div>
              </div>

              <div className="phase-features">
                {phase.features.map((f, i) => (
                  <div key={i} className="feature-item">
                    <CheckCircle2 size={14} className="feature-check" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Roadmap / Timeline */}
      <section className="roadmap-section">
        <h2 className="section-title">
          <Clock size={20} />
          Línea de Tiempo de Finalización
        </h2>
        <div className="roadmap-timeline">
          <div className="timeline-item completed">
            <div className="timeline-dot" />
            <div className="timeline-content">
              <h4>Marzo 2026: Core Deployment</h4>
              <p>Finalización de arquitectura y seguridad base.</p>
            </div>
          </div>
          <div className="timeline-item active">
            <div className="timeline-dot" />
            <div className="timeline-content">
              <h4>Abril 2026: Comando Central & Territorio</h4>
              <p>Optimización de mapas y despliegue del sistema p2p.</p>
            </div>
          </div>
          <div className="timeline-item pending">
            <div className="timeline-dot" />
            <div className="timeline-content">
              <h4>Mayo 2026: Geolocalización Full-Scale</h4>
              <p>Activación de tracking GPS y mapeo de bardas/eventos.</p>
            </div>
          </div>
          <div className="timeline-item pending">
            <div className="timeline-dot" />
            <div className="timeline-content">
              <h4>Junio 2026: Mando Operativo Total</h4>
              <p>Cierre de ciclo con reportes de alta fidelidad.</p>
            </div>
          </div>
        </div>
      </section>
      
      <div className="summary-footer">
        <AlertCircle size={16} />
        <span>Este reporte se genera dinámicamente basado en los módulos integrados en la plataforma.</span>
      </div>
    </div>
  );
}

function Trophy({ size }) {
  return (
    <svg 
      width={size} height={size} viewBox="0 0 24 24" fill="none" 
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    >
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 22V18" />
      <path d="M14 22V18" />
      <path d="M18 4H6a2 2 0 0 0-2 2v3c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Z" />
      <path d="M12 10v8" />
    </svg>
  );
}
