import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix completo para los iconos de marcador
delete L.Icon.Default.prototype._getIconUrl;

// Configurar iconos por defecto de forma más robusta
const defaultIcon = L.icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Establecer el icono por defecto
L.Marker.prototype.options.icon = defaultIcon;

// Crear un icono personalizado para la ubicación actual del usuario
const createUserLocationIcon = () => {
  return L.divIcon({
    html: `
      <div style="
        width: 20px;
        height: 20px;
        background: #009cff;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        position: relative;
      ">
        <div style="
          position: absolute;
          top: -10px;
          left: -10px;
          width: 40px;
          height: 40px;
          background: rgba(0, 156, 255, 0.2);
          border-radius: 50%;
          animation: pulse 2s infinite;
        "></div>
      </div>
      <style>
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          70% { transform: scale(2); opacity: 0; }
          100% { transform: scale(2); opacity: 0; }
        }
      </style>
    `,
    className: 'user-location-marker',
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });
};

const LocationMarker = ({ onLocationSelect, initialLocation, userLocation, selectedLocation }) => {
  const [position, setPosition] = useState(initialLocation || null);
  const markerRefs = useRef({});
  
  const map = useMapEvents({
    click(e) {
      setPosition(e.latlng);
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });

  useEffect(() => {
    if (initialLocation) {
      setPosition(initialLocation);
      map.flyTo(initialLocation, map.getZoom());
    }
  }, [initialLocation, map]);

  // Actualizar posición cuando cambie selectedLocation
  useEffect(() => {
    if (selectedLocation) {
      setPosition(selectedLocation);
    }
  }, [selectedLocation]);

  // Forzar invalidación del tamaño del mapa
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 100);
    return () => clearTimeout(timer);
  }, [map]);

  // Cleanup function para manejar correctamente la limpieza de marcadores
  useEffect(() => {
    return () => {
      // Limpiar referencias de marcadores
      Object.values(markerRefs.current).forEach(ref => {
        if (ref && ref.current) {
          try {
            ref.current.remove();
          } catch (e) {
            // Ignorar errores de limpieza
          }
        }
      });
    };
  }, []);

  return (
    <>
      {/* Marcador de ubicación seleccionada */}
      {position && (
        <Marker 
          position={position}
          icon={defaultIcon}
          ref={el => markerRefs.current.selected = el}
        >
          <Popup>Ubicación seleccionada</Popup>
        </Marker>
      )}
      
      {/* Marcador de ubicación actual del usuario - solo si no está seleccionada */}
      {userLocation && (!selectedLocation || 
        (selectedLocation.lat !== userLocation.lat || selectedLocation.lng !== userLocation.lng)) && (
        <Marker 
          position={[userLocation.lat, userLocation.lng]} 
          icon={createUserLocationIcon()}
          ref={el => markerRefs.current.user = el}
        >
          <Popup>Tu ubicación actual</Popup>
        </Marker>
      )}
    </>
  );
};

const MapSelector = ({ onLocationSelect, initialLocation, tempLocation }) => {
  const [mapReady, setMapReady] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(initialLocation || null);
  const [locationError, setLocationError] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  
  // Centro por defecto (La Libertad, Santa Elena, Ecuador)
  const defaultCenter = { lat: -2.2308, lng: -80.9106 };

  // Función interna para manejar clicks en el mapa (selección visual)
  const handleMapClick = (lat, lng) => {
    const location = { lat, lng };
    setSelectedLocation(location);
    // Notificar al componente padre sobre la selección temporal
    onLocationSelect(lat, lng);
  };

  // Actualizar selectedLocation cuando cambie tempLocation
  useEffect(() => {
    if (tempLocation) {
      setSelectedLocation(tempLocation);
    }
  }, [tempLocation]);

  // Obtener ubicación del usuario al cargar el componente
  useEffect(() => {
    // Solo intentar obtener ubicación si no hay una ubicación inicial
    if (!initialLocation) {
      getCurrentLocation();
    } else {
      setLoadingLocation(false);
    }
  }, []);

  const getCurrentLocation = () => {
    setLoadingLocation(true);
    setLocationError(null);
    
    if (!navigator.geolocation) {
      setLocationError('Geolocalización no es soportada por este navegador');
      setLoadingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setUserLocation(location);
        setLoadingLocation(false);
        
        console.log('Ubicación del usuario detectada:', location);
        
        // Si no hay ubicación inicial seleccionada, establecer la ubicación del usuario como pre-seleccionada
        if (!initialLocation && !selectedLocation && !tempLocation) {
          console.log('Estableciendo ubicación del usuario como seleccionada');
          setSelectedLocation(location);
          // Notificar al padre sobre la ubicación del usuario
          onLocationSelect(location.lat, location.lng);
        }
        
        // Centrar el mapa en la ubicación del usuario si no hay ubicación inicial
        if (!initialLocation && mapRef.current) {
          setTimeout(() => {
            const mapInstance = mapRef.current;
            if (mapInstance) {
              mapInstance.flyTo([location.lat, location.lng], 15);
            }
          }, 500);
        }
      },
      (error) => {
        let errorMessage = 'Error al obtener ubicación';
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Permiso de ubicación denegado. Puedes seleccionar la ubicación manualmente en el mapa.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Ubicación no disponible. Puedes seleccionar la ubicación manualmente en el mapa.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Timeout al obtener ubicación. Puedes seleccionar la ubicación manualmente en el mapa.';
            break;
          default:
            errorMessage = 'Error desconocido al obtener ubicación. Puedes seleccionar la ubicación manualmente en el mapa.';
            break;
        }
        setLocationError(errorMessage);
        setLoadingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

  // Función para usar la ubicación actual como seleccionada
  const useCurrentLocation = () => {
    if (userLocation) {
      setSelectedLocation(userLocation);
      onLocationSelect(userLocation.lat, userLocation.lng);
      if (mapRef.current) {
        mapRef.current.flyTo([userLocation.lat, userLocation.lng], 15);
      }
    } else {
      getCurrentLocation();
    }
  };

  // Función para centrar el mapa en la ubicación del usuario
  const centerOnUserLocation = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.flyTo([userLocation.lat, userLocation.lng], 15);
    } else {
      getCurrentLocation();
    }
  };

  useEffect(() => {
    // Retrasar la inicialización para asegurar que el modal esté completamente renderizado
    const timer = setTimeout(() => {
      setMapReady(true);
    }, 200);
    
    return () => clearTimeout(timer);
  }, []);

  // Invalidar el tamaño del mapa cuando esté listo
  useEffect(() => {
    if (mapReady && containerRef.current) {
      const timer = setTimeout(() => {
        if (mapRef.current) {
          const mapInstance = mapRef.current;
          mapInstance.invalidateSize();
          mapInstance.whenReady(() => {
            mapInstance.invalidateSize();
          });
        }
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [mapReady]);

  // Cleanup al desmontar el componente
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        try {
          mapRef.current.off();
          mapRef.current.remove();
        } catch (e) {
          // Ignorar errores de limpieza
        }
      }
    };
  }, []);

  if (typeof window === 'undefined' || !mapReady) {
    return (
      <div className="h-full w-full bg-gray-200 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#fd0066] mx-auto mb-2"></div>
          <span>Cargando mapa...</span>
        </div>
      </div>
    );
  }

  // Determinar el centro inicial del mapa
  const mapCenter = initialLocation ? 
    [initialLocation.lat, initialLocation.lng] : 
    userLocation ? 
    [userLocation.lat, userLocation.lng] : 
    [defaultCenter.lat, defaultCenter.lng];

  const mapZoom = (initialLocation || userLocation) ? 15 : 13;

  return (
    <div ref={containerRef} className="h-full w-full relative">
      {/* Botones de control */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col space-y-2">
        {/* Botón para usar ubicación actual como seleccionada */}
        {userLocation && (!selectedLocation || 
          selectedLocation.lat !== userLocation.lat || 
          selectedLocation.lng !== userLocation.lng) && (
          <button
            type="button"
            onClick={useCurrentLocation}
            className="bg-[#ffde00] hover:bg-[#ffde00]/90 text-black rounded-lg p-2 shadow-md transition-colors text-sm font-medium"
            title="Usar mi ubicación actual"
          >
            <div className="flex items-center space-x-1">
              <svg 
                className="w-4 h-4" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" 
                />
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" 
                />
              </svg>
              <span className="text-xs">Usar aquí</span>
            </div>
          </button>
        )}
      
        
        {/* Indicador de estado de ubicación */}
        {locationError && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-3 py-2 rounded-lg text-xs max-w-[250px] shadow-sm">
            <div className="font-medium mb-1">ℹ️ Información</div>
            <div className="text-blue-600">{locationError}</div>
          </div>
        )}
        
        {userLocation && !locationError && !loadingLocation && (
          <div className="bg-green-100 border border-green-300 text-green-700 px-2 py-1 rounded text-xs">
            ✓ Ubicación detectada
          </div>
        )}
      </div>

      {/* Modal de carga de ubicación */}
      {loadingLocation && (
        <div className="absolute inset-0 bg-black bg-opacity-50 z-[2000] flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 mx-4 max-w-sm w-full shadow-xl">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-3 border-[#009cff] mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Obteniendo ubicación
              </h3>
              <p className="text-gray-600 text-sm mb-3">
                Por favor, permite el acceso a tu ubicación para una mejor experiencia
              </p>
              <p className="text-gray-500 text-xs mb-4">
                Si no deseas compartir tu ubicación, puedes seleccionar manualmente haciendo clic en el mapa
              </p>
              <div className="mt-4 flex justify-center space-x-3">
                <button
                  onClick={() => {
                    setLoadingLocation(false);
                    setLocationError('Puedes seleccionar la ubicación manualmente haciendo clic en el mapa');
                  }}
                  className="text-gray-500 hover:text-gray-700 text-sm underline"
                >
                  Seleccionar manualmente
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Indicador de ubicación seleccionada */}
      {selectedLocation && (
        <div className="absolute bottom-4 left-4 z-[1000]">
          <div className="bg-white border border-[#fd0066] rounded-lg px-3 py-2 shadow-md text-sm">
            <div className="font-medium text-[#fd0066]">Ubicación seleccionada:</div>
            <div className="text-gray-600">
              {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
            </div>
          </div>
        </div>
      )}

      {/* Instrucciones para selección manual */}
      {!selectedLocation && !loadingLocation && (
        <div className="absolute bottom-4 left-4 z-[1000]">
          <div className="bg-white border border-gray-300 rounded-lg px-3 py-2 shadow-md text-sm max-w-[280px]">
            <div className="font-medium text-gray-700 mb-1">💡 Selecciona tu ubicación</div>
            <div className="text-gray-600 text-xs">
              Haz clic en cualquier parte del mapa para seleccionar tu ubicación
            </div>
          </div>
        </div>
      )}

      <MapContainer
        ref={mapRef}
        center={mapCenter}
        zoom={mapZoom}
        style={{ 
          height: '100%', 
          width: '100%',
          minHeight: '400px'
        }}
        tap={false}
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
        <LocationMarker 
          onLocationSelect={handleMapClick} 
          initialLocation={initialLocation}
          userLocation={userLocation}
          selectedLocation={selectedLocation}
        />
      </MapContainer>
    </div>
  );
};

export default MapSelector;