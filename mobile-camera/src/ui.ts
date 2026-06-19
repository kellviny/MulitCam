export function setCameraName(name: string) {
  const el = document.getElementById('camera-name-display');
  if (el) el.textContent = name;
}

// --- Tap-to-Focus & Exposure UI (Android only) ---

let focusHideTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Exibe o quadrado de foco na posição exata do toque e o slider de exposição ao lado.
 * Após 3 segundos sem interação, ambos desaparecem.
 */
export function showFocusSquare(clientX: number, clientY: number) {
  const square = document.getElementById('focus-square') as HTMLElement | null;
  const sliderWrap = document.getElementById('exposure-wrap') as HTMLElement | null;
  if (!square) return;

  const size = 72;
  // Centraliza o quadrado na posição do toque
  square.style.left = `${clientX - size / 2}px`;
  square.style.top  = `${clientY - size / 2}px`;
  square.style.opacity = '1';
  square.style.transform = 'scale(1)';

  // Slider de exposição aparece à direita do quadrado (mas não sai da tela)
  if (sliderWrap) {
    const sliderX = Math.min(window.innerWidth - 44, clientX + size / 2 + 8);
    const sliderCenterY = clientY - 60; // 60px = metade da altura do slider (120px)
    sliderWrap.style.left = `${sliderX}px`;
    sliderWrap.style.top  = `${Math.max(10, sliderCenterY)}px`;
    sliderWrap.style.opacity = '1';
    sliderWrap.style.pointerEvents = 'auto';
  }

  // Auto-ocultar após 3s sem tocar no slider
  if (focusHideTimer) clearTimeout(focusHideTimer);
  focusHideTimer = setTimeout(() => hideFocusSquare(), 3000);
}

export function hideFocusSquare() {
  const square = document.getElementById('focus-square') as HTMLElement | null;
  const sliderWrap = document.getElementById('exposure-wrap') as HTMLElement | null;
  if (square) {
    square.style.opacity = '0';
    square.style.transform = 'scale(1.15)';
  }
  if (sliderWrap) {
    sliderWrap.style.opacity = '0';
    sliderWrap.style.pointerEvents = 'none';
  }
  if (focusHideTimer) { clearTimeout(focusHideTimer); focusHideTimer = null; }
}

/**
 * Configura o slider de exposição com os limites reais do aparelho.
 * Só deve ser chamado se o aparelho suportar exposureCompensation.
 */
export function initExposureSlider(
  min: number, max: number, step: number, current: number,
  onChange: (val: number) => void
) {
  const slider = document.getElementById('exposure-slider') as HTMLInputElement | null;
  const sliderWrap = document.getElementById('exposure-wrap') as HTMLElement | null;
  if (!slider || !sliderWrap) return;

  slider.min   = String(min);
  slider.max   = String(max);
  slider.step  = String(step);
  slider.value = String(current);

  slider.addEventListener('input', () => {
    const val = parseFloat(slider.value);
    onChange(val);
    // Reinicia o timer de auto-ocultar ao mexer no slider
    if (focusHideTimer) clearTimeout(focusHideTimer);
    focusHideTimer = setTimeout(() => hideFocusSquare(), 3000);
  });

  // Disponibiliza o wrapper mas mantém oculto até o primeiro toque
  sliderWrap.style.display = 'flex';
}

export function setCodecDisplay(codec: string, fps: number, lensName: string) {
  const el = document.getElementById('codec-display');
  if (el) {
    el.textContent = `${lensName} · ${codec.toUpperCase()} · ${fps}fps`;
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

export function onCycleLensClick(callback: () => void) {
  const btn = document.getElementById('btn-lens');
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
