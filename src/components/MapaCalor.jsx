import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import 'leaflet.markercluster';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import environments from '../environment/environments';

// Configuración de iconos
delete L.Icon.Default.prototype._getIconUrl;
const defaultIcon = L.icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});
  
const apiUrl = environments.apiUrl;
const API_URL = process.env.REACT_APP_API_URL || apiUrl;

// Componente optimizado para el mapa de calor
const HeatmapLayer = React.memo(({ data, isVisible }) => {
  const map = useMap();
  
  useEffect(() => {
    if (!isVisible || !data || data.length === 0) return;
    
    // Usar requestAnimationFrame para no bloquear el hilo principal
    const addHeatLayer = () => {
      const heatData = data.map(user => [
        parseFloat(user.latitud),
        parseFloat(user.longitud),
        1
      ]);
      
      const heatLayer = L.heatLayer(heatData, {
        radius: 25,
        blur: 15,
        maxZoom: 17,
        gradient: {0.4: 'blue', 0.6: 'cyan', 0.7: 'lime', 0.8: 'yellow', 1.0: 'red'}
      }).addTo(map);
      
      return heatLayer;
    };
    
    const heatLayer = requestAnimationFrame(() => addHeatLayer());
    
    return () => {
      if (heatLayer && typeof heatLayer === 'object' && heatLayer.remove) {
        map.removeLayer(heatLayer);
      }
    };
  }, [data, map, isVisible]);
  
  return null;
});

// Componente optimizado para clusters de marcadores
const ClusteredMarkers = React.memo(({ data, isVisible }) => {
  const map = useMap();
  
  useEffect(() => {
    if (!isVisible || !data || data.length === 0) return;
    
    // Crear el cluster group
    const markers = L.markerClusterGroup({
      chunkedLoading: true,
      chunkDelay: 50,
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true
    });
    
    // Procesar marcadores en lotes para evitar bloqueo
    const processBatch = (startIndex, batchSize = 100) => {
      const endIndex = Math.min(startIndex + batchSize, data.length);
      
      for (let i = startIndex; i < endIndex; i++) {
        const user = data[i];
        if (user.latitud && user.longitud) {
          const marker = L.marker([parseFloat(user.latitud), parseFloat(user.longitud)], {
            icon: defaultIcon
          });
          
          marker.bindPopup(`
            <div class="text-sm">
              <div class="font-bold text-blue-600">${user.first_name} ${user.last_name}</div>
              <div class="text-gray-700">Cédula: ${user.id_card}</div>
              <div class="text-gray-700">Teléfono: ${user.phone}</div>
              <div class="text-gray-700">Recinto: ${user.recinto}</div>
              <div class="text-gray-500 text-xs mt-1">
                Registrado: ${new Date(user.created_at).toLocaleDateString()}
              </div>
            </div>
          `);
          
          markers.addLayer(marker);
        }
      }
      
      // Si hay más datos, procesar el siguiente lote
      if (endIndex < data.length) {
        setTimeout(() => processBatch(endIndex, batchSize), 10);
      }
    };
    
    // Iniciar el procesamiento en lotes
    processBatch(0);
    
    map.addLayer(markers);
    
    return () => {
      map.removeLayer(markers);
    };
  }, [data, map, isVisible]);
  
  return null;
});

// Componente para el panel de filtros desplegable (sin cambios significativos)
const FiltersPanel = React.memo(({ filters, setFilters, provincias, onApplyFilters, onClearFilters }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [cantones, setCantones] = useState([]);
  const [barrios, setBarrios] = useState([]);
  const [loadingCantones, setLoadingCantones] = useState(false);
  const [loadingBarrios, setLoadingBarrios] = useState(false);

  // Cargar cantones cuando cambia la provincia
  useEffect(() => {
    const fetchCantones = async () => {
      if (filters.provinciaId) {
        setLoadingCantones(true);
        try {
          const response = await axios.get(`${API_URL}/locationNew/provincias/${filters.provinciaId}/cantones`);
          setCantones(response.data.data);
          setFilters(prev => ({ ...prev, cantonId: '', barrioId: '' }));
          setBarrios([]);
        } catch (error) {
          console.error('Error al cargar cantones:', error);
          toast.error('Error al cargar cantones');
        } finally {
          setLoadingCantones(false);
        }
      } else {
        setCantones([]);
        setBarrios([]);
      }
    };
    fetchCantones();
  }, [filters.provinciaId, setFilters]);

  // Cargar barrios cuando cambia el cantón
  useEffect(() => {
    const fetchBarrios = async () => {
      if (filters.cantonId) {
        setLoadingBarrios(true);
        try {
          const response = await axios.get(`${API_URL}/locationNew/cantones/${filters.cantonId}/barrios`);
          setBarrios(response.data.data);
          setFilters(prev => ({ ...prev, barrioId: '' }));
        } catch (error) {
          console.error('Error al cargar barrios:', error);
          toast.error('Error al cargar barrios');
        } finally {
          setLoadingBarrios(false);
        }
      } else {
        setBarrios([]);
      }
    };
    fetchBarrios();
  }, [filters.cantonId, setFilters]);

  return (
    <div className="mb-4">
      {/* Botón para mostrar/ocultar filtros */}
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium py-2 px-4 rounded-lg shadow-md transition flex items-center gap-2"
        >
          <svg 
            className={`w-5 h-5 transform transition-transform ${isOpen ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          {isOpen ? 'Ocultar Filtros' : 'Mostrar Filtros'}
        </button>
        {/* Botones de acción */}
        <div className="flex gap-2">
          <button
            onClick={onClearFilters}
            className="bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg shadow-md transition"
          >
            Limpiar
          </button>
          <button
            onClick={onApplyFilters}
            className="bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-white font-medium py-2 px-4 rounded-lg shadow-md transition"
          >
            Aplicar Filtros
          </button>
        </div>
      </div>

      {/* Panel de filtros (desplegable) */}
      {isOpen && (
        <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Filtro por provincia */}
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-1">Provincia</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={filters.provinciaId}
                onChange={(e) => setFilters(prev => ({ ...prev, provinciaId: e.target.value }))}
              >
                <option value="">Todas las provincias</option>
                {provincias.map(provincia => (
                  <option key={provincia.id} value={provincia.id}>{provincia.nombre}</option>
                ))}
              </select>
            </div>
            {/* Filtro por cantón */}
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-1">Cantón</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={filters.cantonId}
                onChange={(e) => setFilters(prev => ({ ...prev, cantonId: e.target.value }))}
                disabled={!filters.provinciaId || loadingCantones}
              >
                <option value="">Todos los cantones</option>
                {cantones.map(canton => (
                  <option key={canton.id} value={canton.id}>{canton.nombre}</option>
                ))}
              </select>
              {loadingCantones && (
                <div className="text-xs text-gray-500 mt-1">Cargando cantones...</div>
              )}
            </div>
            {/* Filtro por barrio */}
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-1">Barrio</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={filters.barrioId}
                onChange={(e) => setFilters(prev => ({ ...prev, barrioId: e.target.value }))}
                disabled={!filters.cantonId || loadingBarrios}
              >
                <option value="">Todos los barrios</option>
                {barrios.map(barrio => (
                  <option key={barrio.id} value={barrio.id}>{barrio.nombre}</option>
                ))}
              </select>
              {loadingBarrios && (
                <div className="text-xs text-gray-500 mt-1">Cargando barrios...</div>
              )}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Filtro por fecha */}
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-1">Desde</label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={filters.startDate}
                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-1">Hasta</label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={filters.endDate}
                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

// Componente principal optimizado
const UsersMapPage = () => {
  const [allUsers, setAllUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [provincias, setProvincias] = useState([]);
  const [viewMode, setViewMode] = useState('heatmap'); // 'heatmap' | 'markers' | 'both'
  const [filters, setFilters] = useState({
    provinciaId: '',
    cantonId: '',
    barrioId: '',
    startDate: '',
    endDate: ''
  });

  // Coordenadas de Santa Elena, Ecuador
  const santaElenaCenter = [-2.2269, -80.8590];

  // Función para obtener todos los usuarios
  const fetchAllUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/users/map-data`);
      const users = response.data.data || [];
      setAllUsers(users);
      setFilteredUsers(users);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Error al cargar usuarios');
      setAllUsers([]);
      setFilteredUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Función optimizada para aplicar filtros con useMemo
  const applyFilters = useCallback(() => {
    let filtered = [...allUsers];

    if (filters.provinciaId) {
      filtered = filtered.filter(user => 
        user.provincia_id?.toString() === filters.provinciaId
      );
    }

    if (filters.cantonId) {
      filtered = filtered.filter(user => 
        user.canton_id?.toString() === filters.cantonId
      );
    }

    if (filters.barrioId) {
      filtered = filtered.filter(user => 
        user.barrio_id?.toString() === filters.barrioId
      );
    }

    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      filtered = filtered.filter(user => 
        new Date(user.created_at) >= startDate
      );
    }

    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(user => 
        new Date(user.created_at) <= endDate
      );
    }

    setFilteredUsers(filtered);
  }, [allUsers, filters]);

  // Función para limpiar filtros
  const clearFilters = useCallback(() => {
    setFilters({
      provinciaId: '',
      cantonId: '',
      barrioId: '',
      startDate: '',
      endDate: ''
    });
    setFilteredUsers(allUsers);
  }, [allUsers]);

  // Optimizar estadísticas con useMemo
  const stats = useMemo(() => {
    const totalUsers = filteredUsers.length;
    const totalRegistered = allUsers.length;
    
    return { 
      totalUsers, 
      totalRegistered,
      provinciaName: filters.provinciaId ? 
        provincias.find(p => p.id.toString() === filters.provinciaId)?.nombre || 'N/A' : 'N/A',
      hasFilters: filters.provinciaId || filters.cantonId || filters.barrioId || filters.startDate || filters.endDate
    };
  }, [filteredUsers, allUsers, filters, provincias]);

  // Obtener provincias al cargar
  useEffect(() => {
    const fetchProvincias = async () => {
      try {
        const response = await axios.get(`${API_URL}/locationNew/provincias`);
        setProvincias(response.data.data || []);
      } catch (error) {
        console.error('Error al cargar provincias:', error);
        toast.error('Error al cargar provincias');
      }
    };
    fetchProvincias();
  }, []);

  // Cargar usuarios inicialmente
  useEffect(() => {
    fetchAllUsers();
  }, [fetchAllUsers]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-4">
      <ToastContainer position="top-center" autoClose={5000} />
      
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-400 p-6 rounded-t-xl shadow-md">
        <h1 className="text-3xl font-bold text-center text-white">Mapa de Usuarios Registrados</h1>
        <p className="text-center text-blue-100 mt-2">Santa Elena, Ecuador</p>
      </div>
      
      <div className="bg-white rounded-b-xl shadow-lg overflow-hidden">
        <div className="p-6">
          {/* Panel de filtros desplegable */}
          <FiltersPanel 
            filters={filters} 
            setFilters={setFilters}
            provincias={provincias}
            onApplyFilters={applyFilters}
            onClearFilters={clearFilters}
          />

          {/* Selector de modo de vista */}
          <div className="bg-white rounded-lg shadow-md p-4 mb-4">
            <h3 className="text-lg font-semibold text-blue-600 mb-3">Modo de Visualización</h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setViewMode('heatmap')}
                className={`px-4 py-2 rounded-lg transition ${
                  viewMode === 'heatmap' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Mapa de Calor
              </button>
              <button
                onClick={() => setViewMode('markers')}
                className={`px-4 py-2 rounded-lg transition ${
                  viewMode === 'markers' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Marcadores Agrupados
              </button>
              <button
                onClick={() => setViewMode('both')}
                className={`px-4 py-2 rounded-lg transition ${
                  viewMode === 'both' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Ambos
              </button>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              💡 <strong>Tip:</strong> Para mejor rendimiento con muchos datos, usa solo "Mapa de Calor"
            </p>
          </div>
          
          {/* Estadísticas */}
          <div className="bg-white rounded-lg shadow-md p-4 mb-4">
            <h3 className="text-lg font-semibold text-blue-600 mb-3">Estadísticas</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                <div className="text-blue-800 font-bold text-2xl">{stats.totalUsers}</div>
                <div className="text-blue-600 text-sm">
                  {stats.hasFilters ? 'Usuarios filtrados' : 'Usuarios mostrados'}
                </div>
              </div>
              <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                <div className="text-green-800 font-bold text-2xl">{stats.totalRegistered}</div>
                <div className="text-green-600 text-sm">Total registrados</div>
              </div>
              <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100">
                <div className="text-yellow-800 font-bold text-2xl">
                  {stats.totalRegistered > 0 ? Math.round((stats.totalUsers / stats.totalRegistered) * 100) : 0}%
                </div>
                <div className="text-yellow-600 text-sm">Porcentaje mostrado</div>
              </div>
            </div>
            {stats.hasFilters && (
              <div className="mt-3 p-2 bg-blue-50 rounded-lg">
                <p className="text-blue-700 text-sm">
                  <strong>Filtros activos:</strong> {stats.provinciaName !== 'N/A' && `Provincia: ${stats.provinciaName}`}
                  {filters.startDate && ` | Desde: ${filters.startDate}`}
                  {filters.endDate && ` | Hasta: ${filters.endDate}`}
                </p>
              </div>
            )}
          </div>
          
          {/* Mapa */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {loading ? (
              <div className="h-96 flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                  <p className="text-gray-600">Cargando datos de usuarios...</p>
                </div>
              </div>
            ) : (
              <div className="h-[600px] relative">
                <MapContainer
                  center={santaElenaCenter}
                  zoom={10}
                  style={{ height: '100%', width: '100%' }}
                  whenReady={(map) => {
                    setTimeout(() => {
                      map.target.invalidateSize();
                    }, 100);
                  }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  
                  {/* Mapa de calor optimizado */}
                  <HeatmapLayer 
                    data={filteredUsers} 
                    isVisible={viewMode === 'heatmap' || viewMode === 'both'}
                  />
                  
                  {/* Marcadores agrupados optimizados */}
                  <ClusteredMarkers 
                    data={filteredUsers} 
                    isVisible={viewMode === 'markers' || viewMode === 'both'}
                  />
                </MapContainer>
                
                {/* Leyenda del mapa de calor */}
                {(viewMode === 'heatmap' || viewMode === 'both') && (
                  <div className="absolute bottom-4 left-4 z-[1000] bg-white p-3 rounded-lg shadow-md">
                    <div className="text-sm font-medium text-gray-700 mb-2">Densidad de Usuarios</div>
                    <div className="flex items-center">
                      <div className="flex-1">
                        <div className="h-4 w-full bg-gradient-to-r from-blue-500 via-cyan-500 via-lime-500 via-yellow-500 to-red-500 rounded"></div>
                        <div className="flex justify-between text-xs text-gray-600 mt-1">
                          <span>Baja</span>
                          <span>Alta</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Contador de usuarios en esquina superior derecha */}
                <div className="absolute top-4 right-4 z-[1000] bg-white p-3 rounded-lg shadow-md">
                  <div className="text-sm font-medium text-gray-700">
                    Mostrando <span className="font-bold text-blue-600">{filteredUsers.length}</span> usuarios
                    <div className="text-xs text-gray-500 mt-1">
                      Modo: {viewMode === 'heatmap' ? 'Mapa de Calor' : viewMode === 'markers' ? 'Marcadores' : 'Ambos'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UsersMapPage;