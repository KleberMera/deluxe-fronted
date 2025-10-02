import React, { useState, useEffect } from 'react';
import { Users, BarChart3, Activity, Database, UserCheck, Calendar, Trophy, Award, Filter, X, ChevronDown, Send, RefreshCw, MessageCircle } from 'lucide-react';
import ReenvioTablas from './ReenvioTablas';
import MensajeriaMasiva from './MensajeriaMasiva';
import environments from '../environment/environment';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'reenvio', 'masivos'
  const [data, setData] = useState({
    registradores: [],
    brigadas: [],
    usuarios: [],
    lastFetched: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedBrigada, setSelectedBrigada] = useState('');
  const [filteredData, setFilteredData] = useState(null);
  const [isResending, setIsResending] = useState(false); // Estado para controlar actualizaciones durante reenvío
  const BASE_URL = environments.apiUrl
  // Función para obtener los datos de la API
  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BASE_URL}/registradores/dashboard-metrics`);
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setData({
          ...result,
          lastFetched: Date.now() // Agregar timestamp
        });
      } else {
        throw new Error('Error en la respuesta de la API');
      }
    } catch (err) {
      setError(err.message);
      console.error('Error fetching metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch inicial solo si estamos en el dashboard
    if (activeTab === 'dashboard') {
      fetchMetrics();
    }
    
    // Solo crear intervalo si estamos en dashboard y no hay reenvío en proceso
    let interval;
    if (activeTab === 'dashboard' && !isResending) {
      console.log('▶️ Iniciando actualizaciones automáticas cada 30 segundos...');
      interval = setInterval(() => {
        console.log('🔄 Actualizando métricas automáticamente...');
        fetchMetrics();
      }, 30000);
    } else if (activeTab === 'dashboard' && isResending) {
      console.log('⏸️ Actualizaciones automáticas pausadas durante reenvío...');
    } else {
      console.log('📊 No se actualizan métricas - fuera del dashboard');
    }
    
    // Cleanup function
    return () => {
      if (interval) {
        console.log('🛑 Limpiando intervalo de actualizaciones automáticas...');
        clearInterval(interval);
      }
    };
  }, [activeTab, isResending]); // Dependencias: se ejecuta cuando cambian activeTab o isResending

  // Efecto para pausar/reanudar actualizaciones automáticas durante reenvío
  useEffect(() => {
    if (isResending) {
      console.log('⏸️ Pausando actualizaciones automáticas durante reenvío...');
    } else {
      console.log('▶️ Reanudando actualizaciones automáticas...');
    }
  }, [isResending]);

  // Efecto para manejar cambios de tab
  useEffect(() => {
    if (activeTab === 'dashboard') {
      console.log('📊 Entrando al dashboard - cargando métricas...');
      // Solo cargar métricas si no tenemos datos o si han pasado más de 30 segundos
      const shouldFetch = !data.usuarios.length || 
        (Date.now() - (data.lastFetched || 0)) > 30000;
      
      if (shouldFetch) {
        fetchMetrics();
      }
    } else {
      console.log(`📱 Cambiando a tab: ${activeTab} - pausando métricas`);
    }
  }, [activeTab]);

  useEffect(() => {
    if (selectedBrigada) {
      const brigadaId = parseInt(selectedBrigada);
      const filtered = {
        registradores: data.registradores.filter(r => r.brigada_id === brigadaId),
        usuarios: data.usuarios.filter(u => u.brigada_id === brigadaId),
        brigadas: data.brigadas.filter(b => b.id_brigada === brigadaId)
      };
      setFilteredData(filtered);
    } else {
      setFilteredData(null);
    }
  }, [selectedBrigada, data]);

  // Calcular métricas CORREGIDAS
  const calculateMetrics = (dataSource) => {
    const totalUsuarios = dataSource.usuarios.length;
    
    // Registradores activos: contar registradores únicos con al menos 1 usuario
    const registradoresActivos = [...new Set(
      dataSource.registradores
        .filter(r => r.user_id !== null)
        .map(r => r.registrador_id)
    )].length;
    
    // Brigadas activas: contar brigadas únicas con al menos 1 usuario
    const brigadasActivas = [...new Set(
      dataSource.brigadas
        .filter(b => b.activa && dataSource.usuarios.some(u => u.brigada_id === b.id_brigada))
        .map(b => b.id_brigada)
    )].length;
    
    const today = new Date().toISOString().split('T')[0];
    const usuariosHoy = dataSource.usuarios.filter(u => 
      u.created_at && u.created_at.split('T')[0] === today
    ).length;

    // Registros por mes (últimos 6 meses)
    const registrosPorMes = [];
    const hoy = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
      const key = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
      const nombreMes = fecha.toLocaleDateString('es-ES', { month: 'long' });
      
      const registros = dataSource.usuarios.filter(u => {
        if (!u.created_at) return false;
        const fechaRegistro = new Date(u.created_at);
        return fechaRegistro.getFullYear() === fecha.getFullYear() && 
               fechaRegistro.getMonth() === fecha.getMonth();
      }).length;
      
      registrosPorMes.push({
        mes: nombreMes,
        total: registros
      });
    }

    return {
      totalUsuarios,
      registradoresActivos,
      brigadasActivas,
      usuariosHoy,
      registrosPorMes
    };
  };

  const currentData = filteredData || data;
  const metrics = calculateMetrics(currentData);
  const brigadaSeleccionada = selectedBrigada ? data.brigadas.find(b => b.id_brigada === parseInt(selectedBrigada)) : null;

  // Componente de tarjeta de métrica
  const MetricCard = ({ title, value, icon: Icon, color }) => (
    <div className={`bg-gradient-to-br ${color} rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white/90 text-sm font-medium">
            {brigadaSeleccionada ? `${title} (${brigadaSeleccionada.nombre_brigada})` : title}
          </p>
          <p className="text-3xl font-bold text-white mt-1">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
        </div>
        <div className={`w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm`}>
          <Icon className="text-white" size={24} />
        </div>
      </div>
    </div>
  );

  // Componente de todos los registradores
  const AllRegistradores = () => {
    const registradoresUnicos = currentData.registradores.reduce((acc, curr) => {
      if (!acc.find(r => r.registrador_id === curr.registrador_id)) {
        const usuariosCount = currentData.usuarios.filter(u => 
          u.id_registrador === curr.registrador_id
        ).length;

        if (usuariosCount > 0) {
          const today = new Date().toISOString().split('T')[0];
          const usuariosHoy = currentData.usuarios.filter(u => 
            u.id_registrador === curr.registrador_id && 
            u.created_at && u.created_at.split('T')[0] === today
          ).length;
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          const usuariosSemana = currentData.usuarios.filter(u => 
            u.id_registrador === curr.registrador_id && 
            u.created_at && new Date(u.created_at) >= weekAgo
          ).length;
          acc.push({
            ...curr,
            usuarios_count: usuariosCount,
            usuarios_hoy: usuariosHoy,
            usuarios_semana: usuariosSemana
          });
        }
      }
      return acc;
    }, []);

    const allRegistradores = registradoresUnicos
      .sort((a, b) => b.usuarios_count - a.usuarios_count);

    return (
      <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-6 shadow-lg border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-800 flex items-center">
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg p-2 mr-3">
              <UserCheck className="text-white" size={24} />
            </div>
            {brigadaSeleccionada ? 'REGISTRADORES DE LA BRIGADA' : 'TODOS LOS REGISTRADORES'}
            {brigadaSeleccionada && ` (${brigadaSeleccionada.nombre_brigada})`}
          </h3>
          <div className="text-right">
            <p className="text-sm text-gray-500">Total: {allRegistradores.length}</p>
            <p className="text-xs text-gray-400">Con al menos 1 registro</p>
          </div>
        </div>
        
        <div className="space-y-4">
          {allRegistradores.map((registrador, index) => (
            <div key={registrador.registrador_id} 
                 className={`relative p-4 rounded-xl border-2 transition-all duration-300 hover:scale-[1.02] ${
                   index === 0 ? 'border-yellow-300 bg-gradient-to-r from-yellow-50 to-orange-50 shadow-md shadow-yellow-100/50' :
                   index === 1 ? 'border-gray-300 bg-gradient-to-r from-gray-50 to-slate-50 shadow-md shadow-gray-100/50' :
                   index === 2 ? 'border-orange-300 bg-gradient-to-r from-orange-50 to-red-50 shadow-md shadow-orange-100/50' :
                   'border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-md shadow-blue-100/50'
                 }`}>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="text-2xl font-bold text-gray-700">#{index + 1}</div>
                  <div>
                    <h4 className="font-bold text-gray-800 text-lg">{registrador.nombre_registrador}</h4>
                    <div className="flex items-center space-x-4 mt-1">
                      <span className="text-sm text-gray-600">
                        📊 Total: <span className="font-semibold">{registrador.usuarios_count}</span>
                      </span>
                      <span className="text-sm text-gray-600">
                        📅 Hoy: <span className="font-semibold text-green-600">{registrador.usuarios_hoy}</span>
                      </span>
                      <span className="text-sm text-gray-600">
                        🗓️ Semana: <span className="font-semibold text-blue-600">{registrador.usuarios_semana}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Componente de tabla de brigadas
  const BrigadasTable = () => {
    const brigadasUnicas = data.brigadas.reduce((acc, curr) => {
      if (!acc.find(b => b.id_brigada === curr.id_brigada)) {
        const usuariosCount = data.usuarios.filter(u => u.brigada_id === curr.id_brigada).length;
        acc.push({
          ...curr,
          usuarios_count: usuariosCount
        });
      }
      return acc;
    }, []);

    const brigadasOrdenadas = brigadasUnicas.sort((a, b) => b.usuarios_count - a.usuarios_count);

    return (
      <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-6 shadow-lg border border-gray-200">
        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg p-2 mr-3">
            <Activity className="text-white" size={24} />
          </div>
          BRIGADAS
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Nombre</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Usuarios</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Estado</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {brigadasOrdenadas.map((brigada) => (
                <tr 
                  key={brigada.id_brigada} 
                  className={`border-b border-gray-100 hover:bg-gray-50/50 cursor-pointer ${selectedBrigada === brigada.id_brigada.toString() ? 'bg-blue-50' : ''}`}
                  onClick={() => setSelectedBrigada(brigada.id_brigada.toString())}
                >
                  <td className="py-3 px-4 text-gray-800 font-medium">
                    {brigada.nombre_brigada}
                    {brigadasOrdenadas[0]?.id_brigada === brigada.id_brigada && (
                      <span className="ml-2 bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">Líder</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span className="bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 px-2 py-1 rounded-full text-sm font-medium">
                      {brigada.usuarios_count}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                      brigada.activa 
                        ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800' 
                        : 'bg-gradient-to-r from-red-100 to-pink-100 text-red-800'
                    }`}>
                      {brigada.activa ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-600 text-sm">
                    {brigada.fecha_creacion ? new Date(brigada.fecha_creacion).toLocaleDateString() : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Componente de gráfico por meses
  const MonthlyChart = () => {
    const maxValue = Math.max(...metrics.registrosPorMes.map(m => m.total), 10);

    return (
      <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-6 shadow-lg border border-gray-200">
        <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg p-2 mr-3">
            <BarChart3 className="text-white" size={24} />
          </div>
          REGISTROS POR MES
          {brigadaSeleccionada && ` (${brigadaSeleccionada.nombre_brigada})`}
        </h3>
        
        <div className="space-y-4">
          {metrics.registrosPorMes.map((mes, index) => {
            const percentage = maxValue > 0 ? (mes.total / maxValue) * 100 : 0;
            const monthName = mes.mes.charAt(0).toUpperCase() + mes.mes.slice(1);
            
            return (
              <div key={index} className="flex items-center">
                <div className="w-24 text-sm font-medium text-gray-700 mr-4">
                  {monthName}
                </div>
                <div className="flex-1">
                  <div className="flex items-center">
                    <div className="w-full bg-gray-200 rounded-full h-4">
                      <div 
                        className="bg-gradient-to-r from-green-400 to-green-600 h-4 rounded-full"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <span className="ml-2 text-sm font-medium text-gray-700 min-w-[40px] text-right">
                      {mes.total}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Componente de resumen ejecutivo
const ExecutiveSummary = () => {
  // Usamos currentData en lugar de data para respetar el filtro
  const brigadasConUsuarios = currentData.brigadas.reduce((acc, curr) => {
    const usuariosCount = currentData.usuarios.filter(u => u.brigada_id === curr.id_brigada).length;
    if (usuariosCount > 0) {
      acc.push({
        ...curr,
        usuarios_count: usuariosCount
      });
    }
    return acc;
  }, []);

  const registradoresConUsuarios = currentData.registradores.reduce((acc, curr) => {
    const usuariosCount = currentData.usuarios.filter(u => u.id_registrador === curr.registrador_id).length;
    if (usuariosCount > 0) {
      if (!acc.find(r => r.registrador_id === curr.registrador_id)) {
        acc.push({
          ...curr,
          usuarios_count: usuariosCount
        });
      }
    }
    return acc;
  }, []);

  const brigadaLider = brigadasConUsuarios.sort((a, b) => b.usuarios_count - a.usuarios_count)[0];
  const registradorLider = registradoresConUsuarios.sort((a, b) => b.usuarios_count - a.usuarios_count)[0];
  
  // Calculamos el promedio diario basado en los datos filtrados
  const usuariosFiltrados = currentData.usuarios;
  const fechaMasAntigua = usuariosFiltrados.length > 0 
    ? new Date(Math.min(...usuariosFiltrados.filter(u => u.created_at).map(u => new Date(u.created_at)))) 
    : new Date();
  const diasTranscurridos = Math.max(1, Math.ceil((new Date() - fechaMasAntigua) / (1000 * 60 * 60 * 24)));
  const promedioDiario = Math.round(usuariosFiltrados.length / diasTranscurridos);

  return (
    <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-6 shadow-lg border border-gray-200">
      <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-2 mr-3">
          <Trophy className="text-white" size={24} />
        </div>
        RESUMEN EJECUTIVO
        {brigadaSeleccionada && ` (${brigadaSeleccionada.nombre_brigada})`}
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-gray-600 text-sm mb-1">Promedio diario</p>
          <p className="text-2xl font-bold text-blue-600">{promedioDiario}</p>
          <p className="text-xs text-gray-500">
            {filteredData ? "en esta brigada" : "general"}
          </p>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-gray-600 text-sm mb-1">Registrador líder</p>
          <p className="text-xl font-bold text-green-600 truncate">
            {registradorLider?.nombre_registrador || 'N/A'}
          </p>
          <p className="text-xs text-gray-500">
            {registradorLider?.usuarios_count || 0} registros
            {filteredData && " en esta brigada"}
          </p>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-gray-600 text-sm mb-1">
            {filteredData ? "Brigada actual" : "Brigada líder"}
          </p>
          <p className="text-xl font-bold text-purple-600 truncate">
            {brigadaLider?.nombre_brigada || 'N/A'}
          </p>
          <p className="text-xs text-gray-500">
            {brigadaLider?.usuarios_count || 0} personas
            {!filteredData && " (líder)"}
          </p>
        </div>
      </div>
    </div>
  );
};


  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-600">Cargando métricas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-xl shadow-lg border border-gray-200">
          <div className="text-red-500 mb-4">
            <Database size={48} className="mx-auto" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Error al cargar datos</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={fetchMetrics}
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-2 rounded-lg transition-all duration-300"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-500 to-blue-600 shadow-sm">
        <div className="px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                <BarChart3 className="text-white" size={20} />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white">
                  {activeTab === 'dashboard' ? 'Métricas de Registros' : 
                   activeTab === 'reenvio' ? 'Reenvío de Tablas' : 'Mensajería Masiva'}
                </h1>
                <p className="text-white/90 text-xs sm:text-sm">
                  {activeTab === 'dashboard' ? 'Panel de control en tiempo real' : 
                   activeTab === 'reenvio' ? 'Sistema de reenvío de tablas BINGO' : 'Campañas de mensajería masiva por WhatsApp'}
                </p>
                {activeTab === 'dashboard' && isResending && (
                  <p className="text-yellow-300 text-xs mt-1 flex items-center">
                    <RefreshCw className="mr-1 animate-spin" size={12} />
                    Actualizaciones pausadas durante reenvío
                  </p>
                )}
                {activeTab === 'dashboard' && !isResending && (
                  <p className="text-green-300 text-xs mt-1 flex items-center">
                    <RefreshCw className="mr-1" size={12} />
                    Actualizándose cada 30 segundos
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
              {/* Tabs */}
              <div className="flex bg-white/20 backdrop-blur-sm rounded-lg p-1 w-full sm:w-auto">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                    activeTab === 'dashboard'
                      ? 'bg-white text-blue-600 shadow-md'
                      : 'text-white hover:bg-white/10'
                  }`}
                >
                  <BarChart3 className="mr-2" size={16} />
                  Dashboard
                </button>
                <button
                  onClick={() => setActiveTab('reenvio')}
                  className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                    activeTab === 'reenvio'
                      ? 'bg-white text-blue-600 shadow-md'
                      : 'text-white hover:bg-white/10'
                  }`}
                >
                  <Send className="mr-2" size={16} />
                  Reenvío
                </button>
                <button
                  onClick={() => setActiveTab('masivos')}
                  className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                    activeTab === 'masivos'
                      ? 'bg-white text-blue-600 shadow-md'
                      : 'text-white hover:bg-white/10'
                  }`}
                >
                  <MessageCircle className="mr-2" size={16} />
                  Masivos
                </button>
              </div>

              {/* Filtros solo para el dashboard */}
              {activeTab === 'dashboard' && (
                <>
                  <div className="relative w-full sm:w-64">
                    <select
                      value={selectedBrigada}
                      onChange={(e) => setSelectedBrigada(e.target.value)}
                      className="appearance-none w-full bg-white text-gray-800 border border-gray-300 rounded-lg py-2 pl-4 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Todas las brigadas</option>
                      {data.brigadas
                        .filter((b, index, self) => index === self.findIndex(br => br.id_brigada === b.id_brigada))
                        .map(brigada => (
                          <option key={brigada.id_brigada} value={brigada.id_brigada}>
                            Brigada {brigada.id_brigada}: {brigada.nombre_brigada}
                          </option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                      <ChevronDown size={16} />
                    </div>
                  </div>
                  
                  {selectedBrigada && (
                    <button
                      onClick={() => setSelectedBrigada('')}
                      className="flex items-center justify-center w-full sm:w-auto bg-white text-blue-600 hover:bg-gray-100 px-3 py-2 rounded-lg transition-all text-sm font-medium"
                    >
                      <X size={16} className="mr-1" />
                      Limpiar filtro
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      {activeTab === 'dashboard' ? (
        <main className="p-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <MetricCard
              title={filteredData ? "Usuarios en Brigada" : "Total Usuarios"}
              value={metrics.totalUsuarios}
              icon={Users}
              color="from-blue-500 to-blue-600"
            />
            <MetricCard
              title={filteredData ? "Registradores Activos" : "Registradores Activos"}
              value={metrics.registradoresActivos}
              icon={UserCheck}
              color="from-green-500 to-green-600"
            />
            <MetricCard
              title={filteredData ? "Brigada Activa" : "Brigadas Activas"}
              value={filteredData ? (metrics.brigadasActivas > 0 ? "Sí" : "No") : metrics.brigadasActivas}
              icon={Activity}
              color="from-purple-500 to-purple-600"
            />
            <MetricCard
              title={filteredData ? "Registros Hoy" : "Total Hoy"}
              value={metrics.usuariosHoy}
              icon={Calendar}
              color="from-orange-500 to-orange-600"
            />
          </div>

          {/* Gráficos y tablas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <MonthlyChart />
            <AllRegistradores />
          </div>

          {/* Tabla de brigadas */}
          <div className="mb-8">
            <BrigadasTable />
          </div>

          {/* Resumen ejecutivo */}
          <ExecutiveSummary />
        </main>
      ) : activeTab === 'reenvio' ? (
        <ReenvioTablas 
          isResending={isResending} 
          setIsResending={setIsResending} 
        />
      ) : (
        <MensajeriaMasiva />
      )}
    </div>
  );
};

export default Dashboard; 