# MultiCam Live System

O **MultiCam Live** é um sistema profissional e de ultra-baixa latência desenvolvido para transformar smartphones (iPhones e Androids) em câmeras sem fio de alta qualidade para transmissões ao vivo. Focado 100% em rede local (Wi-Fi), ele elimina a necessidade de fios e placas de captura, entregando o vídeo diretamente para softwares de transmissão como o **OBS Studio**.

### Como Funciona:
O sistema é dividido em três módulos principais que operam em harmonia através da tecnologia **WebRTC (LiveKit)** embutida:

1. **O Hub Central (Desktop App):** Um aplicativo de computador que atua como o "cérebro" da operação. Ele roda um servidor próprio em segundo plano, gerenciando a conexão entre todos os celulares e o OBS, garantindo que tudo funcione offline.
2. **O Aplicativo de Câmera (Mobile Web App):** Interface limpa e inteligente para o celular. Transmite em Simulcast (alta resolução para o OBS, baixa para monitoramento), suporta troca de lentes nativas (ex: Grande Angular) e Zoom via pinça. Funciona em Tela Cheia no iOS via PWA (Adicionar à Tela de Início).
3. **A Central de Monitoramento:** Uma tela no Desktop (2x2) onde o operador pode monitorar sinais, codecs, FPS e controlar o zoom remotamente.

---

## 🐧 Como compilar para Linux (Ubuntu, Mint, Debian, etc)

Antes de começar, certifique-se de que seu sistema tenha as seguintes ferramentas essenciais pré-instaladas:
- **Node.js** (versão 18 ou superior recomendada) e **npm**
- **Git**
- **Ferramentas de compilação base** (No Ubuntu/Mint/Debian: `sudo apt update && sudo apt install build-essential curl`)

**1. Clone o repositório e instale as dependências**
```bash
git clone https://github.com/kellviny/MulitCam.git
cd MulitCam

# Instala todas as dependências (raiz e submódulos automaticamente)
npm install
```

**2. Compilar e Gerar os Instaladores (.AppImage e .deb)**
O projeto já possui um script que cuida de tudo! Ele fará o build do Frontend, baixará nativamente o servidor LiveKit para Linux e fará o empacotamento com o Electron-builder. 

Na raiz do projeto, rode apenas um comando:
```bash
npm run build:linux
```

Após a conclusão (pode demorar alguns minutos na primeira vez), os instaladores (`.AppImage` e `.deb`) estarão disponíveis dentro da pasta `desktop-app/release/`.
