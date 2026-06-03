import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface QrPanelProps {
  onClose: () => void;
}

interface NetworkIface {
  name: string;
  address: string;
  internal: boolean;
}

const ROOM = 'live';

export default function QrPanel({ onClose }: QrPanelProps) {
  const [baseUrl, setBaseUrl] = useState(`https://${window.location.hostname}:3001/camera`);
  const [ifaces, setIfaces] = useState<NetworkIface[]>([]);
  const [selectedIp, setSelectedIp] = useState<string>('');
  const [refreshKey, setRefreshKey] = useState(0);

  // Load network interfaces + initial camera info
  useEffect(() => {
    const api = (window as any).electronAPI;
    if (!api) return;

    Promise.all([
      api.getCameraInfo(),
      api.getNetworkInterfaces(),
    ]).then(([info, ifaceList]: [any, NetworkIface[]]) => {
      setIfaces(ifaceList);
      const ip = info.ip as string;
      setSelectedIp(ip);
      setBaseUrl(`https://${ip}:3001/camera`);
    });
  }, [refreshKey]);

  // When user picks a different IP
  async function handleSelectIp(ip: string) {
    setSelectedIp(ip);
    setBaseUrl(`https://${ip}:3001/camera`);
    const api = (window as any).electronAPI;
    if (api?.setSelectedIp) {
      await api.setSelectedIp(ip);
    }
  }

  const hasElectron = !!(window as any).electronAPI;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(16px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'linear-gradient(135deg, #0f0f1f 0%, #13131e 100%)',
          border: '1px solid rgba(99,102,241,0.25)',
          borderRadius: '20px',
          padding: '28px',
          maxWidth: '720px',
          width: '100%',
          boxShadow: '0 40px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(99,102,241,0.15)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#f1f5f9', marginBottom: '4px' }}>
              📱 Conectar Câmeras por QR Code
            </div>
            <div style={{ fontSize: '13px', color: '#64748b' }}>
              Operador escaneia o QR → câmera conecta instantaneamente
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#94a3b8', borderRadius: '8px', padding: '6px 12px',
              cursor: 'pointer', fontSize: '13px',
            }}
          >
            ✕ Fechar
          </button>
        </div>

        {/* ── Network Interface Selector / Manual Fallback ── */}
        {(hasElectron && ifaces.length > 0) ? (
          <div style={{
            marginBottom: '20px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(99,102,241,0.18)',
            borderRadius: '14px',
            overflow: 'hidden',
          }}>
            {/* Section header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 16px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                🌐 Endereços IP Conectados
              </span>
              <button
                onClick={() => setRefreshKey(k => k + 1)}
                title="Atualizar interfaces"
                style={{
                  background: 'none', border: 'none', color: '#6366f1',
                  cursor: 'pointer', fontSize: '14px', padding: '2px 6px',
                  borderRadius: '6px', transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.15)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                ↻ Atualizar
              </button>
            </div>

            {/* Interface list */}
            {ifaces.map((iface, idx) => {
              const isActive = iface.address === selectedIp;
              return (
                <button
                  key={`${iface.name}-${iface.address}`}
                  onClick={() => handleSelectIp(iface.address)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    alignItems: 'center',
                    width: '100%',
                    padding: '10px 16px',
                    background: isActive
                      ? 'linear-gradient(90deg, rgba(99,102,241,0.15) 0%, rgba(99,102,241,0.05) 100%)'
                      : 'transparent',
                    border: 'none',
                    borderBottom: idx < ifaces.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 0.15s',
                    gap: '12px',
                  }}
                  onMouseEnter={e => {
                    if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)';
                  }}
                  onMouseLeave={e => {
                    if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                  }}
                >
                  <div>
                    <div style={{
                      fontSize: '12px',
                      color: isActive ? '#a5b4fc' : '#64748b',
                      fontWeight: isActive ? 600 : 400,
                      marginBottom: '2px',
                    }}>
                      {iface.name}
                      {iface.internal && (
                        <span style={{ marginLeft: '6px', fontSize: '10px', color: '#475569', fontStyle: 'italic' }}>
                          (loopback)
                        </span>
                      )}
                    </div>
                    <div style={{
                      fontSize: '16px',
                      fontWeight: 800,
                      fontFamily: 'monospace',
                      color: isActive ? '#6366f1' : '#94a3b8',
                      letterSpacing: '0.02em',
                    }}>
                      {iface.address}
                    </div>
                  </div>

                  {/* Right side: QR preview or active badge */}
                  {isActive ? (
                    <div style={{
                      background: 'white',
                      borderRadius: '6px',
                      padding: '4px',
                      lineHeight: 0,
                    }}>
                      <QRCodeSVG
                        value={`https://${iface.address}:3001/camera/?room=${ROOM}`}
                        size={52}
                      />
                    </div>
                  ) : (
                    <div style={{
                      fontSize: '11px',
                      color: '#475569',
                      background: 'rgba(255,255,255,0.05)',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      whiteSpace: 'nowrap',
                    }}>
                      Usar este IP
                    </div>
                  )}
                </button>
              );
            })}

            {/* Active IP display (like screenshot bottom right) */}
            <div style={{
              display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
              padding: '8px 16px',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              gap: '10px',
            }}>
              <span style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'monospace', color: '#6366f1' }}>
                {selectedIp}
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(baseUrl).catch(() => {
                    const el = document.createElement('textarea');
                    el.value = baseUrl;
                    document.body.appendChild(el);
                    el.select();
                    document.execCommand('copy');
                    document.body.removeChild(el);
                  });
                  alert('Link base copiado:\n' + baseUrl);
                }}
                style={{
                  background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)',
                  color: '#a5b4fc', borderRadius: '6px', padding: '3px 10px',
                  cursor: 'pointer', fontSize: '11px', fontWeight: 'bold',
                }}
              >
                Copiar IP/Link
              </button>
            </div>
          </div>
        ) : (
          <div style={{
            marginBottom: '20px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(99,102,241,0.18)',
            borderRadius: '14px',
            padding: '16px',
            display: 'flex', flexDirection: 'column', gap: '8px'
          }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              🌐 Definir IP Manualmente (Modo Navegador)
            </span>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>
              Você está rodando no navegador. Digite o IP da sua máquina na rede local:
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input 
                type="text"
                value={selectedIp}
                onChange={e => setSelectedIp(e.target.value)}
                placeholder="Ex: 192.168.0.100"
                style={{
                  flex: 1, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px', padding: '10px 14px', color: '#fff', fontSize: '14px',
                  fontFamily: 'monospace'
                }}
              />
              <button
                onClick={() => {
                  const ip = selectedIp || window.location.hostname;
                  setBaseUrl(`https://${ip}:3001/camera`);
                }}
                style={{
                  background: '#6366f1', border: 'none', color: '#fff',
                  borderRadius: '8px', padding: '0 16px', fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Aplicar
              </button>
            </div>
          </div>
        )}

        {/* ── Single Unified QR Code ── */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
          <div style={{ background: 'white', padding: '20px', borderRadius: '16px', boxShadow: '0 8px 32px rgba(99,102,241,0.3)' }}>
            <QRCodeSVG
              value={`${baseUrl}/?room=${ROOM}`}
              size={220}
            />
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '18px', fontWeight: 800, marginBottom: '6px' }}>Escaneie com qualquer celular</div>
            <div style={{
              fontSize: '12px', color: '#475569',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '8px', padding: '8px 14px',
              fontFamily: 'monospace', wordBreak: 'break-all',
            }}>
              {`${baseUrl}/?room=${ROOM}`}
            </div>
          </div>

          <div style={{
            background: 'rgba(250,204,21,0.08)', border: '1px solid rgba(250,204,21,0.2)',
            borderRadius: '10px', padding: '10px 14px',
            fontSize: '12px', color: '#fde68a', maxWidth: '380px', textAlign: 'center',
            lineHeight: 1.4
          }}>
            ⚠️ O celular pode pedir para aceitar um certificado inseguro — isso é normal na rede local.<br/>Clique em <strong>"Avançado → Continuar"</strong>.
          </div>
        </div>

        {/* Footer info */}
        <div style={{
          marginTop: '20px', paddingTop: '16px',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          fontSize: '12px', color: '#475569', textAlign: 'center',
        }}>
          O mesmo QR Code serve para <strong>todas</strong> as câmeras • IP ativo: <strong style={{ color: '#6366f1' }}>{selectedIp || window.location.hostname}</strong>
        </div>
      </div>
    </div>
  );
}
