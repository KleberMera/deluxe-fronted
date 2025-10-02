import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faThLarge, 
  faUserShield, 
  faUserClock, 
  faTable, 
  faChartPie, 
  faSearch, 
  faChartLine, 
  faMapMarkerAlt, 
  faHome, 
  faInbox,
  faTimes,
  faBars,
  faTrophy,
  faSignOutAlt,
  faExternalLinkAlt,
  faExclamationTriangle,
  faInfoCircle
} from '@fortawesome/free-solid-svg-icons';
import {
  checkConnection,
  fetchStats,
  fetchRecentData,
  searchTables,
  fetchTableRangeByDate
} from '../services/api';

const DashboardAdmin = () => {
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleString('es-ES'));
  const [connectionStatus, setConnectionStatus] = useState({ online: false, message: 'Conectando...' });
  const [stats, setStats] = useState({
    usuarios_incompletos: 0,
    usuarios_registrados: 0,
    tablas_entregadas: 0,
    tablas_hoy: 0,
    tablas_pendientes: 0,
    total_tablas: 1,
    promedio_dia: 0,
    estadisticas_diarias: [],
    por_canton: [],
    por_barrio: []
  });
  const [recentData, setRecentData] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedTable, setSelectedTable] = useState(null);
  const [searchParams, setSearchParams] = useState({
    table_number: '',
    phone: '',
    cedula: ''
  });
  const [isLoading, setIsLoading] = useState({
    stats: false,
    recentData: false,
    search: false
  });
  const [error, setError] = useState(null);
  const [searchError, setSearchError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Estado para filtro de rango de tablas
  const [dateRange, setDateRange] = useState({
    fecha_inicio: '',
    fecha_fin: ''
  });
  const [tableRangeResult, setTableRangeResult] = useState(null);
  const [loadingTableRange, setLoadingTableRange] = useState(false);
  const [errorTableRange, setErrorTableRange] = useState(null);
  const [showTableRangeModal, setShowTableRangeModal] = useState(false);
  // Handler para cambio de fechas
  const handleDateRangeChange = (e) => {
    const { name, value } = e.target;
    setDateRange(prev => ({ ...prev, [name]: value }));
    setErrorTableRange(null);
  };

  // Consultar rango de tablas por fecha
  const handleTableRangeSearch = async () => {
    if (!dateRange.fecha_inicio || !dateRange.fecha_fin) {
      setErrorTableRange('Debes seleccionar ambas fechas.');
      return;
    }
    setLoadingTableRange(true);
    setErrorTableRange(null);
    try {
      const result = await fetchTableRangeByDate(dateRange);
      if (result && result.success && result.rango) {
        setTableRangeResult(result.rango);
        setShowTableRangeModal(true);
      } else {
        setErrorTableRange(result.message || 'No se pudo obtener el rango.');
        setTableRangeResult(null);
      }
    } catch (err) {
      setErrorTableRange('Error de conexión.');
      setTableRangeResult(null);
    } finally {
      setLoadingTableRange(false);
    }
  };

  // Actualizar la hora cada segundo
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleString('es-ES'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Verificar conexión
  useEffect(() => {
    const checkApiConnection = async () => {
      try {
        const data = await checkConnection();
        setConnectionStatus({
          online: data.status === 'online',
          message: data.status === 'online' ? 'En línea' : 'Desconectado'
        });
      } catch (error) {
        setConnectionStatus({
          online: false,
          message: 'Error de conexión'
        });
        setError('No se pudo conectar al servidor');
      }
    };
    checkApiConnection();
    const interval = setInterval(checkApiConnection, 300000); // Cada 5 minutos
    return () => clearInterval(interval);
  }, []);

  // Cargar estadísticas
  useEffect(() => {
    const loadStats = async () => {
      setIsLoading(prev => ({ ...prev, stats: true }));
      setError(null);
      
      try {
        const data = await fetchStats();
        setStats(data);
      } catch (error) {
        console.error('Error cargando estadísticas:', error);
        setError('Error al cargar estadísticas del servidor');
      } finally {
        setIsLoading(prev => ({ ...prev, stats: false }));
      }
    };
    loadStats();
    const interval = setInterval(loadStats, 600000); // Cada 10 minutos
    return () => clearInterval(interval);
  }, []);

  // Cargar datos recientes
  useEffect(() => {
    const loadRecentData = async () => {
      setIsLoading(prev => ({ ...prev, recentData: true }));
      setError(null);
      
      try {
        const data = await fetchRecentData();
        setRecentData(data);
      } catch (error) {
        console.error('Error cargando datos recientes:', error);
        setError('Error al cargar datos recientes del servidor');
      } finally {
        setIsLoading(prev => ({ ...prev, recentData: false }));
      }
    };
    loadRecentData();
  }, []);

  // Calcular porcentaje de progreso
  const progressPercentage = (stats.tablas_entregadas / stats.total_tablas) * 100;
  const progressColor = () => {
    if (progressPercentage <= 30) return 'bg-green-500';
    if (progressPercentage <= 60) return 'bg-yellow-500';
    if (progressPercentage <= 80) return 'bg-orange-500';
    return 'bg-red-500';
  };

  // Alternar sidebar
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Manejar cambio en los inputs de búsqueda
  const handleSearchChange = (e) => {
    const { name, value } = e.target;
    setSearchParams(prev => ({
      ...prev,
      [name]: value
    }));
    // Limpiar errores de búsqueda al escribir
    if (searchError) {
      setSearchError(null);
    }
  };

  // Manejar tecla Enter en búsqueda
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Cerrar modal
  const closeModal = () => {
    setShowModal(false);
    setSelectedTable(null);
  };

  // Cerrar alertas de error
  const closeError = () => {
    setError(null);
  };

  const closeSearchError = () => {
    setSearchError(null);
  };

  // Manejar búsqueda mejorada
  const handleSearch = async () => {
    const { table_number, phone, cedula } = searchParams;
    
    if (!table_number && !phone && !cedula) {
        setSearchError('Por favor ingrese al menos un criterio de búsqueda');
        return;
    }

    setIsLoading(prev => ({ ...prev, search: true }));
    setSearchError(null);
    setError(null);

    try {
        const results = await searchTables({ table_number, phone, cedula });
        
        // Si la respuesta tiene la estructura de error del backend
        if (results && !results.success && results.error) {
            setSearchError(results.error + (results.suggestion ? ` - ${results.suggestion}` : ''));
            return;
        }
        
        // Si es un array vacío o no hay resultados
        if (!results || (Array.isArray(results) && results.length === 0)) {
            let errorMsg = 'No se encontraron resultados';
            if (table_number) {
                errorMsg = `No se encontró la tabla con número ${table_number}`;
            } else if (cedula) {
                errorMsg = `No se encontró ninguna tabla asociada a la cédula ${cedula}`;
            } else if (phone) {
                errorMsg = `No se encontró ninguna tabla asociada al teléfono ${phone}`;
            }
            setSearchError(errorMsg);
            return;
        }

        // Si hay resultados exitosos
        if (Array.isArray(results) && results.length > 0) {
            setSelectedTable(results[0]);
            setShowModal(true);
            
            if (results.length > 1) {
                console.log('Resultados múltiples encontrados:', results);
            }
        }
        
    } catch (error) {
        console.error('Error en búsqueda:', error);
        
        // Manejo específico de errores del servidor
        if (error.response && error.response.data) {
            const errorData = error.response.data;
            if (errorData.error) {
                setSearchError(errorData.error + (errorData.suggestion ? ` - ${errorData.suggestion}` : ''));
            } else {
                setSearchError('Error del servidor al realizar la búsqueda');
            }
        } else if (error.message) {
            setSearchError(`La tabla no existe.`);
        } else {
            setSearchError('Error desconocido al realizar la búsqueda');
        }
    } finally {
        setIsLoading(prev => ({ ...prev, search: false }));
    }
  };

  const formatUTCDate = (dateString) => {
  const date = new Date(dateString);
  // Extraer componentes UTC (no locales)
  const day = date.getUTCDate();
  const month = date.getUTCMonth() + 1;
  const year = date.getUTCFullYear();
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  
  return `${day}/${month}/${year} ${hours}:${minutes < 10 ? '0' + minutes : minutes}`;
};

  return (
    <div className="bg-gray-50 min-h-screen flex">
      {/* Sidebar */}
      <div className={`fixed md:relative z-30 inset-y-0 left-0 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 ease-in-out w-64 bg-gradient-to-b from-indigo-700 to-indigo-900 text-white`}>
        <div className="flex flex-col h-full">
          {/* Logo y título */}
          <div className="flex items-center justify-between p-4 border-b border-indigo-600">
            <div className="flex items-center space-x-2">
              <FontAwesomeIcon icon={faThLarge} className="text-xl" />
              <span className="text-xl font-bold">Bingo Admin</span>
            </div>
            <button 
              onClick={toggleSidebar} 
              className="md:hidden text-white hover:text-gray-300"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>
          
          {/* Menú */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-2">
            <a 
              href="#" 
              className="flex items-center space-x-3 p-3 rounded-lg bg-indigo-800 text-white hover:bg-indigo-600 transition-colors"
            >
              <FontAwesomeIcon icon={faHome} />
              <span>Dashboard</span>
            </a>
            
            <a 
              href="https://sorteos.bingoamigo.net" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center space-x-3 p-3 rounded-lg text-white hover:bg-indigo-600 transition-colors"
            >
              <FontAwesomeIcon icon={faTrophy} />
              <span>Sorteos</span>
            </a>
          </nav>
          
          {/* Footer del sidebar */}
          <div className="p-4 border-t border-indigo-600">
            <a 
              href="#" 
              className="flex items-center space-x-3 p-3 rounded-lg text-white hover:bg-indigo-600 transition-colors"
            >
              <FontAwesomeIcon icon={faSignOutAlt} />
              <span>Cerrar sesión</span>
            </a>
          </div>
        </div>
      </div>
      
      {/* Overlay para móviles */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden" 
          onClick={toggleSidebar}
        ></div>
      )}
      
      {/* Contenido principal */}
      <div className="flex-1 overflow-x-hidden">
        {/* Header */}
        <header className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button 
                  onClick={toggleSidebar} 
                  className="md:hidden text-white hover:text-gray-300 mr-2"
                >
                  <FontAwesomeIcon icon={faBars} className="text-xl" />
                </button>
                <h1 className="text-2xl font-bold">Bingo Amigo DELUXE - Control</h1>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${
                    connectionStatus.online ? 'bg-green-500' : 'bg-red-500'
                  } ${!connectionStatus.online && 'animate-pulse'}`}></div>
                  <span className="text-sm">{connectionStatus.message}</span>
                </div>
                <div className="text-sm">
                  <span>{currentTime}</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-6 py-8">
          {/* Alert de Error General */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start">
                <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-400 mt-0.5 mr-3" />
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-red-800">Error del sistema</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
                <button 
                  onClick={closeError}
                  className="text-red-400 hover:text-red-600"
                >
                  <FontAwesomeIcon icon={faTimes} />
                </button>
              </div>
            </div>
          )}

          {/* Filtro de rango de tablas por fecha */}
          <div className="mb-8">
            <div className="bg-white rounded-xl shadow-md p-6 flex flex-col md:flex-row md:items-end gap-4">
              <div className="flex flex-col md:flex-row gap-4 md:items-end flex-1">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha inicio</label>
                  <input
                    type="date"
                    name="fecha_inicio"
                    value={dateRange.fecha_inicio}
                    onChange={handleDateRangeChange}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha fin</label>
                  <input
                    type="date"
                    name="fecha_fin"
                    value={dateRange.fecha_fin}
                    onChange={handleDateRangeChange}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                <button
                  onClick={handleTableRangeSearch}
                  disabled={loadingTableRange}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium disabled:bg-blue-300 disabled:cursor-not-allowed"
                >
                  {loadingTableRange ? 'Consultando...' : 'Consultar rango'}
                </button>
              </div>
              {errorTableRange && (
                <div className="text-red-600 text-sm mt-2">{errorTableRange}</div>
              )}
            </div>
          </div>

          {/* Modal para mostrar el rango de tablas */}
          {showTableRangeModal && tableRangeResult && (
            <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
                <h2 className="text-xl font-bold text-blue-700 mb-4">Rango de Tablas Entregadas</h2>
                <div className="text-lg font-semibold text-gray-800 mb-2">
                  {tableRangeResult.table_code_inicial} - {tableRangeResult.table_code_final}
                </div>
                <button
                  onClick={() => setShowTableRangeModal(false)}
                  className="mt-6 px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium"
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}
          {/* Estadísticas Principales */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Usuarios Registrados */}
            <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Usuarios Registrados</p>
                  <p className="text-3xl font-bold text-green-600">
                    {isLoading.stats ? '...' : stats.usuarios_registrados}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <FontAwesomeIcon icon={faUserShield} className="text-green-600 text-xl" />
                </div>
              </div>
            </div>
            
            {/* Usuarios Incompletos */}
            <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Usuarios Registrandose</p>
                  <p className="text-3xl font-bold text-red-600">
                    {isLoading.stats ? '...' : stats.usuarios_incompletos}
                  </p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <FontAwesomeIcon icon={faUserClock} className="text-red-600 text-xl" />
                </div>
              </div>
            </div>

            {/* Tablas Entregadas */}
            <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Tablas Entregadas</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {isLoading.stats ? '...' : stats.tablas_entregadas}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FontAwesomeIcon icon={faTable} className="text-blue-600 text-xl" />
                </div>
              </div>
            </div>

            {/* Progreso de Tablas */}
            <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Disponibilidad</p>
                  <p className="text-2xl font-bold text-blue-700">
                    {isLoading.stats ? '...' : `${stats.tablas_entregadas}/${stats.total_tablas}`}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FontAwesomeIcon icon={faChartPie} className="text-blue-700 text-xl" />
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="h-3 rounded-full transition-all duration-500" 
                  style={{ 
                    width: `${progressPercentage}%`,
                    backgroundColor: progressColor().replace('bg-', '').replace('-500', '-600')
                  }}
                ></div>
              </div>
            </div>
          </div>

          {/* Segunda fila de cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Búsqueda Múltiple */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Estado de Tablas</h3>
              <div className="grid grid-cols-2 gap-4 text-center mt-4 mb-4">
                <div>
                  <p className="text-xs text-gray-600">Registradas Hoy</p>
                  <p className="text-lg font-bold text-green-600">
                    {isLoading.stats ? '...' : stats.tablas_hoy}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Disponibles</p>
                  <p className="text-lg font-bold text-orange-600">
                    {isLoading.stats ? '...' : stats.tablas_pendientes}
                  </p>
                </div>
              </div>
              
              <div className="border-t border-gray-300 my-4"></div>
              
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Búsqueda</h3>
              
              {/* Alert de Error de Búsqueda */}
              {searchError && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-start">
                    <FontAwesomeIcon icon={faInfoCircle} className="text-red-400 mt-0.5 mr-2 text-sm" />
                    <div className="flex-1">
                      <p className="text-xs text-red-700">{searchError}</p>
                    </div>
                    <button 
                      onClick={closeSearchError}
                      className="text-red-400 hover:text-red-600 text-xs"
                    >
                      <FontAwesomeIcon icon={faTimes} />
                    </button>
                  </div>
                </div>
              )}
              
              <div className="space-y-3">
                <input
                  type="text"
                  name="table_number"
                  value={searchParams.table_number}
                  onChange={handleSearchChange}
                  onKeyPress={handleKeyPress}
                  placeholder="Número de tabla..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  disabled={isLoading.search}
                />
                <input
                  type="text"
                  name="phone"
                  value={searchParams.phone}
                  onChange={handleSearchChange}
                  onKeyPress={handleKeyPress}
                  placeholder="Número de teléfono..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  disabled={isLoading.search}
                />
                <input
                  type="text"
                  name="cedula"
                  value={searchParams.cedula}
                  onChange={handleSearchChange}
                  onKeyPress={handleKeyPress}
                  placeholder="Número de cédula..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  disabled={isLoading.search}
                />
                <button
                  onClick={handleSearch}
                  disabled={isLoading.search}
                  className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg transition-colors text-sm"
                >
                  <FontAwesomeIcon 
                    icon={faSearch} 
                    className={`mr-2 ${isLoading.search ? 'animate-spin' : ''}`} 
                  />
                  {isLoading.search ? 'Buscando...' : 'Buscar'}
                </button>
              </div>
            </div>

            {/* Top Barrios */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Barrios</h3>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {isLoading.stats ? (
                  <div className="text-center text-gray-500 text-sm py-4">
                    <FontAwesomeIcon icon={faSearch} className="text-2xl mb-2 animate-spin" />
                    <p>Cargando datos...</p>
                  </div>
                ) : stats.por_barrio.length > 0 ? (
                  stats.por_barrio.slice(0, 10).map((barrio, index) => (
                    <div key={barrio.barrio} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs">
                          {index + 1}
                        </div>
                        <span className="text-sm font-medium">{barrio.barrio}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-green-600">{barrio.tablas_entregadas}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-500 text-sm py-4">
                    <FontAwesomeIcon icon={faHome} className="text-2xl mb-2" />
                    <p>No hay datos disponibles</p>
                  </div>
                )}
              </div>
            </div>

            {/* Top Cantones */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Cantones</h3>
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {isLoading.stats ? (
                  <div className="text-center text-gray-500 text-sm py-4">
                    <FontAwesomeIcon icon={faSearch} className="text-2xl mb-2 animate-spin" />
                    <p>Cargando datos...</p>
                  </div>
                ) : stats.por_canton.length > 0 ? (
                  stats.por_canton.slice(0, 10).map((canton, index) => (
                    <div key={canton.canton} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs">
                          {index + 1}
                        </div>
                        <span className="text-sm font-medium">{canton.canton}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-blue-600">{canton.tablas_entregadas}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-500 text-sm py-4">
                    <FontAwesomeIcon icon={faMapMarkerAlt} className="text-2xl mb-2" />
                    <p>No hay datos disponibles</p>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>

{showModal && selectedTable && (
  <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4"> {/* Aumenté el ancho máximo */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Detalles de la Tabla</h3>
        <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
          <FontAwesomeIcon icon={faTimes} />
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4"> {/* 3 columnas responsivas */}
        {/* Columna 1 - Información básica */}
        <div className="space-y-3">
          <div className="bg-gray-50 p-3 rounded-lg">
            <label className="block text-xs font-medium text-gray-500">ID Tabla</label>
            <p className="text-sm font-semibold text-gray-900">{selectedTable.id}</p>
          </div>
          
          <div className="bg-gray-50 p-3 rounded-lg">
            <label className="block text-xs font-medium text-gray-500">Código Tabla</label>
            <p className="text-sm font-semibold text-gray-900">{selectedTable.table_code || 'N/A'}</p>
          </div>
          
          <div className="bg-gray-50 p-3 rounded-lg">
            <label className="block text-xs font-medium text-gray-500">Usuario</label>
            <p className="text-sm font-semibold text-gray-900">
              {selectedTable.first_name} {selectedTable.last_name}
            </p>
          </div>
          
          <div className="bg-gray-50 p-3 rounded-lg">
            <label className="block text-xs font-medium text-gray-500">Teléfono</label>
            <p className="text-sm font-semibold text-gray-900">{selectedTable.phone}</p>
          </div>
          
          <div className="bg-gray-50 p-3 rounded-lg">
            <label className="block text-xs font-medium text-gray-500">Cédula</label>
            <p className="text-sm font-semibold text-gray-900">{selectedTable.id_card}</p>
          </div>
        </div>
        
        {/* Columna 2 - Estado y ubicación */}
        <div className="space-y-3">
          <div className="bg-gray-50 p-3 rounded-lg">
            <label className="block text-xs font-medium text-gray-500">Estado</label>
            <p className="text-sm">
              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                selectedTable.entregado == 1 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
              }`}>
                {selectedTable.entregado == 1 ? 'Entregada' : 'Pendiente'}
              </span>
            </p>
          </div>
          
          <div className="bg-gray-50 p-3 rounded-lg">
            <label className="block text-xs font-medium text-gray-500">Tipo de Registro</label>
            <p className="text-sm font-semibold text-gray-900">
              {selectedTable.registro_manual == 1 ? 'Manual' : 'Automático'}
            </p>
          </div>
          
          <div className="bg-gray-50 p-3 rounded-lg">
            <label className="block text-xs font-medium text-gray-500">Validación OCR</label>
            <p className="text-sm font-semibold text-gray-900">
              {selectedTable.ocr_validated == 1 ? 
                `Validado (${selectedTable.ocr_confidence}%)` : 'No validado'}
            </p>
          </div>
          
          <div className="bg-gray-50 p-3 rounded-lg">
            <label className="block text-xs font-medium text-gray-500">Brigada</label>
            <p className="text-sm font-semibold text-gray-900">
              {selectedTable.brigada || 'No asignada'}
            </p>
          </div>
          
          <div className="bg-gray-50 p-3 rounded-lg">
            <label className="block text-xs font-medium text-gray-500">Fecha de Registro</label>
            <p className="text-sm font-semibold text-gray-900">
              {formatUTCDate(selectedTable.created_at)}
            </p>
          </div>
        </div>
        
        {/* Columna 3 - Ubicación y enlaces */}
        <div className="space-y-3">
          <div className="bg-gray-50 p-3 rounded-lg">
            <label className="block text-xs font-medium text-gray-500">Ubicación</label>
            <p className="text-sm font-semibold text-gray-900">
              {selectedTable.provincia || 'N/A'} - {selectedTable.canton || 'N/A'} - {selectedTable.barrio || 'N/A'}
            </p>
            {selectedTable.ubicacion_detallada && (
              <p className="text-xs text-gray-500 mt-1">
                {selectedTable.ubicacion_detallada}
              </p>
            )}
            {selectedTable.latitud && selectedTable.longitud && (
              <a 
                href={`https://www.google.com/maps?q=${selectedTable.latitud},${selectedTable.longitud}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 text-xs hover:underline inline-block mt-1"
              >
                <FontAwesomeIcon icon={faMapMarkerAlt} className="mr-1" />
                Ver en mapa
              </a>
            )}
          </div>
          
          <div className="bg-gray-50 p-3 rounded-lg">
            <label className="block text-xs font-medium text-gray-500">Registrador</label>
            <p className="text-sm font-semibold text-gray-900">
              {selectedTable.registrador_nombre ? 
                `${selectedTable.registrador_nombre}${selectedTable.registrador_apellido ? ` ${selectedTable.registrador_apellido}` : ''}` : 
                'PAGINA WEB'}
            </p>
            {selectedTable.registrador_telefono && (
              <p className="text-xs text-gray-500 mt-1">
                Tel: {selectedTable.registrador_telefono}
              </p>
            )}
          </div>
          
          {selectedTable.file_url && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <label className="block text-xs font-medium text-gray-500">Tabla</label>
              <a 
                href={selectedTable.file_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline text-sm flex items-center"
              >
                <FontAwesomeIcon icon={faExternalLinkAlt} className="mr-1" />
                Ver tabla completa
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
)}
      </div>
    </div>
  );
};

export default DashboardAdmin;
