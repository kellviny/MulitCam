import React from 'react';

type GridMode = 'auto' | '1' | '1x2' | '2x2' | '3x2';

interface StatusBarProps {
  cameraCount: number;
  connectionState: string;
  gridMode: GridMode;
  onGridChange: (mode: GridMode) => void;
  onQrOpen: () => void;
}

const GRID_OPTIONS: { mode: GridMode; label: string }[] = [
  { mode: 'auto', label: '⊞ Auto' },
  { mode: '1', label: '▣ 1×1' },
  { mode: '1x2', label: '◫ 1×2' },
  { mode: '2x2', label: '⊞ 2×2' },
  { mode: '3x2', label: '▦ 3×2' },
];

export default function StatusBar({ cameraCount, connectionState, gridMode, onGridChange, onQrOpen }: StatusBarProps) {
  const isConnected = connectionState === 'connected';
  const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 20px',
      height: '58px',
      background: 'rgba(10,10,20,0.95)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      backdropFilter: 'blur(16px)',
      flexShrink: 0,
      gap: '16px',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    }}>
      {/* Logo / Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        <div style={{
          width: '28px', height: '28px', borderRadius: '8px',
          background: 'linear-gradient(135deg, #6366f1, #818cf8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '14px', boxShadow: '0 0 16px rgba(99,102,241,0.5)',
        }}>
          📡
        </div>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9', lineHeight: 1 }}>MultiCam Live</div>
          <div style={{ fontSize: '10px', color: '#475569', lineHeight: 1, marginTop: '2px' }}>Monitor Central</div>
        </div>
      </div>

      {/* Center — stats */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, justifyContent: 'center' }}>
        {/* Status chip */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: isConnected ? 'rgba(34,197,94,0.12)' : 'rgba(250,204,21,0.12)',
          border: `1px solid ${isConnected ? 'rgba(34,197,94,0.3)' : 'rgba(250,204,21,0.3)'}`,
          borderRadius: '20px', padding: '4px 10px',
        }}>
          <div style={{
            width: '6px', height: '6px', borderRadius: '50%',
            backgroundColor: isConnected ? '#22c55e' : '#facc15',
            boxShadow: `0 0 6px ${isConnected ? '#22c55e' : '#facc15'}`,
          }} />
          <span style={{ fontSize: '11px', fontWeight: 600, color: isConnected ? '#86efac' : '#fde047', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {connectionState}
          </span>
        </div>

        {/* Camera count */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: 'rgba(99,102,241,0.12)',
          border: '1px solid rgba(99,102,241,0.25)',
          borderRadius: '20px', padding: '4px 10px',
        }}>
          <span style={{ fontSize: '14px' }}>📹</span>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#a5b4fc' }}>
            {cameraCount}
          </span>
          <span style={{ fontSize: '11px', color: '#6366f1' }}>
            {cameraCount === 1 ? 'câmera' : 'câmeras'}
          </span>
        </div>

        {/* Clock */}
        <div style={{
          fontFamily: 'monospace',
          fontSize: '13px', color: '#64748b',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '8px', padding: '4px 10px',
        }}>
          {now}
        </div>
      </div>

      {/* Right — QR + grid toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        <button
          onClick={onQrOpen}
          title="Conectar câmeras via QR Code"
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'rgba(99,102,241,0.15)',
            border: '1px solid rgba(99,102,241,0.4)',
            color: '#a5b4fc', borderRadius: '8px',
            padding: '6px 14px', cursor: 'pointer',
            fontSize: '12px', fontWeight: 700,
            transition: 'all 0.2s',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.3)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.15)'; }}
        >
          📱 Conectar Câmeras
        </button>
        <span style={{ fontSize: '11px', color: '#475569', marginRight: '4px' }}>Layout:</span>
        <div style={{
          display: 'flex',
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '8px',
          padding: '3px',
          border: '1px solid rgba(255,255,255,0.08)',
          gap: '2px',
        }}>
          {GRID_OPTIONS.map(opt => (
            <button
              key={opt.mode}
              onClick={() => onGridChange(opt.mode)}
              style={{
                background: gridMode === opt.mode
                  ? 'linear-gradient(135deg, #6366f1, #818cf8)'
                  : 'transparent',
                border: 'none',
                color: gridMode === opt.mode ? '#fff' : '#64748b',
                borderRadius: '5px',
                padding: '4px 10px',
                fontSize: '11px', fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: gridMode === opt.mode ? '0 2px 8px rgba(99,102,241,0.4)' : 'none',
                whiteSpace: 'nowrap',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
