export function setCameraName(name: string) {
  const el = document.getElementById('camera-name-display');
  if (el) el.textContent = name;
}

export function setCodecDisplay(codec: string, fps: number) {
  const el = document.getElementById('codec-display');
  if (el) {
    el.textContent = `${codec.toUpperCase()} · ${fps}fps`;
  }
}

export function setStatus(status: 'disconnected' | 'connecting' | 'live') {
  const el = document.getElementById('status-display');
  if (!el) return;

  el.className = 'status-badge';
  switch (status) {
    case 'disconnected':
      el.classList.add('status-disconnected');
      el.textContent = 'Desconectado';
      break;
    case 'connecting':
      el.classList.add('status-connecting');
      el.textContent = 'Conectando...';
      break;
    case 'live':
      el.classList.add('status-live');
      el.textContent = 'Ao Vivo';
      break;
  }
}

export function setSignalDisplay(quality: string) {
  const el = document.getElementById('signal-display');
  if (!el) return;
  
  el.textContent = `Sinal: ${quality}`;
  
  if (quality === 'Excelente') el.style.color = '#38a169'; // verde
  else if (quality === 'Bom') el.style.color = '#86efac'; // verde claro
  else if (quality === 'Fraco') el.style.color = '#d69e2e'; // amarelo
  else el.style.color = '#e53e3e'; // vermelho
}

export function onFlipCameraClick(callback: () => void) {
  const btn = document.getElementById('btn-flip');
  if (btn) btn.addEventListener('click', callback);
}

export function onFpsToggleClick(callback: () => void) {
  const btn = document.getElementById('btn-fps');
  if (btn) btn.addEventListener('click', callback);
}

export function setFpsLabel(fps: number) {
  const btn = document.getElementById('btn-fps');
  if (btn) btn.textContent = fps.toString();
}

let zoomFadeTimer: ReturnType<typeof setTimeout> | null = null;

export function showZoomLevel(val: number) {
  const el = document.getElementById('zoom-overlay');
  if (!el) return;
  el.textContent = `${val.toFixed(1)}x`;
  el.classList.add('visible');
  if (zoomFadeTimer) clearTimeout(zoomFadeTimer);
  zoomFadeTimer = setTimeout(() => {
    el.classList.remove('visible');
  }, 1500);
}

export function onRemoteZoom(value: number) {
  // Called when remote zoom command received — show overlay
  showZoomLevel(value);
}

export function setupFullscreen() {
  const btn = document.getElementById('btn-fullscreen');
  const videoEl = document.getElementById('local-video') as HTMLVideoElement;
  
  if (!btn || !videoEl) return;

  // Fix para o iOS congelar o vídeo: garantir que sempre volte a tocar se pausado
  videoEl.addEventListener('pause', () => {
    videoEl.play().catch(() => {});
  });
  videoEl.addEventListener('webkitendfullscreen', () => {
    videoEl.play().catch(() => {});
  });

  btn.addEventListener('click', () => {
    // Tenta usar a API padrão (Android / Desktop)
    if (document.documentElement.requestFullscreen) {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
          console.warn('Fullscreen error:', err.message);
          alert('Tela cheia não suportada nativamente neste navegador. No iPhone, use "Compartilhar > Adicionar à Tela de Início" para tela cheia real.');
        });
      } else {
        document.exitFullscreen?.();
      }
    } else {
      // iOS Safari (iPhone) não suporta requestFullscreen em elementos genéricos.
      // webkitEnterFullscreen joga pro player nativo (onde não tem zoom).
      alert('Para tela cheia no iPhone, toque em "Compartilhar" e depois "Adicionar à Tela de Início". O Safari bloqueia a tela cheia pelo navegador.');
    }
  });
}
