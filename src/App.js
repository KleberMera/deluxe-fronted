import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import RegisterPage from './components/RegisterPage';
import UsersMapPage from './components/MapaCalor'; // Asegúrate de tener este archivo
import MaintenancePage from './components/RegisterPage';
import ManualRegisterPage from './components/RegistroManual';
import Dashboard from './components/AdminDashboard';
import ManualRegisterUserPage from './components/RegistroManualUsuarios';
import DashboardAdmin from './components/TablasDashboard';
import ManualRegistroVarios from './v2/components/RegistroManualVarios';
import DashboardVarios from './v2/components/AdminDashboardVarios';
import SorteoPage from './v2/components/SorteoPage';


function Home() {
  return (
    <div className="App relative">
      <MaintenancePage />
    </div>
  );
}

function App() {
  useEffect(() => {
    // Agregar la fuente dinámicamente
    const fontFace = `
      @font-face {
        font-family: 'Doctor Glitch';
        src: url('/fonts/doctor_glitch.otf') format('opentype');
        font-display: swap;
      }
    `;

    const style = document.createElement('style');
    style.innerHTML = fontFace;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta principal activa */}
        <Route path="/" element={<ManualRegisterPage />} />
        <Route path="/admin-panel" element={<Dashboard />} />
        <Route path="/registro-manual" element={<ManualRegisterPage />} />
        <Route path="/administracion-tablas" element={<DashboardAdmin />} />
        <Route path='/registro-usuarios-varios' element={<ManualRegistroVarios />} />
                <Route path='/admin-panel-varios' element={<DashboardVarios />} />
        <Route path="/sorteos-varios" element={<SorteoPage />} />


        {/* Rutas reservadas (comentadas, no se usan ahora) */}
        {/*
        <Route path="/" element={<RegisterPage />} />
        <Route path="/admin-panel" element={<Dashboard />} />
        <Route path="/registro-manual" element={<ManualRegisterPage />} />
        <Route path="/administracion-tablas" element={<DashboardAdmin />} />
        <Route path="/users-map" element={<UsersMapPage />} />
        */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;

// NOTA: 
// - Solo "/" está activa ahora.
// - El bloque de rutas está comentado con {*/ ... /*} para mantenerlo listo por si luego lo necesitas.
