import { Room, LocalVideoTrack, createLocalVideoTrack } from 'livekit-client';
import { setFpsLabel, setCodecDisplay, showZoomLevel } from './ui';

let currentVideoTrack: LocalVideoTrack | null = null;
let facingMode: 'environment' | 'user' = 'environment';
let wakeLock: WakeLockSentinel | null = null;
let currentZoomVal = 1;
let currentFps = 30;
// Real zoom range from device capabilities
let zoomMin = 1;
let zoomMax = 5;

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
  if (isIOS) return 'h264';

  if (typeof RTCRtpSender !== 'undefined' && RTCRtpSender.getCapabilities) {
    const caps = RTCRtpSender.getCapabilities('video');
    if (caps?.codecs) {
      if (caps.codecs.some(c => c.mimeType.toLowerCase() === 'video/av1')) return 'av1';
      if (caps.codecs.some(c => c.mimeType.toLowerCase() === 'video/vp9')) return 'vp9';
    }
  }
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

  const codec = getBestCodec();
  const bitrate = currentFps === 60 ? 6_000_000 : 3_000_000;

  await room.localParticipant.publishTrack(currentVideoTrack, {
    videoCodec: codec,
    videoEncoding: { maxBitrate: bitrate, maxFramerate: currentFps },
    simulcast: true,
    degradationPreference: 'maintain-framerate',
  });

  setCodecDisplay(codec, currentFps);
}

function setupZoomGestures() {
  setTimeout(() => {
    try {
      const mediaTrack = currentVideoTrack?.mediaStreamTrack;
      if (!mediaTrack || !('getCapabilities' in mediaTrack)) return;

      const capabilities = (mediaTrack.getCapabilities() as any);
      if (!capabilities.zoom) return;

      // Use device real range — min might be 0.5 for wide-angle phones
      zoomMin = capabilities.zoom.min;
      zoomMax = capabilities.zoom.max;
      currentZoomVal = (mediaTrack.getSettings() as any).zoom || zoomMin;

      // Show initial zoom level
      showZoomLevel(currentZoomVal);

      const container = document.getElementById('video-container');
      if (!container) return;

      let initialDistance = 0;
      let initialZoom = currentZoomVal;
      let initialY = 0;
      let gestureActive = false;

      container.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
          initialDistance = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
          );
          initialZoom = currentZoomVal;
          gestureActive = true;
        } else if (e.touches.length === 1) {
          initialY = e.touches[0].clientY;
          initialZoom = currentZoomVal;
          gestureActive = true;
        }
      }, { passive: false });

      container.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (!gestureActive) return;

        if (e.touches.length === 2) {
          // Pinch to zoom
          const dist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
          );
          const newZoom = initialZoom * (dist / initialDistance);
          applyZoom(newZoom, mediaTrack);
        } else if (e.touches.length === 1) {
          // Drag up = zoom in, drag down = zoom out
          // Sensitivity: full screen height (800px) = full zoom range
          const dy = initialY - e.touches[0].clientY;
          const range = zoomMax - zoomMin;
          const delta = (dy / window.innerHeight) * range;
          applyZoom(initialZoom + delta, mediaTrack);
        }
      }, { passive: false });

      container.addEventListener('touchend', () => {
        gestureActive = false;
      }, { passive: true });

    } catch (e) {
      console.warn('Zoom não suportado neste dispositivo', e);
    }
  }, 700);
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

