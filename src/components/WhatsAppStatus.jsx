import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import environments from '../environment/environments';

const WhatsAppStatus = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const BASE_URL = environments.apiUrl

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BASE_URL}/whatsapp-otp/status`);
      
      if (response.ok) {
        const result = await response.json();
        setStatus(result);
        setError(null);
      } else {
        setError('Error al obtener el estado del servicio');
      }
    } catch (err) {
      setError('Error de conexión');
      console.error('Error fetching WhatsApp status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Actualizar cada 30 segundos
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (state) => {
    switch (state) {
      case 'ready':
        return 'from-green-500 to-green-600';
      case 'connecting':
        return 'from-yellow-500 to-yellow-600';
      case 'disconnected':
        return 'from-red-500 to-red-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const getStatusIcon = (state) => {
    switch (state) {
      case 'ready':
        return <CheckCircle className="text-white" size={20} />;
      case 'connecting':
        return <Clock className="text-white" size={20} />;
      case 'disconnected':
        return <WifiOff className="text-white" size={20} />;
      default:
        return <AlertCircle className="text-white" size={20} />;
    }
  };

  const getStatusText = (state) => {
    switch (state) {
      case 'ready':
        return 'WhatsApp Conectado';
      case 'connecting':
        return 'Conectando...';
      case 'disconnected':
        return 'Desconectado';
      default:
        return 'Estado Desconocido';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 flex items-center">
        <RefreshCw className="text-gray-400 mr-2 animate-spin" size={16} />
        <span className="text-gray-600 text-sm">Verificando estado...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
        <AlertCircle className="text-red-500 mr-2" size={16} />
        <span className="text-red-700 text-sm">{error}</span>
        <button
          onClick={fetchStatus}
          className="ml-auto text-red-600 hover:text-red-700 text-sm font-medium"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-r ${getStatusColor(status?.state)} rounded-lg p-4 shadow-sm flex items-center justify-between`}>
      <div className="flex items-center">
        {getStatusIcon(status?.state)}
        <div className="ml-3">
          <p className="text-white font-medium text-sm">{getStatusText(status?.state)}</p>
          {status?.phoneNumber && (
            <p className="text-white/80 text-xs">{status.phoneNumber}</p>
          )}
        </div>
      </div>
      <button
        onClick={fetchStatus}
        className="text-white/80 hover:text-white transition-colors"
      >
        <RefreshCw size={16} />
      </button>
    </div>
  );
};

export default WhatsAppStatus;
