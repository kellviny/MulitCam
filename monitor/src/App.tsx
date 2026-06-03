import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MonitorPage from './pages/MonitorPage';
import ObsCameraPage from './pages/ObsCameraPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MonitorPage />} />
        <Route path="/obs/camera/:id" element={<ObsCameraPage />} />
        <Route path="*" element={<div>Página não encontrada</div>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
