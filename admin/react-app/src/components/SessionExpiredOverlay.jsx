import React, { useState, useEffect } from 'react';
import { LogIn, RefreshCw } from 'lucide-react';

/**
 * Full-screen overlay shown when the WordPress login session has expired.
 * Triggered by the global 'qe-session-expired' custom event (dispatched from
 * baseService.js when a nonce refresh attempt also fails with a 403).
 */
const SessionExpiredOverlay = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = () => setVisible(true);
    window.addEventListener('qe-session-expired', handler);
    return () => window.removeEventListener('qe-session-expired', handler);
  }, []);

  if (!visible) return null;

  const handleLogin = () => {
    const lmsUrl = window.qe_data?.lms_url || window.location.href;
    const loginBase = window.qe_data?.login_url || (window.location.origin + '/mi-cuenta/');
    window.location.href = loginBase + '?redirect_to=' + encodeURIComponent(lmsUrl);
  };

  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '1rem',
          padding: '2rem',
          maxWidth: '400px',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: '#fef3c7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem',
          }}
        >
          <LogIn size={28} style={{ color: '#d97706' }} />
        </div>

        <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem', fontWeight: 700, color: '#111827' }}>
          Sesión expirada
        </h2>
        <p style={{ margin: '0 0 1.75rem', fontSize: '0.875rem', color: '#6b7280', lineHeight: 1.6 }}>
          Has estado inactivo durante mucho tiempo y tu sesión ha caducado.
          Por favor, inicia sesión de nuevo para continuar.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button
            onClick={handleLogin}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              borderRadius: '0.5rem',
              border: 'none',
              backgroundColor: '#3b82f6',
              color: '#ffffff',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <LogIn size={16} />
            Iniciar sesión
          </button>

          <button
            onClick={handleRetry}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.625rem 1.5rem',
              borderRadius: '0.5rem',
              border: '1px solid #e5e7eb',
              backgroundColor: 'transparent',
              color: '#6b7280',
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} />
            Intentar de nuevo
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionExpiredOverlay;
