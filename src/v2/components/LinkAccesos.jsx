import React, { useEffect, useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const LinkAccesos = () => {
  const [copied, setCopied] = useState(null);
  const [activeTab, setActiveTab] = useState('deluxe');

  // Cargar fuente Doctor Glitch igual que en RegistroManualVarios para mantener estilo
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @font-face {
        font-family: 'Doctor Glitch';
        src: url('/assets/fonts/doctor_glitch.woff2') format('woff2');
        font-weight: normal;
        font-style: normal;
      }
    `;
    document.head.appendChild(style);
  }, []);

  const deluxeLinks = [
    { url: 'https://deluxe.bingoamigo.net/admin-panel', label: 'Métricas' },
    { url: 'https://deluxe.bingoamigo.net/', label: 'Registro' },
    { url: 'https://deluxe.bingoamigo.net/administracion-tablas', label: 'Control tablas' },
    { url: 'https://sorteos.bingoamigo.net/', label: 'Sorteo' }
  ];

  const variosLinks = [
    { url: 'https://deluxe-fronted.vercel.app/admin-panel-varios', label: 'Métricas' },
    { url: 'https://deluxe-fronted.vercel.app/registro-usuarios-varios', label: 'Registros' },
    { url: 'https://deluxe-fronted.vercel.app/sorteos-varios', label: 'Sorteo' }
  ];

  const handleCopy = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(url);
      toast.success('Link copiado');
      setTimeout(() => setCopied(null), 1800);
    } catch (err) {
      console.error('Error copiando URL:', err);
    }
  };

  const LinkRow = ({ item }) => (
    <div
      role="button"
      tabIndex={0}
      onClick={() => window.open(item.url, '_blank', 'noopener')}
      onKeyDown={(e) => { if (e.key === 'Enter') window.open(item.url, '_blank', 'noopener'); }}
      className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm border cursor-pointer hover:shadow-md transition"
    >
      <div className="flex-1 pr-4 min-w-0">
        <div className="font-medium text-gray-800">{item.label}</div>
        <div className="text-xs text-gray-500 truncate max-w-xs md:max-w-md lg:max-w-lg">{item.url}</div>
      </div>
      <div className="flex items-center space-x-2 ml-4">
        <button
          onClick={(e) => { e.stopPropagation(); handleCopy(item.url); }}
          aria-label={`Copiar enlace ${item.label}`}
          className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition flex items-center justify-center"
        >
          {copied === item.url ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-gray-700" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M18 3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-1V9a4 4 0 0 0-4-4h-3a1.99 1.99 0 0 0-1 .267V5a2 2 0 0 1 2-2h7Z" clipRule="evenodd"/>
              <path fillRule="evenodd" d="M8 7.054V11H4.2a2 2 0 0 1 .281-.432l2.46-2.87A2 2 0 0 1 8 7.054ZM10 7v4a2 2 0 0 1-2 2H4v6a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3Z" clipRule="evenodd"/>
            </svg>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-2 md:p-4 relative overflow-hidden bg-gradient-to-br from-blue-900 via-blue-800 to-zinc-900">
      <div className="absolute inset-0 bg-black bg-opacity-20"></div>

      <div className="w-full max-w-4xl mx-2 relative z-10">
        <div className="bg-white bg-opacity-90 rounded-xl shadow-2xl overflow-hidden border-2 md:border-4 border-white">
          <ToastContainer position="top-center" />
          <div className="bg-blue-600 p-3 md:p-4 text-center">
            <h1 className="text-lg md:text-2xl font-bold text-white" style={{ fontFamily: "'Doctor Glitch', sans-serif", textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
              ACCESOS RÁPIDOS
            </h1>

          </div>

          <div className="p-4 md:p-6">
            <div className="mb-4">
              <div className="inline-flex bg-gray-100 rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('deluxe')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'deluxe' ? 'bg-white shadow text-gray-800' : 'text-gray-600 hover:bg-gray-200'}`}
                >
                  Deluxe
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('varios')}
                  className={`ml-1 px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'varios' ? 'bg-white shadow text-gray-800' : 'text-gray-600 hover:bg-gray-200'}`}
                >
                  Varios
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {(activeTab === 'deluxe' ? deluxeLinks : variosLinks).map(l => (
                <LinkRow key={l.url} item={l} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LinkAccesos;
