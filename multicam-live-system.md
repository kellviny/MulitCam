# 📡 MultiCam Live — Documentação Técnica Completa

> Sistema de transmissão ao vivo com múltiplos celulares via rede local privada, usando WebRTC + SFU para máxima performance com mínimo uso de rede.

---

## 🧠 Visão Geral

O **MultiCam Live** é um sistema que permite usar **N smartphones como câmeras** transmitindo simultaneamente para um servidor local leve (SFU), que distribui os feeds para um monitor central (desktop ou tablet) em tempo real, com latência abaixo de 200ms e qualidade Full HD 30fps.

**Integração com OBS**: cada feed de câmera é consumido pelo OBS via Browser Source — sem app extra, sem NDI, direto pelo browser engine do OBS.

**Sem áudio**: áudio vem da mesa de som diretamente no OBS. O sistema de câmeras transmite **vídeo puro**, economizando banda e CPU.

**Sincronização**: todas as câmeras são sincronizadas via **LiveKit DataChannel** — o servidor emite um timestamp global e cada câmera ajusta seu buffer de transmissão, garantindo que os feeds cheguem alinhados ao OBS.

### Problema que resolve
| App atual (iRum/NDI) | MultiCam Live |
|---|---|
| Protocolo RTMP — pesado | WebRTC — nativo, leve |
| Latência 2–10 segundos | **< 200ms** |
| Servidor cloud obrigatório | **100% rede local** |
| App instalado obrigatório | **Abre no browser** |
| Carga alta no WiFi | **30–60% menos banda** |
| Sem controle de qualidade | **Adaptativo por câmera** |

---

## 🏗️ Arquitetura do Sistema

```
┌──────────────────────────────────────────────────────────────┐
│                     REDE LOCAL PRIVADA (WiFi)                │
│                                                              │
│  📱 Celular 1 ──┐                                           │
│  📱 Celular 2 ──┤                                           │
│  📱 Celular 3 ──┼──► [LiveKit SFU Server] ──► 🖥️ Monitor   │
│  📱 Celular 4 ──┤      (sua máquina)           (web app)    │
│  📱 Celular N ──┘                                           │
│                                                              │
│  Protocolo: WebRTC (UDP)    Latência: < 200ms               │
└──────────────────────────────────────────────────────────────┘
```

### O que é um SFU?

**SFU = Selective Forwarding Unit**

- Cada celular **envia 1 stream** de vídeo para o servidor
- O servidor **repassa** os streams para quem precisa receber
- O servidor **NÃO recodifica** o vídeo — só repassa pacotes
- Resultado: CPU mínima no servidor, latência mínima

```
SEM SFU (Mesh P2P):           COM SFU:
Cel1 ←→ Cel2                  Cel1 ──► SFU ──► Monitor
Cel1 ←→ Cel3    (caos)        Cel2 ──► SFU
Cel2 ←→ Cel3                  Cel3 ──► SFU
(N² conexões)                 (N conexões apenas)
```

---

## 📊 Quantos Celulares Simultâneos?

### Limites por hardware do servidor

| Hardware Servidor | Câmeras 720p 30fps | Câmeras 1080p 30fps | Câmeras 4K |
|---|---|---|---|
| **Notebook comum** (i5/Ryzen 5) | **12–16** | **8–10** | 4–5 |
| **Desktop** (i7/Ryzen 7) | 24+ | **16–20** | 8–10 |
| **Mac M1/M2** | 30+ | **20–24** | 10–12 |
| Raspberry Pi 4 | 4–6 | 3–4 | ❌ |

> O SFU **não recodifica**, então o gargalo é apenas I/O de rede, não CPU.

### Limites por rede WiFi

| Roteador | Banda real | Câmeras 1080p 30fps (4 Mbps cada) |
|---|---|---|
| WiFi 4 (2.4GHz) | ~50 Mbps | **~8 câmeras** |
| WiFi 5 (5GHz) | ~200–400 Mbps | **~30–40 câmeras** |
| **WiFi 6 (5GHz)** | ~500–800 Mbps | **~50+ câmeras** |
| WiFi 6E | ~1.2 Gbps | Sem limite prático |

### ✅ Recomendação prática para você
> **4–8 celulares em 1080p 30fps** é confortável num roteador WiFi 5 comum de casa.  
> Para mais câmeras: reduza para **720p 30fps** (1.5 Mbps) ou use AP dedicado.

---

## 📡 Fluxo de Funcionamento

### 1. Inicialização do Servidor
```
[Você inicia livekit-server] 
   → Servidor escuta na porta 7880 (WebSocket/HTTP)
   → Abre portas UDP 50000-60000 (tráfego de mídia WebRTC)
   → Gera tokens de acesso via API Key+Secret
```

### 2. Celular entra como câmera
```
[Operador abre browser no celular]
   → Acessa http://192.168.1.10:3000/camera
   → PWA carrega LiveKit JS SDK
   → Solicita permissão de câmera (getUserMedia)
   → Conecta ao SFU via WebSocket (sinalização)
   → Negocia codec (H.264 ou VP8) via SDP/ICE
   → Começa a enviar vídeo via UDP diretamente ao SFU
   → Latência para conexão: ~1-3 segundos
   → Latência de vídeo em seguida: < 200ms
```

### 3. Monitor recebe os feeds
```
[Monitor web abre no desktop]
   → Acessa http://192.168.1.10:3000/monitor
   → Conecta ao SFU como "consumidor"
   → Recebe lista de participantes (câmeras ativas)
   → Subscreve nos streams de cada câmera
   → Exibe em grid responsivo
   → Atualiza automaticamente quando câmera entra/sai
```

### 4. Fluxo de dados em tempo real
```
📱 Celular                    🖥️ SFU (LiveKit)           🖥️ Monitor
   │                               │                         │
   │──── WebSocket (sinalização) ──►│                         │
   │◄─── ICE candidates ───────────│                         │
   │──── SDP offer ────────────────►│                         │
   │◄─── SDP answer ───────────────│                         │
   │                               │◄── subscribe ───────────│
   │─── UDP packets (vídeo) ───────►│──── UDP packets ────────►│
   │         (contínuo)            │       (repasse)          │
```

### 5. Sincronização entre câmeras (DataChannel)
```
📡 SFU (LiveKit)
   │
   │  A cada 1 segundo, emite broadcast via DataChannel:
   │  { type: "sync", serverTime: 1716850497123 }
   │
   ├──────────────────► 📱 Celular 1
   ├──────────────────► 📱 Celular 2   ← todos recebem ao mesmo tempo
   └──────────────────► 📱 Celular 3

Cada celular calcula: offset = serverTime - Date.now()
E aplica no buffer de envio: atrasa ou adianta em ±offset
Resultado: todos transmitem no mesmo "instante lógico"
```

### 6. Consumo no OBS via Browser Source
```
[OBS Studio]
  ├── Cena "Câmera 1"  → Browser Source: http://192.168.1.10:3000/obs/camera-1
  ├── Cena "Câmera 2"  → Browser Source: http://192.168.1.10:3000/obs/camera-2
  ├── Cena "Câmera 3"  → Browser Source: http://192.168.1.10:3000/obs/camera-3
  └── Cena "Grid"      → Browser Source: http://192.168.1.10:3000/monitor

Vantagens vs NDI:
  ✅ Zero instalação extra no OBS
  ✅ Latência menor (~50–150ms vs ~500ms NDI)
  ✅ Funciona em qualquer OS
  ✅ Cada câmera = URL isolada
```

---

## 🔄 Sincronização de Câmeras — Módulo de Sync

> **Requisito crítico**: as câmeras precisam chegar sincronizadas ao OBS para que os cortes entre cenas não causem saltos temporais visíveis.

### Por que sync é necessário?

Mesmo em rede local, cada celular tem:
- Relógio interno levemente diferente (clock drift)
- Variação no jitter de rede (pacotes chegam com timing diferente)
- Buffer do codec que atrasa alguns frames antes de enviar

Sem sync: câmera 1 pode estar **200–400ms à frente** da câmera 2.

### Solução escolhida: LiveKit DataChannel

**Por que LiveKit DataChannel e não outra coisa?**

| Alternativa | Precisão | Problema |
|---|---|---|
| Nada | ±200–500ms | Inaceitável para produção |
| NTP local | ±10–50ms | Requer configurar servidor NTP separado |
| PTP (IEEE 1588) | ±1ms | Extremamente complexo, hardware específico |
| **LiveKit DataChannel** | **±5–20ms** | **Já está na infra — zero dependência extra** |

> **LiveKit DataChannel** é o canal de dados embutido no WebRTC já em uso. Não adiciona nenhuma biblioteca, nenhum processo extra, nenhuma porta nova. É leve por definição — trafega junto com o WebSocket de sinalização já existente.

### Como funciona na prática

```javascript
// === SERVIDOR (Token API / Node.js) ===
// Emite timestamp global a cada 500ms para todos os participantes
setInterval(() => {
  room.sendData(
    JSON.stringify({ type: 'sync', t: Date.now() }),
    DataPacket_Kind.RELIABLE
  )
}, 500)

// === CELULAR (PWA) ===
// Recebe o timestamp e calcula o offset
room.on(RoomEvent.DataReceived, (payload) => {
  const msg = JSON.parse(new TextDecoder().decode(payload))
  if (msg.type === 'sync') {
    const offset = msg.t - Date.now()     // ex: +37ms ou -12ms
    applySyncOffset(offset)               // ajusta buffer de envio
  }
})

// Aplica o offset: se câmera está adiantada, segura uns frames;
// se atrasada, descarta buffer e sobe o bitrate momentaneamente
function applySyncOffset(offsetMs) {
  if (Math.abs(offsetMs) < 5) return     // dentro do tolerável, ignora
  videoSender.setParameters({
    ...videoSender.getParameters(),
    encodings: [{ ...enc, active: offsetMs > 0 }] // pausa/retoma
  })
}
```

### Precisão esperada

| Rede | Precisão de sync | Perceptível no corte? |
|---|---|---|
| WiFi local, roteador dedicado | **±5–15ms** | Não — imperceptível |
| WiFi local, roteador compartilhado | **±15–40ms** | Raramente |
| WiFi congestionado | ±50–100ms | Às vezes — usar AP dedicado |

> A precisão de **±15ms** é mais que suficiente para produção ao vivo. O olho humano detecta dessincronização acima de ~80ms.

### Teste de sync em produção

Para validar o sync antes de ir ao ar:
1. Aponte todas as câmeras para um **cronômetro na tela** (celular, relógio digital)
2. No OBS, exiba todas as Browser Sources simultaneamente
3. Faça print screen ou grave 1 segundo
4. Medir a diferença de milissegundos entre as câmeras no frame capturado
5. Se > 50ms: ajustar o intervalo de sync de 500ms → 200ms

---

## 🎬 Integração OBS

### Configuração Browser Source por câmera

```
OBS → Sources → Add → Browser Source
  URL: http://192.168.1.10:3000/obs/camera-1
  Width: 1920
  Height: 1080
  FPS: 30
  ✅ Control audio via OBS: DESMARCADO (sem áudio — vem da mesa de som)
  ✅ Refresh browser when scene becomes active: MARCADO
```

### Rota `/obs/camera-N` vs `/monitor`

- **`/obs/camera-N`** → página minimalista, só o `<video>` fullscreen, sem UI. Ideal para Browser Source individual.
- **`/monitor`** → grid completo com labels e status. Pode ser usado como Browser Source de "overview" ou num tablet separado.

### Latência total câmera → OBS

```
Captura câmera:    ~33ms  (1 frame a 30fps)
Encoder celular:   ~16ms  (H.264 hardware)
WiFi UDP:          ~2ms   (rede local)
SFU repasse:       ~1ms   (forwarding, sem decode)
Browser OBS:       ~33ms  (render 1 frame)
─────────────────────────
Total:             ~85ms  ← excelente para ao vivo
```

---

## 🛠️ Stack Tecnológica

### Servidor — LiveKit Server

| Item | Detalhe |
|---|---|
| **Linguagem** | Go (você não precisa programar em Go) |
| **Distribuição** | Binário único (~40MB) |
| **Protocolo** | WebRTC (UDP), WebSocket (sinalização) |
| **SFU engine** | Pion WebRTC (Go) |
| **Codecs suportados** | H.264, VP8, VP9, AV1, Opus |
| **CPU idle** | ~1–2% (não transcodifica) |
| **RAM idle** | ~50–80MB |
| **RAM por câmera** | ~10–15MB adicional |
| **Licença** | Apache 2.0 (open source, gratuito) |

### Frontend Mobile (PWA) — Câmera

| Item | Detalhe |
|---|---|
| **Tecnologia** | HTML5 + JavaScript puro |
| **SDK** | `livekit-client` (npm) |
| **Bundler** | Vite |
| **Browser suportado** | Safari iOS 14.3+, Chrome Android 70+ |
| **App store necessária** | ❌ Não — abre direto no browser |
| **Acesso à câmera** | `getUserMedia()` nativo do browser |
| **Codecs** | H.264 (iOS), VP8/H.264 (Android) |

### Frontend Monitor (Web App)

| Item | Detalhe |
|---|---|
| **Tecnologia** | React + TypeScript |
| **SDK** | `livekit-client` |
| **UI** | Layout em grid responsivo |
| **Features** | Grid automático, labels por câmera, status em tempo real |

### Geração de Tokens

| Item | Detalhe |
|---|---|
| **Linguagem** | Node.js |
| **SDK** | `livekit-server-sdk` |
| **Endpoint** | REST API simples |
| **Autenticação** | API Key + Secret (configurado no .yaml) |

---

## 🎛️ Otimizações de Vídeo

### Configuração da câmera no browser (getUserMedia)

```javascript
// Configuração otimizada para Full HD 30fps
const constraints = {
  video: {
    width:     { ideal: 1920, max: 1920 },
    height:    { ideal: 1080, max: 1080 },
    frameRate: { ideal: 30,   max: 30   },
    facingMode: 'environment',      // câmera traseira
    resizeMode: 'crop-and-scale',   // mantém aspect ratio
  },
  audio: false  // sem áudio = menos banda
}
```

### Configuração LiveKit para rede local (sem adaptação agressiva)

```javascript
// Publicar câmera com parâmetros fixos (rede local = estável)
await room.localParticipant.publishTrack(videoTrack, {
  videoEncoding: {
    maxBitrate: 4_000_000,   // 4 Mbps máximo
    maxFramerate: 30,
  },
  simulcast: false,          // DESLIGA simulcast (rede local não precisa)
  degradationPreference: 'maintain-resolution',  // prioriza resolução
})
```

> **Simulcast desligado** = sem camadas de qualidade múltiplas = menos CPU no celular e menos banda.

### Por que UDP e não TCP?

- **TCP**: garante entrega, mas re-envia pacotes perdidos → cria jitter e atraso
- **UDP**: não garante entrega, mas é instantâneo → WebRTC prefere UDP e tolera perda de pacote (vídeo corrige sozinho via codec)
- Em rede local WiFi: perda de pacote < 0.1%, UDP é ideal

### Codec H.264 vs VP8 vs VP9

| Codec | iOS | Android | CPU encoder | Qualidade |
|---|---|---|---|---|
| **H.264** | ✅ Acelerado por hardware | ✅ | Mínima | Boa |
| VP8 | ⚠️ Software only | ✅ | Média | Boa |
| VP9 | ❌ | ✅ | Alta | Melhor |
| AV1 | ❌ (iOS 17+) | ✅ (Android 10+) | Muito alta | Melhor |

> **Use H.264 preferido** — acelerado por hardware em todos os celulares, zero impacto na bateria do encoder.

---

## 📶 Estimativa de Banda por Qualidade

| Resolução | FPS | Bitrate por câmera | 4 câmeras | 8 câmeras |
|---|---|---|---|---|
| 1080p | 30 | 3–5 Mbps | ~16–20 Mbps | ~32–40 Mbps |
| 1080p | 60 | 6–8 Mbps | ~24–32 Mbps | ~48–64 Mbps |
| 720p | 30 | 1.5–2.5 Mbps | ~6–10 Mbps | ~12–20 Mbps |
| 480p | 30 | 0.8–1.2 Mbps | ~3–5 Mbps | ~6–10 Mbps |

> WiFi 5 (5GHz) em canal não congestionado: ~300–400 Mbps disponível — comporta ~8 câmeras em 1080p 30fps com folga.

---

## 📁 Estrutura de Pastas do Projeto

```
multicam-live/
│
├── server/
│   ├── livekit.yaml          ← Configuração do LiveKit Server
│   └── start.sh / start.bat  ← Script para iniciar servidor
│
├── token-api/                ← Node.js: gera tokens de acesso
│   ├── src/
│   │   └── index.ts          ← Express API: GET /token?room=X&name=Y
│   ├── package.json
│   └── tsconfig.json
│
├── mobile-camera/            ← PWA: abre no browser do celular
│   ├── index.html
│   ├── src/
│   │   ├── main.ts           ← Lógica principal (LiveKit SDK)
│   │   ├── camera.ts         ← getUserMedia + publicação
│   │   └── ui.ts             ← Interface simples
│   ├── vite.config.ts
│   └── package.json
│
├── monitor/                  ← React: exibe todos os feeds
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── CameraGrid.tsx    ← Grid de vídeos
│   │   │   ├── CameraCard.tsx    ← Card de cada câmera
│   │   │   └── StatusBar.tsx     ← Status da conexão
│   │   └── hooks/
│   │       └── useLiveKit.ts     ← Hook do LiveKit SDK
│   ├── vite.config.ts
│   └── package.json
│
├── package.json              ← Monorepo root (npm workspaces)
└── README.md
```

---

## 🔐 Segurança e Acesso

### Sem internet — 100% local
- O servidor LiveKit roda **sem acesso à internet**
- Sem ICE/TURN servers externos — usa ICE host candidates (LAN direto)
- Comunicação apenas na rede WiFi privada

### Controle de acesso por token JWT
```
[Token API] gera token JWT com:
  - room: "producao-ao-vivo"
  - identity: "camera-1"
  - permissions: canPublish=true, canSubscribe=false  ← câmera só envia

[Token API] gera token JWT com:
  - room: "producao-ao-vivo"
  - identity: "monitor-principal"
  - permissions: canPublish=false, canSubscribe=true  ← monitor só recebe
```

---

## 🚀 Roadmap de Desenvolvimento

### Fase 1 — MVP funcional (1–2 semanas)
- [ ] Instalar e configurar LiveKit Server local
- [ ] Token API em Node.js (endpoint simples)
- [ ] PWA câmera básico (envia câmera traseira HD, **sem áudio**)
- [ ] Monitor básico (grid de vídeos)
- [ ] Rota `/obs/camera-N` — página minimalista para Browser Source OBS
- [ ] Teste com 2 celulares simultâneos no OBS

### Fase 2 — Sincronização + Funcionalidades (2–3 semanas)
- [ ] **Módulo de sync via DataChannel** — broadcast de timestamp do servidor
- [ ] **Lógica de offset no celular** — aplica ajuste de buffer baseado no timestamp
- [ ] **Teste de sync**: apontar câmeras para cronômetro e medir desvio no OBS
- [ ] Interface da câmera (nome, status de conexão, indicador de sync)
- [ ] Interface do monitor (labels, indicador de sinal, contagem de câmeras)
- [ ] Reconexão automática ao perder WiFi
- [ ] Seleção de câmera (frontal/traseira) na PWA
- [ ] Wake Lock API — tela permanece ligada enquanto transmite

### Fase 3 — Polimento (1–2 semanas)
- [ ] QR Code gerado automaticamente para cada câmera (operador só escaneia)
- [ ] Indicador de FPS, bitrate e status de sync em tempo real
- [ ] Ajuste fino do intervalo de sync (500ms padrão → 200ms se necessário)
- [ ] Layout monitor: modo fullscreen por câmera com atalho de teclado
- [ ] Gravação de vídeo local (livekit egress — opcional)

---

## ⚠️ Limitações Conhecidas

| Limitação | Causa | Contorno |
|---|---|---|
| iOS exige Safari | Apple restringe WebRTC em outros browsers | Usar Safari (funciona bem) |
| Câmera fecha ao bloquear tela iOS | Comportamento do browser iOS | Wake Lock API — mantém tela ligada |
| getUserMedia não tem zoom digital | API do browser | Ajustar zoom físico da câmera antes |
| Qualidade depende do celular | Encoder de hardware varia | Testar com cada device antes do evento |
| Sync perfeito de frame impossível via software | Clock drift de cada device | DataChannel sync chega a ±5–15ms — imperceptível |
| OBS Browser Source re-inicia ao trocar cena | Comportamento padrão do OBS | Marcar "Keep source active" nas configurações |

---

## 🧰 Dependências e Instalações

### Servidor LiveKit
```bash
# Windows (via winget)
winget install LiveKit.LiveKit

# Ou baixar .exe em:
# https://github.com/livekit/livekit/releases
```

### Node.js packages
```bash
# Token API
npm install livekit-server-sdk express cors

# Mobile Camera (PWA)
npm install livekit-client
npm install -D vite typescript

# Monitor
npm install livekit-client react react-dom
npm install -D vite @vitejs/plugin-react typescript
```

---

## 📋 Configuração LiveKit (livekit.yaml)

```yaml
port: 7880
bind_addresses:
  - ""                    # escuta em todas as interfaces
rtc:
  tcp_port: 7881
  udp_port: 7882
  use_external_ip: false  # rede local = sem IP externo
  max_bitrate: 8000000    # 8 Mbps por stream máx
  
keys:
  multicam_key: seu_secret_aqui_min32chars

room:
  auto_create: true
  enable_remote_unmute: true
  max_participants: 20    # máx de câmeras + monitores

logging:
  level: warn             # menos logs = menos I/O
```

---

## 💡 Dicas de Performance na Produção

1. **Roteador dedicado** — separe os celulares de câmera em uma rede WiFi exclusiva (SSID separado), sem tráfego de outros dispositivos concorrendo

2. **5GHz sempre** — 2.4GHz tem muito mais interferência e menor banda; force os celulares a se conectar em 5GHz

3. **Posicionamento do AP** — o Access Point deve estar no centro do ambiente de filmagem

4. **Wake Lock** — na PWA, use a Wake Lock API para manter a tela ligada e o stream ativo:
   ```javascript
   await navigator.wakeLock.request('screen')
   ```

5. **Modo avião + WiFi** — no celular, ativar modo avião e depois só WiFi evita que o sinal celular interfira

6. **Bateria** — transmissão de vídeo gasta ~10–15% de bateria por hora; leve power banks

7. **Temperatura** — celulares aquecem transmitindo; evite capas grossas e luz solar direta

---

## 📐 Comparativo Final de Soluções

| Solução | Latência | Configuração | App nativo | Rede local | Custo |
|---|---|---|---|---|---|
| **MultiCam Live (LiveKit)** | < 200ms | Média | ❌ (browser) | ✅ 100% | Grátis |
| iRum / Larix | 2–10s | Fácil | ✅ | ⚠️ Parcial | Grátis/Pago |
| NDI | < 1s | Complexa | ✅ | ✅ | Pago |
| OBS + NDI | 500ms | Complexa | ✅ | ✅ | Grátis |
| Zoom/Meet | 1–3s | Fácil | ✅ | ❌ Cloud | Pago |

---

*Documento gerado em 27/05/2026 — MultiCam Live Project*
