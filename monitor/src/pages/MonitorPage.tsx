import React, { useState, useCallback } from 'react';
import { useLiveKit } from '../hooks/useLiveKit';
import CameraCard from '../components/CameraCard';
import StatusBar from '../components/StatusBar';
import QrPanel from '../components/QrPanel';

type GridMode = 'auto' | '1' | '1x2' | '2x2' | '3x2';

export default function MonitorPage() {
  const { room, participants, connectionState, error } = useLiveKit(
    'live',
    `monitor-${Math.floor(Math.random() * 9999)}`
  );
  const [gridMode, setGridMode] = useState<GridMode>('auto');
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);

  const gridCols: Record<GridMode, string> = {
    '1': '1fr',
    '1x2': 'repeat(2, 1fr)',
    '2x2': 'repeat(2, 1fr)',
    '3x2': 'repeat(3, 1fr)',
    'auto': 'repeat(auto-fill, minmax(380px, 1fr))',
  };

  const gridRows: Record<GridMode, string> = {
    '1': '1fr',
    '1x2': '1fr',
    '2x2': 'repeat(2, 1fr)',
    '3x2': 'repeat(2, 1fr)',
    'auto': 'auto',
  };

  const handleFocus = useCallback((sid: string) => {
    setFocusedId(prev => prev === sid ? null : sid);
  }, []);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      backgroundColor: '#07070e',
      color: '#e2e8f0',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      overflow: 'hidden',
    }}>
      {/* Top Bar */}
      <StatusBar
        cameraCount={participants.length}
        connectionState={connectionState}
        gridMode={gridMode}
        onGridChange={setGridMode}
        onQrOpen={() => setShowQr(true)}
      />
      {showQr && <QrPanel onClose={() => setShowQr(false)} />}

      {/* Main Content */}
      <div style={{ flex: 1, overflow: 'hidden', padding: '16px', boxSizing: 'border-box' }}>
        {error && (
          <div style={{
            margin: '20px auto',
            maxWidth: '500px',
            padding: '16px 20px',
            borderRadius: '12px',
            backgroundColor: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            color: '#fca5a5',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '18px', marginBottom: '6px' }}>⚠️ Erro de Conexão</div>
            <div style={{ fontSize: '13px', opacity: 0.8 }}>{error}</div>
          </div>
        )}

        {!error && participants.length === 0 && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            gap: '16px',
            opacity: 0.5,
          }}>
            <div style={{ fontSize: '64px' }}>📡</div>
            <div style={{ fontSize: '20px', fontWeight: 600 }}>Aguardando câmeras...</div>
            <div style={{ fontSize: '14px', color: '#94a3b8' }}>
              Conecte um celular em <code style={{ background: '#1e293b', padding: '2px 6px', borderRadius: '4px' }}>https://SEU-IP:3002/?room=live&name=cam1</code>
            </div>
          </div>
        )}

        {focusedId && participants.some(p => p.sid === focusedId) && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 50,
            backgroundColor: '#000',
            display: 'flex', flexDirection: 'column',
          }}>
            {participants.filter(p => p.sid === focusedId).map(p => (
              <CameraCard
                key={p.sid}
                room={room}
                participant={p}
                isFocused={true}
                onFocus={() => setFocusedId(null)}
              />
            ))}
            <button
              onClick={() => setFocusedId(null)}
              style={{
                position: 'absolute', top: '16px', right: '16px',
                background: 'rgba(0,0,0,0.6)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff', borderRadius: '8px',
                padding: '8px 16px', cursor: 'pointer', fontSize: '14px',
                backdropFilter: 'blur(8px)',
              }}
            >
              ✕ Fechar
            </button>
          </div>
        )}

        {participants.length > 0 && !focusedId && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: gridCols[gridMode],
            gridTemplateRows: gridRows[gridMode],
            height: gridMode === 'auto' ? 'auto' : '100%',
            maxHeight: '100%',
            gap: '16px',
            boxSizing: 'border-box'
          }}>
            {participants.map(p => (
              <CameraCard
                key={p.sid}
                room={room}
                participant={p}
                isFocused={false}
                onFocus={() => handleFocus(p.sid)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
