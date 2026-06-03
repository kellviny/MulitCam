import React, { useEffect, useRef, useState } from 'react';
import { RemoteParticipant, Track, ConnectionQuality, Room } from 'livekit-client';

interface CameraCardProps {
  room: Room | null;
  participant: RemoteParticipant;
  isFocused: boolean;
  onFocus: () => void;
}

export default function CameraCard({ room, participant, isFocused, onFocus }: CameraCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasVideo, setHasVideo] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [quality, setQuality] = useState<ConnectionQuality>(ConnectionQuality.Unknown);
  const [copyLabel, setCopyLabel] = useState('📋 Copiar URL OBS');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [codecInfo, setCodecInfo] = useState<string>('');

  useEffect(() => {
    const attachVideo = () => {
      const pub = participant.getTrackPublication(Track.Source.Camera);
      if (pub?.videoTrack && videoRef.current) {
        pub.videoTrack.attach(videoRef.current);
        setHasVideo(true);

        // Poll getStats to detect codec
        const interval = setInterval(async () => {
          const receivers = (pub.videoTrack as any)?._receiver ?? null;
          const mediaStream = videoRef.current?.srcObject as MediaStream | null;
          if (mediaStream) {
            const tracks = mediaStream.getVideoTracks();
            if (tracks.length > 0) {
              const pc = (pub.videoTrack as any)?._pc as RTCPeerConnection | undefined;
              if (pc) {
                const stats = await pc.getStats(tracks[0]).catch(() => null);
                if (stats) {
                  stats.forEach((report) => {
                    if (report.type === 'inbound-rtp' && report.kind === 'video') {
                      const mime: string = report.mimeType || '';
                      if (mime) {
                        const codec = mime.split('/')[1]?.toUpperCase() || mime;
                        const fps = Math.round(report.framesPerSecond || 0);
                        setCodecInfo(`${codec}${fps ? ` · ${fps}fps` : ''}`);
                      }
                    }
                  });
                }
              }
            }
          }
        }, 3000);

        return () => clearInterval(interval);
      } else {
        setHasVideo(false);
        setCodecInfo('');
      }
    };

    attachVideo();
    participant.on('trackSubscribed', attachVideo);
    participant.on('trackUnsubscribed', () => { setHasVideo(false); setCodecInfo(''); });
    participant.on('connectionQualityChanged', (q) => setQuality(q));

    return () => {
      participant.off('trackSubscribed', attachVideo);
      participant.off('trackUnsubscribed', () => {});
      const pub = participant.getTrackPublication(Track.Source.Camera);
      if (pub?.videoTrack && videoRef.current) {
        pub.videoTrack.detach(videoRef.current);
      }
    };
  }, [participant]);

  const qualityColor = {
    [ConnectionQuality.Excellent]: '#22c55e',
    [ConnectionQuality.Good]: '#86efac',
    [ConnectionQuality.Poor]: '#f97316',
    [ConnectionQuality.Lost]: '#ef4444',
    [ConnectionQuality.Unknown]: '#64748b',
  }[quality] ?? '#64748b';

  const qualityLabel = {
    [ConnectionQuality.Excellent]: 'Excelente',
    [ConnectionQuality.Good]: 'Boa',
    [ConnectionQuality.Poor]: 'Fraca',
    [ConnectionQuality.Lost]: 'Perdida',
    [ConnectionQuality.Unknown]: 'Verificando',
  }[quality] ?? '—';

  const handleCopyObsUrl = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `http://${window.location.hostname}:3000/obs/camera/${participant.identity}`;
    
    const copySuccess = () => {
      setCopyLabel('✅ Copiado!');
      setTimeout(() => setCopyLabel('📋 Copiar URL OBS'), 2000);
    };

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url).then(copySuccess).catch(() => fallbackCopy(url));
    } else {
      fallbackCopy(url);
    }

    function fallbackCopy(text: string) {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-99999px";
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        copySuccess();
      } catch (err) {
        prompt("Copie a URL abaixo:", text);
      }
      document.body.removeChild(textArea);
    }
  };

  const handleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFocus();
  };

  const handleZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setZoomLevel(val);
    if (room && room.localParticipant) {
      const payload = JSON.stringify({ type: 'zoom', value: val });
      const encoder = new TextEncoder();
      // @ts-ignore
      room.localParticipant.publishData(encoder.encode(payload), { reliable: true, destinationIdentities: [participant.identity] });
    }
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'relative',
        borderRadius: '16px',
        overflow: 'hidden',
        width: '100%',
        height: '100%',
        border: `1px solid ${isHovered ? 'rgba(99,102,241,0.6)' : 'rgba(255,255,255,0.08)'}`,
        boxShadow: isHovered
          ? '0 0 0 1px rgba(99,102,241,0.4), 0 20px 60px rgba(0,0,0,0.6)'
          : '0 4px 24px rgba(0,0,0,0.4)',
        transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
        background: '#0d0d1a',
        transform: isHovered && !isFocused ? 'translateY(-2px)' : 'none',
        cursor: 'pointer',
      }}
      onClick={onFocus}
    >
      {/* Video Feed */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
          opacity: hasVideo ? 1 : 0,
          transition: 'opacity 0.5s ease',
        }}
      />

      {/* No Signal Overlay */}
      {!hasVideo && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: '12px',
          background: 'radial-gradient(ellipse at center, #1a1a2e 0%, #0d0d1a 100%)',
        }}>
          <div style={{ fontSize: '40px', opacity: 0.4 }}>📵</div>
          <div style={{ fontSize: '13px', color: '#475569', fontWeight: 500 }}>Sem sinal de vídeo</div>
        </div>
      )}

      {/* Top Bar — always visible */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        padding: '12px 14px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.75) 0%, transparent 100%)',
      }}>
        {/* Camera Name + LIVE badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '8px', height: '8px', borderRadius: '50%',
            backgroundColor: hasVideo ? '#22c55e' : '#ef4444',
            boxShadow: hasVideo ? '0 0 8px #22c55e' : 'none',
            animation: hasVideo ? 'pulse 2s infinite' : 'none',
          }} />
          <span style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '0.02em', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
            {participant.identity}
          </span>
          {hasVideo && (
            <span style={{
              fontSize: '10px', fontWeight: 800, letterSpacing: '0.08em',
              background: 'rgba(239,68,68,0.85)',
              padding: '2px 7px', borderRadius: '4px',
              textShadow: 'none',
            }}>
              AO VIVO
            </span>
          )}
          {codecInfo && (
            <span style={{
              fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em',
              color: '#a5b4fc',
              background: 'rgba(99,102,241,0.25)',
              padding: '2px 7px', borderRadius: '4px',
              border: '1px solid rgba(99,102,241,0.4)',
            }}>
              {codecInfo}
            </span>
          )}
        </div>

        {/* Quality indicator */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '5px',
          background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)',
          padding: '3px 8px', borderRadius: '20px',
          border: '1px solid rgba(255,255,255,0.1)',
        }}>
          {[1, 2, 3].map(bar => (
            <div key={bar} style={{
              width: '3px',
              height: `${bar * 4 + 4}px`,
              borderRadius: '2px',
              backgroundColor:
                quality === ConnectionQuality.Excellent ? qualityColor :
                quality === ConnectionQuality.Good && bar <= 2 ? qualityColor :
                quality === ConnectionQuality.Poor && bar <= 1 ? qualityColor :
                'rgba(255,255,255,0.15)',
              transition: 'background-color 0.3s',
            }} />
          ))}
          <span style={{ fontSize: '10px', color: qualityColor, marginLeft: '2px' }}>{qualityLabel}</span>
        </div>
      </div>

      {/* Zoom Control — visible on hover */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'absolute', top: '50px', right: '14px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
          background: 'rgba(0,0,0,0.6)', padding: '10px 6px', borderRadius: '20px',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.1)',
          opacity: isHovered || isFocused ? 1 : 0,
          transform: isHovered || isFocused ? 'translateX(0)' : 'translateX(10px)',
          transition: 'all 0.2s ease',
          pointerEvents: isHovered || isFocused ? 'auto' : 'none',
        }}
      >
        <span style={{ fontSize: '12px' }}>🔍</span>
        <input 
          type="range" 
          min="1" max="5" step="0.1" 
          value={zoomLevel} 
          onChange={handleZoomChange}
          style={{
            writingMode: 'vertical-lr',
            direction: 'rtl',
            width: '20px',
            height: '100px',
            accentColor: '#6366f1',
            cursor: 'pointer'
          }}
        />
        <span style={{ fontSize: '10px', fontWeight: 600 }}>{zoomLevel.toFixed(1)}x</span>
      </div>

      {/* Bottom Action Bar — visible on hover */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '40px 12px 12px',
        display: 'flex', gap: '8px', justifyContent: 'flex-end',
        background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)',
        opacity: isHovered || isFocused ? 1 : 0,
        transform: isHovered || isFocused ? 'translateY(0)' : 'translateY(4px)',
        transition: 'opacity 0.2s ease, transform 0.2s ease',
        pointerEvents: isHovered || isFocused ? 'auto' : 'none',
      }}>
        <button
          onClick={handleCopyObsUrl}
          title="Copiar URL para usar no OBS Studio como Browser Source"
          style={{
            background: 'rgba(30,30,60,0.8)',
            border: '1px solid rgba(99,102,241,0.4)',
            color: '#a5b4fc',
            borderRadius: '8px',
            padding: '6px 12px',
            fontSize: '12px', fontWeight: 600,
            cursor: 'pointer',
            backdropFilter: 'blur(8px)',
            transition: 'all 0.2s',
          }}
        >
          {copyLabel}
        </button>

        <button
          onClick={handleFullscreen}
          title="Expandir câmera"
          style={{
            background: 'rgba(30,30,60,0.8)',
            border: '1px solid rgba(99,102,241,0.4)',
            color: '#a5b4fc',
            borderRadius: '8px',
            padding: '6px 12px',
            fontSize: '12px', fontWeight: 600,
            cursor: 'pointer',
            backdropFilter: 'blur(8px)',
            transition: 'all 0.2s',
          }}
        >
          ⛶ {isFocused ? 'Reduzir' : 'Expandir'}
        </button>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
