import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  base: '/camera/',
  plugins: [
    basicSsl() // Necessário para gerar um certificado auto-assinado e permitir acesso a getUserMedia no celular
  ],
  server: {
    host: '0.0.0.0', // Escuta em toda a rede local
    port: 3002,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
      '/livekit': {
        target: 'ws://127.0.0.1:7880',
        ws: true,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/livekit/, '')
      }
    }
  }
});
