Quero que você crie do zero o projeto **MultiCam Live** — um sistema de transmissão ao vivo com múltiplos celulares via rede local WiFi privada, sem internet, integrado ao OBS Studio via Browser Source.

### Contexto e objetivo
- Usar smartphones como câmeras de vídeo numa rede WiFi local privada
- Sem áudio (áudio vem da mesa de som direto no OBS)
- Câmeras sincronizadas entre si via LiveKit DataChannel
- Cada câmera aparece no OBS como uma Browser Source separada
- Qualidade: Full HD 1080p 30fps, H.264, sem simulcast
- Latência alvo: < 200ms câmera → OBS

### Stack obrigatória
- **Servidor SFU**: LiveKit Server (binário Go, configurado via `livekit.yaml`)
- **Token API**: Node.js + Express + `livekit-server-sdk` (gera JWT para câmeras e monitor)
- **PWA Câmera** (`mobile-camera/`): HTML5 + TypeScript + Vite + `livekit-client` — abre no browser do celular sem instalar app
- **Monitor** (`monitor/`): React + TypeScript + Vite + `livekit-client` — grid com todos os feeds
- **Monorepo**: npm workspaces

### Estrutura de pastas exata
```
multicam-live/
├── server/
│   ├── livekit.yaml
│   └── start.bat
├── token-api/
│   ├── src/index.ts
│   ├── package.json
│   └── tsconfig.json
├── mobile-camera/
│   ├── index.html
│   ├── src/
│   │   ├── main.ts
│   │   ├── camera.ts
│   │   └── ui.ts
│   ├── vite.config.ts
│   └── package.json
├── monitor/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── CameraGrid.tsx
│   │   │   ├── CameraCard.tsx
│   │   │   └── StatusBar.tsx
│   │   └── hooks/
│   │       └── useLiveKit.ts
│   ├── vite.config.ts
│   └── package.json
├── package.json
└── README.md
```

### Configuração LiveKit (livekit.yaml)
```yaml
port: 7880
bind_addresses:
  - ""
rtc:
  tcp_port: 7881
  udp_port: 7882
  use_external_ip: false
  max_bitrate: 8000000
keys:
  multicam_key: multicam_secret_change_this_32chars
room:
  auto_create: true
  max_participants: 20
logging:
  level: warn
```

### Requisitos da PWA câmera (mobile-camera)
1. `getUserMedia` com constraints: `width 1920, height 1080, frameRate 30, facingMode environment, audio: false`
2. Conectar ao LiveKit SFU com token JWT (busca do token via `GET /token?room=X&name=Y`)
3. Publicar vídeo com: `maxBitrate: 4_000_000, maxFramerate: 30, simulcast: false, degradationPreference: maintain-resolution`
4. **Wake Lock API** ativa para manter a tela ligada
5. Receber mensagens DataChannel do tipo `{ type: 'sync', t: timestamp }` e aplicar offset de sync no buffer
6. Interface simples: nome da câmera, status de conexão, indicador de sync (verde/amarelo/vermelho), botão de câmera frontal/traseira

### Requisitos do Monitor (monitor)
1. Grid responsivo que atualiza automaticamente quando câmeras entram/saem
2. Labels com nome de cada câmera
3. Indicador de sinal por câmera
4. Modo fullscreen ao clicar numa câmera

### Rota OBS (dentro do monitor ou mobile-camera)
- `/obs/camera/:id` → página minimalista: apenas `<video>` fullscreen sem UI, sem áudio, fundo preto. Ideal para Browser Source no OBS
- `/monitor` → grid completo com labels

### Sincronização via LiveKit DataChannel (obrigatório)
**Servidor (token-api):**
```javascript
// Emite timestamp global a cada 500ms para todos os participantes
setInterval(() => {
  room.sendData(
    JSON.stringify({ type: 'sync', t: Date.now() }),
    DataPacket_Kind.RELIABLE
  )
}, 500)
```
**Celular (PWA):**
```javascript
room.on(RoomEvent.DataReceived, (payload) => {
  const msg = JSON.parse(new TextDecoder().decode(payload))
  if (msg.type === 'sync') {
    const offset = msg.t - Date.now()
    applySyncOffset(offset)
  }
})
```

### Token API (token-api/src/index.ts)
- `GET /token?room={roomName}&name={participantName}&role={camera|monitor}`
- `role=camera` → `canPublish: true, canSubscribe: false`
- `role=monitor` → `canPublish: false, canSubscribe: true`
- CORS liberado para rede local

### Design da interface
- Tema escuro profissional (fundo #0a0a0f, tons de azul/roxo)
- UI da câmera: minimalista, status bem visível (para operador ver no celular à distância)
- UI do monitor: premium, grid limpo, badges de status animados

### Scripts no package.json raiz
```json
"scripts": {
  "dev:api": "npm run dev --workspace=token-api",
  "dev:camera": "npm run dev --workspace=mobile-camera",
  "dev:monitor": "npm run dev --workspace=monitor",
  "dev": "concurrently \"npm run dev:api\" \"npm run dev:camera\" \"npm run dev:monitor\""
}
```

### Crie nesta ordem
1. `package.json` raiz (monorepo npm workspaces)
2. `server/livekit.yaml` e `server/start.bat`
3. `token-api/` completo e funcional
4. `mobile-camera/` completo — PWA com sync, wake lock e interface
5. `monitor/` completo — grid, labels, fullscreen, rota `/obs/camera/:id`
6. `README.md` com instruções de uso

**Crie o projeto completo, funcional, com todos os arquivos. Não deixe TODOs, não use placeholders. O projeto deve rodar com `npm install` + `npm run dev` após instalar o LiveKit Server.**
