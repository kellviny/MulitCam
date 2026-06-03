import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getCameraInfo: () => ipcRenderer.invoke('get-camera-info'),
  getNetworkInterfaces: () => ipcRenderer.invoke('get-network-interfaces'),
  setSelectedIp: (ip: string) => ipcRenderer.invoke('set-selected-ip', ip),
});
