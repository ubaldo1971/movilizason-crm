import React, { useState, useEffect } from 'react';
import { Bell, Signal, Users, Map, TrendingUp, MessageSquare } from 'lucide-react';

const LinkPreview = ({ url }) => {
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetadata = async () => {
      setLoading(true);
      
      try {
        // 1. YouTube specialized handling
        const ytMatch = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=|embed\/|v\/)?([a-zA-Z0-9_-]{11})/);
        if (ytMatch) {
          const videoId = ytMatch[1];
          setMetadata({
            title: "Milenio - YouTube",
            description: "Video de YouTube en alta definición",
            image: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
            site: "YouTube",
            type: "video",
            icon: <Signal size={16} />
          });
          setLoading(false);
          return;
        }

        // 2. Facebook specialized handling
        if (url.includes('facebook.com')) {
          setMetadata({
            title: "Publicación de Facebook",
            description: "Contenido compartido desde Facebook",
            image: "https://www.facebook.com/images/fb_icon_325x325.png",
            site: "Facebook",
            type: "social",
            icon: <Users size={16} />
          });
          setLoading(false);
          return;
        }

        // 3. Twitter/X
        if (url.includes('twitter.com') || url.includes('x.com')) {
          setMetadata({
            title: "X (Twitter)",
            description: "Post compartido en X",
            site: "X",
            icon: <TrendingUp size={16} />
          });
          setLoading(false);
          return;
        }

        // 4. Fallback for generic sites
        const urlObj = new URL(url);
        const domain = urlObj.hostname;
        setMetadata({
          title: domain,
          description: "Haz clic para ver el contenido completo.",
          site: domain,
          icon: <Map size={16} />
        });
      } catch (err) {
        console.error("LinkPreview error:", err);
      } finally {
        setLoading(false);
      }
    };

    if (url) fetchMetadata();
  }, [url]);

  if (loading) return (
    <div className="link-preview-loading">
      <div className="skeleton-line" style={{ width: '40%', height: '14px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px' }}></div>
      <div className="skeleton-line" style={{ width: '80%', height: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', marginTop: '8px' }}></div>
    </div>
  );

  if (!metadata) return null;

  return (
    <div className="link-preview-card animate-fade-in" onClick={() => window.open(url, '_blank')}>
      <div className="preview-indicator" style={{ backgroundColor: metadata.site === 'YouTube' ? '#ff0000' : metadata.site === 'Facebook' ? '#1877f2' : 'var(--color-primary)' }}></div>
      <div className="preview-content">
        <div className="preview-site">
          {metadata.icon}
          <span>{metadata.site}</span>
        </div>
        <h4 className="preview-title">{metadata.title}</h4>
        <p className="preview-desc">{metadata.description}</p>
        
        {metadata.image && (
          <div className="preview-image-container">
            <img src={metadata.image} alt="Preview" className="preview-image" />
            {metadata.type === 'video' && (
              <div className="play-overlay">
                <div className="play-btn">
                  <Signal size={32} fill="white" color="white" />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LinkPreview;
