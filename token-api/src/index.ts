import express from 'express';
import cors from 'cors';
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';

const app = express();
const PORT = 3001;

// Configuração do LiveKit
const livekitHost = process.env.LIVEKIT_URL || 'http://127.0.0.1:7880';
const apiKey = process.env.LIVEKIT_API_KEY || 'multicam_key';
const apiSecret = process.env.LIVEKIT_API_SECRET || 'multicam_secret_change_this_32chars';

const roomService = new RoomServiceClient(livekitHost, apiKey, apiSecret);

app.use(cors());

// Registro de dispositivos para manter links consistentes no OBS
const deviceRegistry: Record<string, string> = {};
let nextCameraId = 1;

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', time: Date.now() });
});

// Endpoint para assinar nomes consistentes
app.get('/api/assign-name', (req, res) => {
  const deviceId = req.query.deviceId as string;
  
  if (!deviceId) {
    return res.status(400).json({ error: 'deviceId is required' });
  }

  if (!deviceRegistry[deviceId]) {
    deviceRegistry[deviceId] = `cam-${nextCameraId++}`;
  }

  res.json({ name: deviceRegistry[deviceId] });
});

// Token API endpoint adaptado para /api/token se estiver vindo do proxy (main.ts usa /api/token ou /token)
app.get(['/api/token', '/token'], async (req, res) => {
  const roomName = req.query.room as string;
  const participantName = req.query.name as string;
  const role = req.query.role as string;

  if (!roomName || !participantName) {
    return res.status(400).json({ error: 'room and name são obrigatórios' });
  }

  const at = new AccessToken(apiKey, apiSecret, {
    identity: participantName,
    ttl: '10h',
  });

  if (role === 'camera') {
    at.addGrant({ roomJoin: true, room: roomName, canPublish: true, canSubscribe: true, canPublishData: true });
  } else if (role === 'monitor') {
    at.addGrant({ roomJoin: true, room: roomName, canPublish: false, canSubscribe: true, canPublishData: true });
  } else {
    at.addGrant({ roomJoin: true, room: roomName, canPublish: true, canSubscribe: true, canPublishData: true });
  }

  const token = await at.toJwt();
  res.json({ token });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Token API rodando em http://0.0.0.0:${PORT}`);
  console.log(`🔗 Conectado ao LiveKit em ${livekitHost}`);
});
