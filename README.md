# MultiCam Live 📡

Sistema de transmissão ao vivo com múltiplos celulares via rede local privada, usando WebRTC + SFU para máxima performance com mínimo uso de rede. Integração direta com OBS Studio via Browser Source.

## Requisitos

1. **Node.js** v18+
2. **LiveKit Server**
   - No Windows: Pode ser instalado via winget (`winget install LiveKit.LiveKit`) ou baixando o `.exe` de [LiveKit Releases](https://github.com/livekit/livekit/releases).
3. **Roteador WiFi** dedicado de preferência 5GHz para as câmeras.

## Como rodar o projeto

### Passo 1: Iniciar o LiveKit Server

Na pasta raiz do projeto ou na pasta `server/`, inicie o LiveKit usando o script `start.bat`:

```bash
cd server
start.bat
```

*(Nota: Certifique-se de que o executável `livekit-server` está no seu PATH do sistema, ou coloque-o na mesma pasta)*

### Passo 2: Iniciar as Aplicações

Abra um terminal na raiz do projeto e execute:

```bash
npm install
npm run dev
```

Isso irá iniciar três serviços:
1. **Token API**: `http://localhost:3001` (Gera tokens JWT)
2. **Câmera Mobile (PWA)**: `https://<IP-DA-MAQUINA>:3002` (Abra no celular)
3. **Monitor**: `http://localhost:3000` (Grid de câmeras)

### Passo 3: Conectar Câmeras (Smartphones)

1. No seu celular, conecte no mesmo WiFi do seu computador.
2. Descubra o IP do seu computador (ex: `192.168.1.100`).
3. Abra o Safari (iOS) ou Chrome (Android) e acesse:
   `https://192.168.1.100:3002/?room=live&name=cam1`
4. Aceite o alerta de segurança do certificado auto-assinado (necessário para a câmera funcionar via HTTPS na rede local).
5. Permita o uso da câmera. A transmissão irá iniciar (tela fica com status "Ao Vivo" verde).

### Passo 4: OBS Studio

Para capturar uma câmera individual no OBS:
1. Adicione uma nova fonte **Browser (Navegador)**
2. Defina a URL para: `http://localhost:3000/obs/camera/cam1` (Substitua `cam1` pelo nome da câmera)
3. Defina **Largura**: 1920 e **Altura**: 1080
4. Defina **FPS**: 30
5. Marque a opção: "Atualizar navegador quando a cena se tornar ativa"
6. O áudio **não** é transmitido pelas câmeras (ele deve vir de sua interface/mesa de som ligada ao OBS).

Para monitorar todas as câmeras:
Acesse no seu navegador de desktop: `http://localhost:3000`

## Arquitetura

- **Token API**: Servidor Node.js para distribuição de acesso seguro ao LiveKit.
- **Mobile Camera (PWA)**: Utiliza `getUserMedia` com resolução preferida de 1080p, Wake Lock API e `livekit-client` enviando dados via WebRTC sem recodificação agressiva.
- **Monitor / OBS**: Feito em React, consome streams puros recebidos pelo SFU.

## Sync de Câmeras

A API do servidor despacha continuamente um timestamp de sincronia. A Câmera Mobile exibe o offset (atraso relativo) na interface (`Sync: +X ms`). Um valor verde significa que o tempo de disparo e a compensação de frames está em boa qualidade (<20ms).
