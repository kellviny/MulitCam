# MultiCam Live System

O **MultiCam Live** é um sistema profissional e de ultra-baixa latência desenvolvido para transformar smartphones (iPhones e Androids) em câmeras sem fio de alta qualidade para transmissões ao vivo. Focado 100% em rede local (Wi-Fi), ele elimina a necessidade de fios e placas de captura, entregando o vídeo diretamente para softwares de transmissão como o **OBS Studio**.

### Como Funciona:
O sistema é dividido em três módulos principais que operam em harmonia através da tecnologia **WebRTC (LiveKit)** embutida:

1. **O Hub Central (Desktop App):** Um aplicativo de computador que atua como o "cérebro" da operação. Ele roda um servidor próprio em segundo plano, gerenciando a conexão entre todos os celulares e o OBS, garantindo que tudo funcione offline.
2. **O Aplicativo de Câmera (Mobile Web App):** Interface limpa e inteligente para o celular. Transmite em Simulcast (alta resolução para o OBS, baixa para monitoramento), suporta troca de lentes nativas (ex: Grande Angular) e Zoom via pinça. Funciona em Tela Cheia no iOS via PWA (Adicionar à Tela de Início).
3. **A Central de Monitoramento:** Uma tela no Desktop (2x2) onde o operador pode monitorar sinais, codecs, FPS e controlar o zoom remotamente.

---

## 🐧 Como compilar para Linux (Ubuntu, Mint, Debian, etc)

Se você clonar este projeto em uma máquina Linux, siga as instruções abaixo para compilar o aplicativo (`.AppImage` e `.deb`).

**1. Clone e instale as dependências**
```bash
git clone https://github.com/kellviny/MulitCam.git
cd MulitCam

# Instala as dependências da raiz
npm install

# Instala as dependências do aplicativo Desktop
cd desktop-app
npm install
cd ..
```

**2. Baixe e prepare o Servidor LiveKit nativo para Linux**
O Linux não roda `.exe`. Você precisa baixar o binário nativo do LiveKit na pasta `desktop-app/build/`.
```bash
# Certifique-se de estar na raiz do projeto (MulitCam)
mkdir -p desktop-app/build

# Baixa o LiveKit do Linux direto do GitHub oficial (Versão 1.12.0)
curl -L https://github.com/livekit/livekit/releases/download/v1.12.0/livekit_1.12.0_linux_amd64.tar.gz -o livekit.tar.gz

# Extrai o arquivo
tar -xzf livekit.tar.gz livekit-server

# Move para a pasta do Desktop App e dá permissão de execução
mv livekit-server desktop-app/build/livekit-server
chmod +x desktop-app/build/livekit-server

# Apaga o zip baixado para limpar
rm livekit.tar.gz
```

**3. Compilar e Gerar os Instaladores**
```bash
# Constrói o Monitor e a Câmera Mobile
npm run build:all

# Empacota o aplicativo Desktop para Linux (gera o .AppImage e .deb)
cd desktop-app
npm run dist
```

Após o término, os instaladores (`.AppImage` e `.deb`) estarão disponíveis na pasta `desktop-app/release/`.
