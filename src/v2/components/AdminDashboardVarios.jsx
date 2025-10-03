import React, { useState, useEffect } from 'react';
import { Users, BarChart3, Activity, Database, UserCheck, Calendar, Trophy, X, ChevronDown, RefreshCw } from 'lucide-react';
import environments from '../environments/environment';


const DashboardVarios = () => {
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
  const [isResending] = useState(false); // Estado para controlar actualizaciones durante reenvío (no usado por ahora)
  const [registradorTipo, setRegistradorTipo] = useState('all'); // filtro por tipo de registrador cuando hay brigada seleccionada

  // Función para obtener los datos de la API
  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const apiUrl = environments.apiUrl
      // Forzar no usar caché (evita 304) y manejar 304 como caso posible
      const response = await fetch(`${apiUrl}/metricas`, { cache: 'no-store' });

      // Si el servidor responde 304 Not Modified, no hay cuerpo nuevo - no actualizamos
      if (response.status === 304) {
        console.log('Respuesta 304 Not Modified - manteniendo datos actuales');
        return;
      }

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const result = await response.json();

      // Aceptar formato: { data: {...}, message, error, status }
      if (result && (result.status === 200 || result.data)) {
        const d = result.data || {};
        setData({
          brigadas: d.brigadas || [],
          registrosPorMes: d.registros_por_mes || d.registrosPorMes || [],
          overview: d.overview || {},
          total_por_tipo_registro_por_brigada: d.total_por_tipo_registro_por_brigada || d.total_por_tipo_registro_por_brigada || [],
          lastFetched: Date.now()
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
    // Fetch inicial y establecer intervalo de actualización cada 30s si no hay reenvío en curso
    fetchMetrics();
    let interval;
    if (!isResending) {
      interval = setInterval(() => {
        fetchMetrics();
      }, 30000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isResending]);

  // Efecto para pausar/reanudar actualizaciones automáticas durante reenvío
  useEffect(() => {
    if (isResending) {
      console.log('⏸️ Pausando actualizaciones automáticas durante reenvío...');
    } else {
      console.log('▶️ Reanudando actualizaciones automáticas...');
    }
  }, [isResending]);

  // ...existing code...

  useEffect(() => {
    // Construir filteredData de forma defensiva según la nueva estructura de la API
    if (selectedBrigada) {
      const brigadaId = parseInt(selectedBrigada);

  const brigadas = (data.brigadas || []).filter(b => b.id_brigada === brigadaId);
  const brig = brigadas[0] || null;

      // Buscar en total_por_tipo_registro_por_brigada los registradores reales
      const tpList = data.total_por_tipo_registro_por_brigada || [];
      const tp = tpList.find(b => b.id_brigada === brigadaId);

      const registradores = [];
      if (tp && Array.isArray(tp.total_por_tipo)) {
        tp.total_por_tipo.forEach(tipoObj => {
          (tipoObj.registradores || []).forEach(r => {
            registradores.push({
              ...r,
              tipo: tipoObj.tipo,
              brigada_id: brigadaId
            });
          });
        });
      }

      // Usuarios detallados no están disponibles en la nueva respuesta; dejamos vacío
      const usuarios = [];

      // Construir overview específico para la brigada seleccionada
      const total_registros = (brig && (brig.total_registros || brig.total_registros === 0)) ? (brig.total_registros || 0) : registradores.reduce((s, r) => s + (r.total || 0), 0);
      const registradores_activos = registradores.length;
      const brigadas_activas = brig && brig.activa ? 1 : 0;
      const total_hoy = 0; // Si la API trae este dato por brigada lo podemos mapear aquí

      const overviewBrigada = {
        total_registros,
        registradores_activos,
        brigadas_activas,
        total_hoy,
        total_usuarios_en_brigadas: total_registros
      };

      setFilteredData({
        registradores,
        usuarios,
        brigadas,
        overview: overviewBrigada,
        registrosPorMes: data.registrosPorMes || []
      });
    } else {
      setFilteredData(null);
    }
  }, [selectedBrigada, data]);

  // Cuando cambia la brigada seleccionada, reiniciar el filtro de tipo de registrador
  useEffect(() => {
    setRegistradorTipo('all');
  }, [selectedBrigada]);

  // Calcular métricas a partir de la respuesta normalizada
  const calculateMetrics = (dataSource) => {
    const overview = dataSource.overview || {};

    const totalUsuarios = overview.total_registros ?? 0;
    const registradoresActivos = overview.registradores_activos ?? 0;
    const brigadasActivas = overview.brigadas_activas ?? 0;
    const usuariosHoy = overview.total_hoy ?? 0;

    // Convertir registrosPorMes a formato { mes, total } con nombres legibles
    const registrosPorMes = (dataSource.registrosPorMes || []).map(item => {
      // item.month viene como 'YYYY-MM'
      const parts = (item.month || '').split('-');
      let mesNombre = item.month;
      if (parts.length === 2) {
        const year = parseInt(parts[0], 10);
        const monthIndex = parseInt(parts[1], 10) - 1;
        const d = new Date(year, monthIndex, 1);
        mesNombre = d.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
      }
      return { mes: mesNombre, total: item.total || 0 };
    });

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
    // Ahora recibimos la información agregada por brigada en total_por_tipo_registro_por_brigada
    const registrosPorBrigada = data.total_por_tipo_registro_por_brigada || [];

    // Construir lista de registradores dependiendo si hay brigada seleccionada y tipo seleccionado
    let allRegistradores = [];

    if (selectedBrigada) {
      const brig = registrosPorBrigada.find(b => b.id_brigada === parseInt(selectedBrigada));
      const tipos = brig?.total_por_tipo || [];

      if (registradorTipo && registradorTipo !== 'all') {
        const tipoObj = tipos.find(t => t.tipo === registradorTipo);
        allRegistradores = (tipoObj?.registradores || []).map(r => ({
          registrador_id: r.id_registrador,
          nombre_registrador: r.nombre_registrador,
          usuarios_count: r.total || 0,
          usuarios_hoy: 0,
          usuarios_semana: 0,
          tipo: tipoObj?.tipo || '' ,
          brigada_nombre: brig?.nombre_brigada || ''
        }));
      } else {
        // Todos los tipos de la brigada: aplanar todos los registradores
        allRegistradores = tipos.flatMap(tipoObj => (tipoObj.registradores || []).map(r => ({
          registrador_id: r.id_registrador,
          nombre_registrador: r.nombre_registrador,
          usuarios_count: r.total || 0,
          usuarios_hoy: 0,
          usuarios_semana: 0,
          tipo: tipoObj.tipo,
          brigada_nombre: brig?.nombre_brigada || ''
        })));

        // Si no hay tipos pero la brigada tiene totales, mostrar la brigada como entrada
        if (allRegistradores.length === 0 && brig && (brig.total_registros || 0) > 0) {
          allRegistradores = [{
            registrador_id: `brigada-${brig.id_brigada}`,
            nombre_registrador: brig.nombre_brigada,
            usuarios_count: brig.total_registros || 0,
            usuarios_hoy: 0,
            usuarios_semana: 0,
            tipo: 'Brigada',
            brigada_nombre: brig.nombre_brigada
          }];
        }
      }
    } else {
      // Sin brigada seleccionada: mostrar todos los registradores reales (por registrador) incluyendo su tipo y brigada
      allRegistradores = registrosPorBrigada.flatMap(brig => {
        if (brig.total_por_tipo && brig.total_por_tipo.length > 0) {
          return brig.total_por_tipo.flatMap(tipoObj => (tipoObj.registradores || []).map(r => ({
            registrador_id: r.id_registrador,
            nombre_registrador: `${r.nombre_registrador} — ${tipoObj.tipo} — ${brig.nombre_brigada}`,
            usuarios_count: r.total || 0,
            usuarios_hoy: 0,
            usuarios_semana: 0,
            tipo: tipoObj.tipo,
            brigada_nombre: brig.nombre_brigada
          })));
        }
        return [{
          registrador_id: `brigada-${brig.id_brigada}`,
          nombre_registrador: brig.nombre_brigada,
          usuarios_count: brig.total_registros || 0,
          usuarios_hoy: 0,
          usuarios_semana: 0,
          tipo: 'Brigada',
          brigada_nombre: brig.nombre_brigada
        }];
      });
    }

    // Ordenar por total descendente
    allRegistradores.sort((a, b) => b.usuarios_count - a.usuarios_count);

    // Obtener lista de tipos si hay una brigada seleccionada (para el filtro)
    const tiposDisponibles = (() => {
      if (!selectedBrigada) return [];
      const brig = registrosPorBrigada.find(b => b.id_brigada === parseInt(selectedBrigada));
      return (brig?.total_por_tipo || []).map(t => t.tipo);
    })();

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
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm text-gray-500">Total: {allRegistradores.length}</p>
              <p className="text-xs text-gray-400">Elementos generados desde totales por brigada</p>
            </div>
            {selectedBrigada && (
              <div className="flex items-center space-x-2">
                <select
                  value={registradorTipo}
                  onChange={(e) => setRegistradorTipo(e.target.value)}
                  className="appearance-none bg-white text-gray-800 border border-gray-300 rounded-lg py-2 pl-3 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Todos los tipos</option>
                  {tiposDisponibles.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                {registradorTipo !== 'all' && (
                  <button onClick={() => setRegistradorTipo('all')} className="text-sm text-blue-600 hover:underline">Limpiar tipo</button>
                )}
              </div>
            )}
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
                <div className="text-sm text-gray-500">{registrador.tipo}{registrador.brigada_nombre ? ` — ${registrador.brigada_nombre}` : ''}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Componente de tabla de brigadas
  const BrigadasTable = () => {
    const brigadasUnicas = (data.brigadas || []).map(b => ({
      ...b,
      usuarios_count: b.total_registros || 0
    }));

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
  // Basado en overview y brigadas ya disponibles en data
  const overview = currentData.overview || {};
  const brigadasConUsuarios = (currentData.brigadas || []).filter(b => (b.total_registros || 0) > 0);

  const brigadaLider = brigadasConUsuarios.sort((a, b) => (b.total_registros || 0) - (a.total_registros || 0))[0];
  const registradorLider = (data.total_por_tipo_registro_por_brigada || []).reduce((best, b) => {
    if ((b.total_registros || 0) > (best.total || 0)) return { nombre: b.nombre_brigada, total: b.total_registros };
    return best;
  }, { total: 0 });

  const promedioDiario = Math.round((overview.total_registros || 0) / Math.max(1, 1));

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
                <h1 className="text-xl sm:text-2xl font-bold text-white">Métricas de Registros</h1>
                <p className="text-white/90 text-xs sm:text-sm">Panel de control en tiempo real</p>
                {isResending ? (
                  <p className="text-yellow-300 text-xs mt-1 flex items-center">
                    <RefreshCw className="mr-1 animate-spin" size={12} />
                    Actualizaciones pausadas durante reenvío
                  </p>
                ) : (
                  <p className="text-green-300 text-xs mt-1 flex items-center">
                    <RefreshCw className="mr-1" size={12} />
                    Actualizándose cada 30 segundos
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
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
            </div>
          </div>
        </div>
      </header>

      {/* Contenido principal */}
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
    </div>
  );
};

export default DashboardVarios; 