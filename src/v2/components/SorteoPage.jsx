import React, { useState, useEffect, useRef } from "react";
import { Fullscreen, FullscreenExit } from '@mui/icons-material';
import axios from 'axios';
import environments from "../environments/environment";


export default function SorteoPage() {
  const [participants, setParticipants] = useState([]);
  const [winner, setWinner] = useState(null);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const spinDuration = 5000; // 5 seconds
  const spinRef = useRef(null);
  const [showWinnerAnimation, setShowWinnerAnimation] = useState(false);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(true); // Mostrar el historial por defecto
  const [filtroFechaInicio, setFiltroFechaInicio] = useState(new Date().toISOString().split('T')[0]); // Fecha de inicio por defecto
  const [filtroFechaFin, setFiltroFechaFin] = useState(new Date().toISOString().split('T')[0]); // Fecha de fin por defecto
  const [registradores, setRegistradores] = useState([]);
  const [selectedTipoRegistrador, setSelectedTipoRegistrador] = useState('');
  const [loading, setLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef(null);

  // Función para activar/desactivar pantalla completa
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  // Escuchar cambios en el estado de pantalla completa
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Colores vivos para la ruleta
  const colors = [
    "#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF",
    "#FF9F40", "#8AC926", "#1982C4", "#6A4C93", "#F15BB5",
    "#FF5733", "#33FF57", "#5733FF", "#33FFEC", "#EC33FF",
    "#FFEC33", "#FF33A8", "#33A8FF", "#A8FF33", "#A833FF"
  ];

  // 🔹 Cargar participantes desde API con filtro de fecha
  /*const fetchParticipants = async () => {
    setLoading(true);
    try {
      console.log('Obteniendo participantes con fecha filtro:', fechaFiltro);
      const res = await getMascotasConPersona();
      //console.log('Datos recibidos:', res.data);
      
      const fechaFiltroDate = new Date(fechaFiltro);
      //console.log('Filtrando por fecha mayor o igual a:', fechaFiltroDate);
      
      // Filtrar los datos por fecha de registro
      const data = res.data.filter(mascota => {
        if (!mascota.fecha_registro) return false;
        const fechaRegistro = new Date(mascota.fecha_registro);
        const cumpleFiltro = fechaRegistro >= fechaFiltroDate;
        if (cumpleFiltro) {
          //console.log('Incluyendo mascota:', mascota.nombre, 'con fecha:', mascota.fecha_registro);
        }
        return cumpleFiltro;
      });

      //console.log('Datos después de filtrar:', data);

      // Filtrar personas únicas
      const personasMap = {};
      const duplicados = [];
      
      data.forEach((item) => {
        if (item.persona && item.persona.cedula) {
          if (!personasMap[item.persona.cedula]) {
            personasMap[item.persona.cedula] = {
              cedula: item.persona.cedula,
              nombre: `${item.persona.nombres || ''} ${item.persona.apellidos || ''}`.trim(),
              celular: item.persona.celular || '',
              // Guardar la fecha de registro para depuración
              fecha_registro: item.fecha_registro,
              // Contador de ocurrencias
              contador: 1,
              // IDs de las mascotas asociadas
              mascotas: [{
                id: item.id_mascota,
                nombre: item.nombre,
                fecha_registro: item.fecha_registro
              }]
            };
          } else {
            // Si ya existe, incrementar el contador y agregar la mascota
            personasMap[item.persona.cedula].contador++;
            personasMap[item.persona.cedula].mascotas.push({
              id: item.id_mascota,
              nombre: item.nombre,
              fecha_registro: item.fecha_registro
            });
            
            // Agregar a la lista de duplicados
            duplicados.push({
              cedula: item.persona.cedula,
              nombre: `${item.persona.nombres || ''} ${item.persona.apellidos || ''}`.trim(),
              fecha_registro: item.fecha_registro,
              mascota_id: item.id_mascota,
              mascota_nombre: item.nombre
            });
          }
        }
      });

      // Mostrar duplicados en la consola
      if (duplicados.length > 0) {
        //console.group('📌 Participantes duplicados encontrados:');
        //console.table(duplicados);
        //console.groupEnd();
        
        // Mostrar resumen de duplicados
        const resumenDuplicados = Object.values(personasMap)
          .filter(p => p.contador > 1)
          .map(p => ({
            cedula: p.cedula,
            nombre: p.nombre,
            'Total Mascotas': p.contador,
            'Fechas': p.mascotas.map(m => new Date(m.fecha_registro).toISOString().split('T')[0]).join(', ')
          }));
          
        //console.log('📊 Resumen de duplicados por persona:');
        //console.table(resumenDuplicados);
      }

      const participantesFiltrados = Object.values(personasMap);
      //console.log('Participantes únicos encontrados:', participantesFiltrados);
      setParticipants(participantesFiltrados);
    } catch (error) {
      console.error("Error cargando participantes:", error);
    } finally {
      setLoading(false);
    }
  };*/


  const startDraw = () => {
    if (participants.length === 0 || spinning) return;
    
    setSpinning(true);
    setWinner(null);
    setShowWinnerAnimation(false);
    
    // Calculate the target rotation (5 full spins + random position)
    const extraSpins = 5;
    const targetRotation = 3600 + Math.floor(Math.random() * 360); // 10 full spins + random degree
    
    // Set the rotation with smooth transition
    setRotation(prevRotation => {
      // Calculate total rotation needed (current + target)
      const totalRotation = prevRotation + targetRotation;
      
      // Start the animation
      setTimeout(() => {
        const sliceDegree = 360 / participants.length;
        const normalizedRotation = totalRotation % 360;
        const winnerIndex = Math.floor(normalizedRotation / sliceDegree) % participants.length;
        const selectedWinner = participants[participants.length - 1 - winnerIndex];
        
        // Create a new history entry with unique ID
        const newHistoryEntry = {
          id: Date.now(),
          winner: selectedWinner,
          date: new Date().toISOString()
        };
        
        // Update state with the new history entry
        setHistory(prev => [...prev, newHistoryEntry].filter((entry, index, self) => index === self.findIndex(t => t.id === entry.id)));
        setWinner(selectedWinner);
        
        setShowWinnerAnimation(true);
        setSpinning(false);
      }, spinDuration + 100); // Add small buffer for the animation to complete
      
      return totalRotation;
    });
  };

  // Para no mostrar nombres largos en la ruleta
  const shortenName = (name) => {
    if (name.length > 15) {
      return name.substring(0, 13) + "...";
    }
    return name;
  };

  // Formatear fecha
  const formatDate = (dateString) => {
    const options = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    };
    return new Date(dateString).toLocaleString('es-ES', options);
  };

  // Cargar registradores al montar el componente
  useEffect(() => {
    const fetchRegistradores = async () => {
      try {
        const API_URL = process.env.REACT_APP_API_URL || environments.apiUrl;
        const response = await axios.get(`${API_URL}/registrador/activos-con-tipo`);
        if (response.data.success) {
          // Filtrar tipos de registradores únicos
          const tiposUnicos = [];
          const tiposVistos = new Set();
          
          response.data.data.forEach(registrador => {
            if (!tiposVistos.has(registrador.id_tipo_registrador)) {
              tiposVistos.add(registrador.id_tipo_registrador);
              tiposUnicos.push({
                id: registrador.id_tipo_registrador,
                nombre: registrador.nombre_tipo,
                descripcion: registrador.tipo_descripcion
              });
            }
          });
          
          setRegistradores(tiposUnicos);
          
          // Seleccionar el primer tipo por defecto si hay tipos disponibles
          if (tiposUnicos.length > 0 && !selectedTipoRegistrador) {
            setSelectedTipoRegistrador(tiposUnicos[0].id.toString());
          }
        }
      } catch (error) {
        console.error('Error al cargar registradores:', error);
      }
    };
    
    fetchRegistradores();
  }, []);

  // Funciones para manejar el cambio de fechas
  const handleFechaInicioChange = (e) => {
    setFiltroFechaInicio(e.target.value);
  };

  const handleFechaFinChange = (e) => {
    setFiltroFechaFin(e.target.value);
  };

  // Función para manejar el cambio de tipo de registrador
  const handleTipoRegistradorChange = (e) => {
    setSelectedTipoRegistrador(e.target.value);
  };

  // Función para cargar participantes filtrados
  const fetchParticipantesFiltrados = async (fechaInicio, fechaFin, tipoRegistradorId) => {
    setLoading(true);
    try {
      const API_URL = process.env.REACT_APP_API_URL || environments.apiUrl;
      const response = await axios.get(`${API_URL}/usuarios-otros`);
      
      console.log('Datos recibidos de la API:', response.data.data); // Debug
      
      if (response.data.success) {
        // Formatear las fechas de filtro para comparación
        const fechaInicioFormateada = new Date(fechaInicio);
        fechaInicioFormateada.setUTCHours(0, 0, 0, 0);
        
        const fechaFinFormateada = new Date(fechaFin);
        fechaFinFormateada.setUTCHours(23, 59, 59, 999); // Hasta el final del día
        
        console.log('Rango de fechas para filtrar:', {
          inicio: fechaInicioFormateada.toISOString(),
          fin: fechaFinFormateada.toISOString()
        });
        
        const participantesFiltrados = response.data.data.filter(participante => {
          if (!participante.fecha_registro) return false;
          
          // Obtener la fecha de registro del participante
          const fechaRegistro = new Date(participante.fecha_registro);
          
          // Asegurarse de que la fecha del participante esté en el mismo huso horario
          const fechaRegistroAjustada = new Date(fechaRegistro.getTime() - (fechaRegistro.getTimezoneOffset() * 60000));
          
          // Verificar si la fecha de registro está dentro del rango
          const cumpleFecha = fechaRegistroAjustada >= fechaInicioFormateada && 
                            fechaRegistroAjustada <= fechaFinFormateada;
          
          // Comparación de tipo de registrador (asegurando tipos iguales)
          const tipoRegistradorParticipante = participante.id_tipo_registrador_snapshot?.toString();
          const tipoFiltro = tipoRegistradorId?.toString();
          const cumpleTipo = !tipoFiltro || tipoRegistradorParticipante === tipoFiltro;
          
          if (cumpleFecha && cumpleTipo) {
            console.log('Participante cumple filtros:', {
              participante,
              fechaRegistro: participante.fecha_registro,
              fechaInicio: fechaInicioFormateada,
              fechaFin: fechaFinFormateada,
              tipoRegistrador: tipoRegistradorParticipante,
              tipoFiltro
            });
            return true;
          }
          return false;
        });
        
        console.log('Total de participantes que cumplen los filtros:', participantesFiltrados.length); // Debug
        
        // Mapear a un formato consistente para el componente
        const participantesFormateados = participantesFiltrados.map(p => ({
          id: p.id,
          nombre: `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Sin nombre',
          cedula: p.id_card,
          celular: p.phone,
          fecha_registro: p.fecha_registro,
          tipo_registrador: p.nombre_tipo_registrador,
          contador: 1 // Añadido para compatibilidad con el resto del código
        }));
        
        console.log('Participantes formateados:', participantesFormateados); // Debug
        setParticipants(participantesFormateados);
      }
    } catch (error) {
      console.error('Error al cargar participantes:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Aplicar filtros automáticamente al cargar o cambiar los filtros
  useEffect(() => {
    if (selectedTipoRegistrador && filtroFechaInicio && filtroFechaFin) {
      console.log('Aplicando filtros automáticamente...', { 
        selectedTipoRegistrador, 
        filtroFechaInicio,
        filtroFechaFin
      });
      aplicarFiltro();
    }
  }, [selectedTipoRegistrador, filtroFechaInicio, filtroFechaFin]);

  // Función para aplicar el filtro
  const aplicarFiltro = () => {
    // Validar que la fecha de inicio no sea mayor que la fecha de fin
    const fechaInicio = new Date(filtroFechaInicio);
    const fechaFin = new Date(filtroFechaFin);
    
    if (fechaInicio > fechaFin) {
      alert('La fecha de inicio no puede ser mayor que la fecha de fin');
      return;
    }
    
    console.log('Aplicando filtro con:', {
      fechaInicio: filtroFechaInicio,
      fechaFin: filtroFechaFin,
      tipoRegistrador: selectedTipoRegistrador,
      registradoresDisponibles: registradores
    });
    
    // Limpiar participantes actuales
    setParticipants([]);
    
    // Llamar a la función que carga los participantes filtrados
    fetchParticipantesFiltrados(filtroFechaInicio, filtroFechaFin, selectedTipoRegistrador);
  };

  // Estilos para el contenedor de pantalla completa
  const fullscreenStyles = isFullscreen ? {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'white',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    overflow: 'hidden',
    backgroundImage: "url('/assets/img/fondo_app.jpg')",
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center center',
    backgroundSize: 'cover'
  } : {};

  // Renderizar vista de pantalla completa
  if (isFullscreen) {
    return (
      <div ref={containerRef} style={fullscreenStyles}>
        <div className="absolute top-4 right-4">
          <button
            onClick={toggleFullscreen}
            className="p-2 bg-gray-200 rounded-full hover:bg-gray-300 transition-colors"
            title="Salir de pantalla completa"
          >
            <FullscreenExit />
          </button>
        </div>
        
        <div className="flex flex-col items-center justify-center flex-grow w-full">
          <div className="relative w-full max-w-2xl aspect-square">
            <div 
              ref={spinRef}
              className="w-full h-full rounded-full border-8 border-gray-200 relative overflow-hidden transition-transform duration-5000 ease-out bg-white shadow-xl"
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: spinning ? `transform ${spinDuration}ms cubic-bezier(0.17, 0.67, 0.12, 0.99)` : 'none',
                boxShadow: '0 0 20px rgba(0,0,0,0.2)'
              }}
            >
              {participants.map((participant, index) => {
                const sliceDegree = 360 / participants.length;
                const rotate = sliceDegree * index;
                const skew = 90 - sliceDegree;
                const colorIndex = index % colors.length;
                
                return (
                  <div
                    key={participant.cedula}
                    className="absolute w-1/2 h-1/2 origin-bottom-right"
                    style={{
                      transform: `rotate(${rotate}deg) skew(${skew}deg)`,
                      transformOrigin: '0% 0%',
                      overflow: 'hidden',
                      left: '50%',
                      top: '50%',
                      pointerEvents: 'none'
                    }}
                  >
                    <div 
                      className="w-full h-full flex items-center justify-center"
                      style={{
                        backgroundColor: colors[colorIndex],
                        transform: `skew(${skew}deg) rotate(${sliceDegree/2}deg)`,
                        padding: '10px',
                        boxSizing: 'border-box',
                        position: 'relative',
                        left: '-25%',
                        textAlign: 'center',
                        fontSize: '0.8rem',
                        fontWeight: 'bold',
                        color: 'white',
                        textShadow: '1px 1px 2px rgba(0,0,0,0.7)',
                        width: '200%',
                        height: '200%',
                        transformOrigin: '0 0',
                        border: '1px solid rgba(255,255,255,0.3)'
                      }}
                    >
                      <div style={{ transform: 'rotate(45deg)', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ transform: 'scale(0.8)' }}>{shortenName(participant.nombre || 'Sin nombre')}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {winner && showWinnerAnimation && (
              <div className="absolute inset-0 flex items-center justify-center z-30">
                <div className="p-6 bg-green-100 rounded-lg shadow-xl text-center border-4 border-yellow-400 animate-bounce" style={{
                  background: 'linear-gradient(135deg, #f0fff0 0%, #e6ffe6 100%)',
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
                }}>
                  <h2 className="text-4xl font-extrabold text-black mb-3">¡GANADOR!</h2>
                  <p className="text-3xl font-bold mb-2 text-blue-500" style={{
                    textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                    background: 'linear-gradient(90deg, #3b82f6, #60a5fa)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    display: 'inline-block',
                    padding: '0 10px'
                  }}>{winner.nombre}</p>
                  <p className="text-gray-700">
                    Cédula: {winner.cedula ? 
                      `${winner.cedula.substring(0, 2)}${'*'.repeat(Math.max(0, winner.cedula.length - 4))}${winner.cedula.slice(-2)}` : 
                      'N/A'}
                  </p>
                  <p className="text-gray-700 mt-2">
                    Teléfono: {winner.celular ? 
                      `${winner.celular.substring(0, 2)}${'*'.repeat(Math.max(0, winner.celular.length - 4))}${winner.celular.slice(-2)}` : 
                      'N/A'}
                  </p>
                </div>
              </div>
            )}
            
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-3 z-10">
              <div className="clip-arrow" style={{
                width: '24px',
                height: '32px',
                backgroundColor: '#dc2626',
                clipPath: 'polygon(0% 0%, 100% 0%, 50% 100%)',
                transform: 'translateY(0)',
                position: 'relative',
                zIndex: 10,
                marginTop: '10px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
              }}></div>
            </div>
          </div>

          
          <div className="relative z-10">
            <button
              onClick={startDraw}
              disabled={spinning || participants.length === 0}
              className={`mt-8 px-8 py-4 text-xl font-bold text-white rounded-full shadow-lg transition-all transform hover:scale-105 ${
                spinning || participants.length === 0
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {spinning ? 'Girando...' : 'Girar Ruleta'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Vista normal
  return (
    <div 
      className="bg-white bg-opacity-90 py-8 px-4"
      style={{
        backgroundImage: "url('/assets/img/fondo_app.jpg')",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center center",
        backgroundSize: "cover",
        backgroundAttachment: "fixed",
        minHeight: "100vh",
        width: "100%",
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflowY: "auto"
      }}
      ref={containerRef}
    >
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 text-center">
          <div className="flex justify-between items-center mb-4">
            <div className="w-1/3"></div>
            <div className="w-1/3">
              <h1 className="text-4xl font-bold text-gray-800 mb-2">Sorteo de Premios</h1>
              <p className="text-gray-600">¡Gira la ruleta y descubre al ganador!</p>
            </div>
            <div className="w-1/3 flex justify-end">
              <button
                onClick={toggleFullscreen}
                className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors flex items-center gap-2"
                title="Ver en pantalla completa"
              >
                <Fullscreen />
                <span className="hidden sm:inline">Pantalla completa</span>
              </button>
            </div>
          </div>
          
          <div className="space-y-4 mb-6">
            <div className="flex flex-wrap justify-center items-center gap-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-gray-700 font-medium whitespace-nowrap">
                    Desde:
                  </label>
                  <input
                    type="date"
                    value={filtroFechaInicio}
                    onChange={handleFechaInicioChange}
                    className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    max={filtroFechaFin}
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <label className="text-gray-700 font-medium whitespace-nowrap">
                    Hasta:
                  </label>
                  <input
                    type="date"
                    value={filtroFechaFin}
                    onChange={handleFechaFinChange}
                    className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min={filtroFechaInicio}
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <label className="text-gray-700 font-medium whitespace-nowrap">
                  Tipo de Registrador:
                </label>
                <select
                  value={selectedTipoRegistrador}
                  onChange={handleTipoRegistradorChange}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[200px]"
                >
                  {registradores.length === 0 ? (
                    <option value="">Cargando tipos...</option>
                  ) : (
                    registradores.map((tipo) => (
                      <option key={tipo.id} value={tipo.id}>
                        {tipo.nombre}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>
            
            {selectedTipoRegistrador && registradores.length > 0 && (
              <div className="text-center text-sm text-gray-600">
                {registradores.find(t => t.id.toString() === selectedTipoRegistrador)?.descripcion}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Lista de Participantes */}
          <div className="bg-white/10 backdrop-blur-lg p-6 rounded-lg shadow-lg border border-white/20">
            <h2 className="text-xl font-bold mb-4 text-blue-700 border-b pb-2">
              Participantes ({participants.length})
            </h2>
            {loading ? (
              <p className="text-gray-500 text-center py-8">Cargando participantes...</p>
            ) : participants.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No hay participantes para la fecha seleccionada</p>
            ) : (
              <ul className="divide-y max-h-[600px] overflow-y-auto">
                {participants.map((p, index) => (
                  <li key={index} className="py-2 px-2 hover:bg-gray-50 rounded">
                    <div className="font-semibold">{p.nombre}</div>
                    <div className="text-sm text-gray-600">
                      <div>CI: {p.cedula}</div>
                      {p.celular && <div>Tel: {p.celular}</div>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Ruleta */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white/10 backdrop-blur-lg text-gray-800 p-5 rounded-lg shadow-lg flex flex-col items-center border border-white/20">
              <h2 className="text-xl font-bold mb-4 text-blue-700">Ruleta de la Suerte</h2>

              {participants.length > 0 && (
                <div className="relative w-full max-w-md aspect-square">
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-3 z-10">
                    <div className="w-6 h-8 bg-red-600 clip-arrow shadow-md"></div>
                  </div>
                  <div 
                    className="wheel-container w-full h-full rounded-full overflow-hidden border-8 border-gray-300 shadow-lg relative"
                    style={{
                      transform: `rotate(${rotation}deg)`,
                      transition: `transform ${spinDuration}ms cubic-bezier(0.2, 0.8, 0.2, 1)`
                    }}
                  >
                    <svg width="100%" height="100%" viewBox="0 0 360 360">
                      {participants.map((participant, index) => {
                        const sliceDegree = 360 / participants.length;
                        const startAngle = index * sliceDegree;
                        const endAngle = (index + 1) * sliceDegree;

                        const startRadians = (startAngle - 90) * Math.PI / 180;
                        const endRadians = (endAngle - 90) * Math.PI / 180;
                        
                        const startX = 180 + 180 * Math.cos(startRadians);
                        const startY = 180 + 180 * Math.sin(startRadians);
                        const endX = 180 + 180 * Math.cos(endRadians);
                        const endY = 180 + 180 * Math.sin(endRadians);

                        const largeArcFlag = sliceDegree <= 180 ? 0 : 1;

                        const d = [
                          `M 180 180`,
                          `L ${startX} ${startY}`,
                          `A 180 180 0 ${largeArcFlag} 1 ${endX} ${endY}`,
                          `Z`
                        ].join(' ');

                        const textRadians = (startAngle + sliceDegree / 2 - 90) * Math.PI / 180;
                        const textX = 180 + 100 * Math.cos(textRadians);
                        const textY = 180 + 100 * Math.sin(textRadians);
                        const textRotation = startAngle + sliceDegree / 2;

                        return (
                          <g key={index}>
                            <path d={d} fill={colors[index % colors.length]} stroke="#fff" strokeWidth="1" />
                            <text
                              x={textX}
                              y={textY}
                              fill="#fff"
                              fontWeight="bold"
                              fontSize="12"
                              textAnchor="middle"
                              dominantBaseline="middle"
                              transform={`rotate(${textRotation}, ${textX}, ${textY})`}
                            >
                              {shortenName(participant.nombre)}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                </div>
              )}

              <div className="mt-6 flex gap-3">
                <button
                  onClick={startDraw}
                  disabled={spinning || participants.length === 0}
                  className={`px-6 py-3 rounded-full text-lg font-bold shadow-lg transform hover:scale-105 transition-all ${
                    spinning || participants.length === 0
                      ? "bg-gray-400/50 backdrop-blur-sm cursor-not-allowed"
                      : "bg-gradient-to-r from-green-500/80 to-emerald-600/80 backdrop-blur-sm text-white hover:from-green-500 hover:to-emerald-600"
                  }`}
                >
                  {spinning ? "Girando..." : "¡Girar Ruleta!"}
                </button>
              </div>
            </div>

            {/* Ganador */}
            <div className="bg-white/10 backdrop-blur-lg text-gray-800 p-5 rounded-lg shadow-lg border border-white/20">
              <h2 className="text-xl font-bold mb-3 text-blue-700 border-b pb-2">
                Resultado del Sorteo
              </h2>

              {showWinnerAnimation && winner && (
                <div className="text-center py-6 animate-pulse">
                  <div className="text-2xl font-bold mb-2">🏆 ¡Tenemos un ganador! 🏆</div>
                  <div className="text-3xl font-bold text-yellow-600 mb-3">{winner.nombre}</div>
                  <div className="text-lg">
                    <span className="font-medium">Cédula:</span> {winner.cedula}
                    {winner.celular && (
                      <span className="ml-3">
                        <span className="font-medium">Teléfono:</span> {winner.celular}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Sección de Historial de Ganadores */}
            <div className="bg-white/10 backdrop-blur-lg p-6 rounded-lg shadow-lg border border-white/20">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-blue-700">Historial de Ganadores</h2>
                <button 
                  onClick={() => setShowHistory(!showHistory)}
                  className="text-blue-600 hover:text-blue-800 flex items-center">
                  {showHistory ? (
                    <>
                      <span>Ocultar</span>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                      </svg>
                    </>
                  ) : (
                    <>
                      <span>Mostrar</span>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
              
              {showHistory && (
                <div className="border border-white/20 rounded-lg overflow-hidden">
                  {history.length > 0 ? (
                    <div className="max-h-80 overflow-y-auto">
                      <table className="min-w-full divide-y divide-white/20">
                        <thead className="bg-white/10 backdrop-blur-sm">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">
                              Fecha y Hora
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">
                              Ganador
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">
                              Cédula
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">
                              Teléfono
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {history.map((item) => (
                            <tr key={item.id} className={history.indexOf(item) % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {formatDate(item.date)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {item.winner.nombre}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {item.winner.cedula}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {item.winner.celular || 'N/A'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-500">
                      No hay historial de ganadores aún
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .clip-arrow {
          clip-path: polygon(50% 100%, 0 0, 100% 0);
        }
      `}</style>
    </div>
  );
}
