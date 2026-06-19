import { Room, RoomEvent, ConnectionQuality } from 'livekit-client';
import { setCameraName, setStatus, onFlipCameraClick, onCycleLensClick, onRemoteZoom, setupFullscreen, onFpsToggleClick, setSignalDisplay } from './ui';
import { setupCameraAndPublish, flipCamera, cycleLens, setZoomLocally, toggleFps } from './camera';

// Descoberta do IP do servidor (Token API e LiveKit)
const host = window.location.hostname;
const isHttps = window.location.protocol === 'https:';

// Usa o proxy se estiver em HTTPS (Mobile) para evitar erro de Mixed Content
const tokenApiUrl = isHttps ? `/api/token` : `http://${host}:3001/api/token`;
const assignNameUrl = isHttps ? `/api/assign-name` : `http://${host}:3001/api/assign-name`;
const livekitUrl = isHttps ? `wss://${host}:3001/livekit` : `ws://${host}:7880`;

function getDeviceId(): string {
  let id = localStorage.getItem('deviceId');
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
    localStorage.setItem('deviceId', id);
  }
  return id;
}

async function main() {
  const urlParams = new URLSearchParams(window.location.search);
  const roomName = urlParams.get('room') || 'live';
  
  setStatus('connecting');

  try {
    // 0. Obter Nome Fixo da Câmera
    const deviceId = getDeviceId();
    const nameRes = await fetch(`${assignNameUrl}?deviceId=${deviceId}`);
    const nameData = await nameRes.json();
    const cameraName = urlParams.get('name') || nameData.name || `cam-${deviceId.substring(0,4)}`;

    setCameraName(cameraName);

    // 1. Obter Token
    const res = await fetch(`${tokenApiUrl}?room=${roomName}&name=${cameraName}&role=camera`);
    const data = await res.json();
    if (!data.token) throw new Error('Token nulo retornado');

    // 2. Conectar ao LiveKit
    const room = new Room();

    room.on(RoomEvent.Connected, () => {
      setStatus('live');
    });

    room.on(RoomEvent.Disconnected, () => {
      setStatus('disconnected');
    });

    // 3. Ouvir comandos (Zoom) via DataChannel
    room.on(RoomEvent.DataReceived, (payload) => {
      try {
        const msg = JSON.parse(new TextDecoder().decode(payload));
        if (msg.type === 'zoom' && msg.value !== undefined) {
          onRemoteZoom(msg.value);
          setZoomLocally(msg.value);
        }
      } catch (e) {
        console.error('Erro ao fazer parse do datachannel msg', e);
      }
    });

    // Atualiza a qualidade do sinal da própria câmera
    room.localParticipant.on('connectionQualityChanged', (quality) => {
      let qStr = 'Desconhecido';
      if (quality === ConnectionQuality.Excellent) qStr = 'Excelente';
      else if (quality === ConnectionQuality.Good) qStr = 'Bom';
      else if (quality === ConnectionQuality.Poor) qStr = 'Fraco';
      else if (quality === ConnectionQuality.Lost) qStr = 'Perdido';
      setSignalDisplay(qStr);
    });

    await room.connect(livekitUrl, data.token);

    // 4. Configurar e publicar vídeo
    await setupCameraAndPublish(room);

    // 5. Configurar botões
    onFlipCameraClick(() => flipCamera(room));
    onCycleLensClick(() => cycleLens());
    setupFullscreen();
    onFpsToggleClick(() => toggleFps(room));

  } catch (err) {
    console.error(err);
    setStatus('disconnected');
    alert('Erro ao conectar: ' + String(err));
  }
}

main();
