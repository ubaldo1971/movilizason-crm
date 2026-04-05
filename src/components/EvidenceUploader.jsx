import React, { useState, useRef } from 'react';
import { Camera, Image as ImageIcon, X, Check, Loader2 } from 'lucide-react';
import './EvidenceUploader.css';

export default function EvidenceUploader({ onEvidenceAdded, maxFiles = 3, label = "Adjuntar Evidencia" }) {
  const [isUploading, setIsUploading] = useState(false);
  const [files, setFiles] = useState([]);
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (files.length + selectedFiles.length > maxFiles) {
      alert(`Máximo ${maxFiles} fotos permitidas`);
      return;
    }

    setIsUploading(true);
    
    // Simulate upload delay and base64 conversion
    setTimeout(() => {
      const newFiles = selectedFiles.map(file => ({
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        url: URL.createObjectURL(file), // Local preview
        type: file.type
      }));

      const updatedFiles = [...files, ...newFiles];
      setFiles(updatedFiles);
      onEvidenceAdded?.(updatedFiles);
      setIsUploading(false);
    }, 800);
  };

  const removeFile = (id) => {
    const updated = files.filter(f => f.id !== id);
    setFiles(updated);
    onEvidenceAdded?.(updated);
  };

  return (
    <div className="evidence-uploader">
      <label className="uploader-label">{label}</label>
      
      <div className="evidence-preview-grid">
        {files.map(file => (
          <div key={file.id} className="evidence-preview-item">
            <img src={file.url} alt="Evidencia" />
            <button className="remove-btn" onClick={() => removeFile(file.id)}>
              <X size={12} />
            </button>
          </div>
        ))}
        
        {files.length < maxFiles && (
          <button 
            className={`uploader-trigger ${isUploading ? 'loading' : ''}`}
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <Loader2 size={24} className="animate-spin" />
            ) : (
              <>
                <Camera size={24} />
                <span>Subir</span>
              </>
            )}
          </button>
        )}
      </div>

      <input 
        type="file" 
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/*"
        multiple
        style={{ display: 'none' }}
      />
    </div>
  );
}
