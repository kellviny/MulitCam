import { Room, LocalVideoTrack, createLocalVideoTrack } from 'livekit-client';
import { setFpsLabel, setCodecDisplay, showZoomLevel, showFocusSquare, initExposureSlider } from './ui';

let currentVideoTrack: LocalVideoTrack | null = null;
let facingMode: 'environment' | 'user' = 'environment';
let wakeLock: WakeLockSentinel | null = null;
let currentZoomVal = 1;
let currentFps = 30;
// Real zoom range from device capabilities
let zoomMin = 1;
let zoomMax = 5;

// Android-only: true se o dispositivo é iOS (bloqueia features exclusivas do Android)
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

export async function setupCameraAndPublish(room: Room) {
  const savedFps = localStorage.getItem('cameraFps');
  currentFps = savedFps === '60' ? 60 : 30;
  setFpsLabel(currentFps);
  await requestWakeLock();
  await publishCamera(room);
}

export async function toggleFps(room: Room) {
  currentFps = currentFps === 30 ? 60 : 30;
  localStorage.setItem('cameraFps', currentFps.toString());
  setFpsLabel(currentFps);
  await publishCamera(room);
}

type VideoCodec = 'h264' | 'av1' | 'vp9' | 'vp8' | 'h265';

function getBestCodec(): VideoCodec {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  
  if (typeof RTCRtpSender !== 'undefined' && RTCRtpSender.getCapabilities) {
    const caps = RTCRtpSender.getCapabilities('video');
    if (caps?.codecs) {
      // iPhone: Tenta usar H.265 (HEVC) se disponível, pois salva MUITA banda mantendo qualidade
      if (isIOS && caps.codecs.some(c => c.mimeType.toLowerCase() === 'video/h265')) {
        return 'h265';
      }
      
      // Removemos o AV1 porque ele consome muita bateria/CPU em celulares (isso causou a lentidão antes)
      // Android: Tenta VP9 se houver aceleração, senão H.264
      if (!isIOS && caps.codecs.some(c => c.mimeType.toLowerCase() === 'video/vp9')) {
        return 'vp9';
      }
    }
  }
  
  // H.264 é o mais leve para o processador (possui aceleração de hardware em 100% dos celulares)
  return 'h264';
}

async function publishCamera(room: Room) {
  if (currentVideoTrack) {
    await room.localParticipant.unpublishTrack(currentVideoTrack);
    currentVideoTrack.stop();
  }

  currentVideoTrack = await createLocalVideoTrack({
    facingMode,
    resolution: { width: 1920, height: 1080, frameRate: currentFps }
  });

  const videoEl = document.getElementById('local-video') as HTMLVideoElement;
  if (videoEl) currentVideoTrack.attach(videoEl);

  setupZoomGestures();
  if (!isIOS) setupAdvancedCameraControls();

  const codec = getBestCodec();
  // Bitrate mínimo de 6000 kbps conforme solicitado
  const bitrate = currentFps === 60 ? 8_000_000 : 6_000_000;

  await room.localParticipant.publishTrack(currentVideoTrack, {
    videoCodec: codec,
    videoEncoding: { maxBitrate: bitrate, maxFramerate: currentFps },
    simulcast: false,
    degradationPreference: 'maintain-resolution',
  });

  setCodecDisplay(codec, currentFps);
}

function setupZoomGestures() {
  setTimeout(() => {
    try {
      const mediaTrack = currentVideoTrack?.mediaStreamTrack;
      if (!mediaTrack) return;

      // Tenta ler as capacidades de zoom (pode não existir em alguns browsers)
      const hasCapabilities = 'getCapabilities' in mediaTrack;
      if (hasCapabilities) {
        const capabilities = (mediaTrack.getCapabilities() as any);
        if (capabilities.zoom) {
          zoomMin = capabilities.zoom.min;
          zoomMax = capabilities.zoom.max;
          currentZoomVal = (mediaTrack.getSettings() as any).zoom || zoomMin;
          showZoomLevel(currentZoomVal);
        }
      }

      const container = document.getElementById('video-container');
      if (!container) return;

      let initialDistance = 0;
      let initialZoom    = currentZoomVal;
      let initialY       = 0;
      let touchStartX    = 0;
      let touchStartY    = 0;
      let hasMoved       = false;
      let isMultiTouch   = false;

      container.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
          isMultiTouch = true;
          hasMoved = true; // pinch nunca pode virar tap
          initialDistance = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
          );
          initialZoom = currentZoomVal;
        } else if (e.touches.length === 1) {
          isMultiTouch = false;
          hasMoved = false;
          touchStartX = e.touches[0].clientX;
          touchStartY = e.touches[0].clientY;
          initialY    = e.touches[0].clientY;
          initialZoom = currentZoomVal;
        }
      }, { passive: false });

      container.addEventListener('touchmove', (e) => {
        e.preventDefault();

        if (e.touches.length === 2) {
          // --- Pinch to zoom ---
          const dist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
          );
          const newZoom = initialZoom * (dist / initialDistance);
          applyZoom(newZoom, mediaTrack);
          hasMoved = true;

        } else if (e.touches.length === 1 && !isMultiTouch) {
          // --- Drag up/down = zoom in/out ---
          const dx  = Math.abs(e.touches[0].clientX - touchStartX);
          const dy2 = Math.abs(e.touches[0].clientY - touchStartY);
          if (dx > 8 || dy2 > 8) {
            hasMoved = true;
            const dy    = initialY - e.touches[0].clientY;
            const range = zoomMax - zoomMin;
            const delta = (dy / window.innerHeight) * range;
            applyZoom(initialZoom + delta, mediaTrack);
          }
        }
      }, { passive: false });

      container.addEventListener('touchend', (e) => {
        // --- TAP simples → foco no ponto (Android only) ---
        if (!isIOS && !isMultiTouch && !hasMoved) {
          const touch = e.changedTouches[0];
          applyFocusAtPoint(touch.clientX, touch.clientY, mediaTrack);
        }
        if (e.touches.length === 0) {
          isMultiTouch = false;
          hasMoved = false;
        }
      }, { passive: true });

    } catch (e) {
      console.warn('Zoom não suportado neste dispositivo', e);
    }
  }, 700);
}

// --- Tap-to-Focus: calcula coordenadas relativas ao vídeo ---
function applyFocusAtPoint(clientX: number, clientY: number, track: MediaStreamTrack) {
  const videoEl = document.getElementById('local-video') as HTMLVideoElement | null;
  if (!videoEl) return;

  const rect = videoEl.getBoundingClientRect();
  const x = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  const y = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));

  // Tenta aplicar foco no ponto — falha silenciosamente se o browser não suportar
  track.applyConstraints({
    advanced: [{ pointsOfInterest: [{ x, y }] } as any]
  }).catch(() => {});

  // Mostra quadrado de foco visual independente de suporte da API
  showFocusSquare(clientX, clientY);
}

// --- Controles avançados (Exposição) — apenas Android ---
// O browser frequentemente NÃO lista exposureCompensation no getCapabilities()
// mesmo que o hardware suporte. Por isso inicializamos com valores padrão
// e tentamos aplicar — se falhar, o slider simplesmente não terá efeito.
function setupAdvancedCameraControls() {
  if (isIOS) return;

  setTimeout(() => {
    try {
      const mediaTrack = currentVideoTrack?.mediaStreamTrack;
      if (!mediaTrack) return;

      // Tenta ler limites reais do aparelho; usa padrões seguros se não disponível
      let expMin = -2, expMax = 2, expStep = 0.1, expCurrent = 0;

      if ('getCapabilities' in mediaTrack) {
        const caps = (mediaTrack.getCapabilities() as any);
        if (caps.exposureCompensation) {
          expMin     = caps.exposureCompensation.min  ?? expMin;
          expMax     = caps.exposureCompensation.max  ?? expMax;
          expStep    = caps.exposureCompensation.step ?? expStep;
          expCurrent = (mediaTrack.getSettings() as any).exposureCompensation ?? 0;
        }
      }

      // Inicializa o slider com os valores (reais ou padrão)
      initExposureSlider(expMin, expMax, expStep, expCurrent, (val) => {
        applyExposure(val, mediaTrack);
      });

    } catch (e) {
      console.warn('Controles de exposição não suportados', e);
    }
  }, 800);
}

export function applyExposure(val: number, track: MediaStreamTrack) {
  track.applyConstraints({
    advanced: [{ exposureCompensation: val } as any]
  }).catch(() => {});
}

function applyZoom(val: number, track: MediaStreamTrack) {
  const z = Math.max(zoomMin, Math.min(zoomMax, val));
  currentZoomVal = z;
  track.applyConstraints({ advanced: [{ zoom: z } as any] })
    .catch(e => console.warn('Zoom falhou', e));
  showZoomLevel(z);
}

export function setZoomLocally(val: number) {
  const mediaTrack = currentVideoTrack?.mediaStreamTrack;
  if (!mediaTrack) return;
  applyZoom(val, mediaTrack);
}

export async function flipCamera(room: Room) {
  facingMode = facingMode === 'environment' ? 'user' : 'environment';
  await publishCamera(room);
}

async function requestWakeLock() {
  if ('wakeLock' in navigator) {
    try {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => console.log('Wake Lock released'));
    } catch (err) {
      console.error('Wake Lock failed', err);
    }
  }
}

