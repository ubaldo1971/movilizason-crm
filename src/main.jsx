import { StrictMode, Component } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import 'leaflet/dist/leaflet.css';
import { RoleProvider } from './context/RoleContext';
import { CommunicationProvider } from './context/CommunicationContext';

// --- Emergency Recovery Error Boundary ---
class GlobalErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("CRITICAL UI CRASH:", error, errorInfo);
  }

  handleReset = () => {
    localStorage.clear();
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          height: '100vh', width: '100vw', 
          display: 'flex', flexDirection: 'column', 
          alignItems: 'center', justifyContent: 'center',
          backgroundColor: '#0f1115', color: '#f8f9fa',
          fontFamily: 'Inter, sans-serif', padding: '2rem', textAlign: 'center'
        }}>
          <h1 style={{ color: '#ef4444', marginBottom: '1rem' }}>⚠️ Error Crítico Detectado</h1>
          <p style={{ maxWidth: '400px', marginBottom: '2rem', opacity: 0.8 }}>
            La aplicación ha encontrado un problema inesperado. 
            Prueba limpiar la caché local para restablecer el sistema.
          </p>
          <pre style={{ 
            background: 'rgba(0,0,0,0.3)', padding: '1rem', 
            borderRadius: '8px', fontSize: '0.8rem', 
            marginBottom: '2rem', maxWidth: '80%', overflow: 'auto',
            color: '#ff8a80', border: '1px solid rgba(255,255,255,0.1)'
          }}>
            {this.state.error?.toString()}
          </pre>
          <button 
            onClick={this.handleReset}
            style={{
              padding: '0.75rem 1.5rem', background: '#800020',
              color: 'white', border: 'none', borderRadius: '6px',
              fontWeight: '600', cursor: 'pointer',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}
          >
            Limpiar Datos y Reiniciar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

console.log('🚀 App starting...');
try {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <GlobalErrorBoundary>
        <RoleProvider>
          <CommunicationProvider>
            <App />
          </CommunicationProvider>
        </RoleProvider>
      </GlobalErrorBoundary>
    </StrictMode>
  );
  console.log('✅ Main render called');
} catch (err) {
  console.error('❌ CRITICAL INITIALIZATION ERROR:', err);
}

